import { prisma } from "@/lib/prisma"
import type { Mission, StudentMission, VerificationProfile, VerificationResult, MissionsStats, MissionWithStudentStatus } from "@/domain/missions/types"
import type { MissionRepository, StudentMissionRepository, MissionServiceRepository } from "@/domain/missions/repositories/missionRepository"
import { toMissionDomain, toStudentMissionDomain, toMissionWithStudentStatus } from "@/domain/missions/types"
import { verifyMission } from "@/domain/missions/missionVerificationService"
import { buildWeeklyMissionPlan } from "@/domain/missions/weeklyMissionPlan"
import { getCurrentPeriod } from "@/lib/period"
import { getIsoWeekKey, getIsoWeekNumber } from "@/lib/week"
import { canAwardMissionPoints } from "@/lib/pointRules"

type DomainVerificationProfile = VerificationProfile

export class PrismaMissionRepository implements MissionRepository {
  async findAvailableForStudent(studentId: string, studentLevel: number): Promise<Mission[]> {
    const missions = await prisma.mission.findMany({
      where: {
        isActive: true,
        cadence: "ONCE",
        OR: [
          { requiredLevel: null },
          { requiredLevel: { lte: studentLevel } },
        ],
      },
      include: {
        course: true,
      },
    })

    return missions.map(toMissionDomain)
  }

  async findById(missionId: string): Promise<Mission | null> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { course: true },
    })

    return mission ? toMissionDomain(mission) : null
  }

  async findByIdWithCourse(missionId: string): Promise<Mission | null> {
    return this.findById(missionId)
  }
}

export class PrismaStudentMissionRepository implements StudentMissionRepository {
  async findByStudentId(studentId: string): Promise<StudentMission[]> {
    const studentMissions = await prisma.studentMission.findMany({
      where: { studentId },
      include: {
        mission: {
          include: { course: true },
        },
      },
    })

    return studentMissions.map(toStudentMissionDomain)
  }

  async findByStudentIdAndMissionId(studentId: string, missionId: string, weekKey = ""): Promise<StudentMission | null> {
    const studentMission = await prisma.studentMission.findUnique({
      where: {
        studentId_missionId_weekKey: {
          studentId,
          missionId,
          weekKey,
        },
      },
      include: {
        mission: {
          include: { course: true },
        },
      },
    })

    return studentMission ? toStudentMissionDomain(studentMission) : null
  }

  async create(data: { studentId: string; missionId: string; status: string; progress: number; weekKey?: string }): Promise<StudentMission> {
    const studentMission = await prisma.studentMission.create({
      data: {
        studentId: data.studentId,
        missionId: data.missionId,
        weekKey: data.weekKey ?? "",
        status: data.status as "PENDIENTE",
        progress: data.progress,
      },
      include: {
        mission: {
          include: { course: true },
        },
      },
    })

    return toStudentMissionDomain(studentMission)
  }

  async update(id: string, data: Partial<StudentMission>): Promise<StudentMission> {
    const studentMission = await prisma.studentMission.update({
      where: { id },
      data: {
        status: data.status,
        progress: data.progress,
        evidence: data.evidence,
        metadata: data.metadata,
        completedAt: data.completedAt,
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt,
        reviewComment: data.reviewComment,
      },
      include: {
        mission: {
          include: { course: true },
        },
      },
    })

    return toStudentMissionDomain(studentMission)
  }
}

export class PrismaMissionServiceRepository implements MissionServiceRepository {
  private readonly missionRepository: PrismaMissionRepository
  private readonly studentMissionRepository: PrismaStudentMissionRepository

  constructor() {
    this.missionRepository = new PrismaMissionRepository()
    this.studentMissionRepository = new PrismaStudentMissionRepository()
  }

  async getMissionsWithStudentStatus(studentId: string, studentLevel: number): Promise<{
    missions: MissionWithStudentStatus[]
    stats: MissionsStats
  }> {
    const weekKey = getIsoWeekKey()
    await this.ensureWeeklyMissions(studentId, weekKey)

    const [permanentMissions, studentMissions] = await Promise.all([
      this.missionRepository.findAvailableForStudent(studentId, studentLevel),
      this.studentMissionRepository.findByStudentId(studentId),
    ])

    const weeklyMissions = studentMissions
      .filter(
        (studentMission) =>
          studentMission.weekKey === weekKey && studentMission.mission.cadence === "WEEKLY"
      )
      .map((studentMission) => studentMission.mission)

    const missionsById = new Map<string, Mission>()
    for (const mission of [...permanentMissions, ...weeklyMissions]) {
      missionsById.set(mission.id, mission)
    }

    const missions = Array.from(missionsById.values()).map((mission) => {
      const expectedWeekKey = mission.cadence === "WEEKLY" ? weekKey : ""
      const studentMission =
        studentMissions.find(
          (row) => row.missionId === mission.id && row.weekKey === expectedWeekKey
        ) ?? null
      return toMissionWithStudentStatus(mission, studentMission)
    })

    const totalPointsFromMissions = studentMissions
      .filter((sm) => sm.status === "COMPLETADA" || sm.status === "VERIFICADA")
      .reduce((acc, sm) => acc + sm.mission.pointsReward, 0)

    return {
      missions,
      stats: {
        total: missions.length,
        pending: missions.filter((m) => m.status === "PENDIENTE" || m.status === "NO_ASIGNADA").length,
        inProgress: missions.filter((m) => m.status === "EN_PROGRESO").length,
        completed: missions.filter((m) => m.status === "COMPLETADA" || m.status === "VERIFICADA").length,
        totalPointsEarned: totalPointsFromMissions,
      },
    }
  }

  /**
   * Asigna al estudiante las misiones de la semana ISO actual.
   *
   * Es idempotente: `weekKey` forma parte de la llave única, así que abrir
   * /misiones varias veces no duplica asignaciones. Las de hábito se repiten
   * cada semana; el recurso rota y la adaptativa depende de los datos del
   * estudiante.
   */
  private async ensureWeeklyMissions(studentId: string, weekKey: string): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: {
        id: true,
        averageGrade: true,
        level: true,
        enrollments: {
          where: { semesterCode: getCurrentPeriod() },
          select: { status: true },
        },
      },
    })

    if (!profile) return

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const [recentActivity, unreadRecommendations] = await Promise.all([
      prisma.activity.findFirst({
        where: { userId: studentId, createdAt: { gte: threeDaysAgo } },
        select: { id: true },
      }),
      prisma.recommendation.count({
        where: { studentId: profile.id, isRead: false },
      }),
    ])

    const plan = buildWeeklyMissionPlan({
      averageGrade: profile.averageGrade,
      failedCourses: profile.enrollments.filter((enrollment) => enrollment.status === "REPROBADO").length,
      unreadRecommendations,
      hasRecentActivity: Boolean(recentActivity),
      level: profile.level,
      weekNumber: getIsoWeekNumber(),
    })

    const templates = await prisma.mission.findMany({
      where: { code: { in: plan }, isActive: true, cadence: "WEEKLY" },
      select: { id: true, autoVerify: true },
    })

    if (templates.length === 0) return

    await prisma.studentMission.createMany({
      data: templates.map((template) => ({
        studentId,
        missionId: template.id,
        weekKey,
        status: template.autoVerify ? "EN_PROGRESO" as const : "PENDIENTE" as const,
        progress: 0,
      })),
      skipDuplicates: true,
    })
  }

  async acceptMission(studentId: string, missionId: string, weekKey = ""): Promise<StudentMission> {
    return this.studentMissionRepository.create({
      studentId,
      missionId,
      weekKey,
      status: "PENDIENTE",
      progress: 0,
    })
  }

  async startMission(studentId: string, missionId: string, metadata: string | null, weekKey = ""): Promise<StudentMission> {
    const existingMission = await this.studentMissionRepository.findByStudentIdAndMissionId(studentId, missionId, weekKey)
    if (!existingMission) {
      throw new Error("Student mission not found")
    }

    return this.studentMissionRepository.update(existingMission.id, {
      status: "EN_PROGRESO",
      progress: 0,
      completedAt: null,
      evidence: null,
      metadata,
      verifiedBy: null,
      verifiedAt: null,
      reviewComment: null,
    })
  }

  async completeMission(
    studentId: string,
    missionId: string,
    evidence: string | null,
    verificationResult: VerificationResult | null,
    weekKey = ""
  ): Promise<StudentMission> {
    const existingMission = await this.studentMissionRepository.findByStudentIdAndMissionId(studentId, missionId, weekKey)
    if (!existingMission) {
      throw new Error("Student mission not found")
    }

    const mission = await this.missionRepository.findByIdWithCourse(missionId)
    if (!mission) {
      throw new Error("Mission not found")
    }

    const status = mission.autoVerify ? "COMPLETADA" : "EN_REVISION"
    const autoVerifyEvidence = verificationResult?.message
      ? `Cumplimiento registrado automáticamente — ${verificationResult.message}`
      : "Cumplimiento registrado automáticamente"
    const finalEvidence = mission.autoVerify ? autoVerifyEvidence : evidence

    return this.studentMissionRepository.update(existingMission.id, {
      status: status as "COMPLETADA" | "EN_REVISION",
      progress: 100,
      completedAt: new Date(),
      evidence: finalEvidence,
    })
  }

  async completeVisitMission(studentId: string, missionId: string, visitedUrl: string, weekKey = ""): Promise<StudentMission> {
    const existingMission = await this.studentMissionRepository.findByStudentIdAndMissionId(studentId, missionId, weekKey)
    // Una misión ya completada o verificada por un docente no se degrada al
    // volver a abrir el recurso: la visita es idempotente.
    if (existingMission && (existingMission.status === "COMPLETADA" || existingMission.status === "VERIFICADA")) {
      return existingMission
    }

    const completedAt = new Date()
    const metadata = JSON.stringify({ visitedUrl, visitedAt: completedAt.toISOString() })
    const evidence = `Recurso UTB visitado — ${visitedUrl}`

    const studentMission = existingMission
      ? existingMission
      : await this.studentMissionRepository.create({
          studentId,
          missionId,
          weekKey,
          status: "COMPLETADA",
          progress: 100,
        })

    return this.studentMissionRepository.update(studentMission.id, {
      status: "COMPLETADA",
      progress: 100,
      completedAt,
      evidence,
      metadata,
    })
  }

  async getVerificationProfile(userId: string): Promise<VerificationProfile | null> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        enrollments: { include: { course: true } },
        academicHistory: true,
      },
    })

    if (!profile) return null

    return {
      enrollments: profile.enrollments.map((e) => ({
        status: e.status,
        semesterCode: e.semesterCode,
        courseId: e.courseId,
        course: e.course ? { credits: e.course.credits } : null,
        source: (e as { source?: string }).source,
        grade: (e as { grade?: number | null }).grade ?? null,
      })),
      academicHistory: profile.academicHistory.map((h) => ({
        grade: h.grade,
        status: h.status,
        source: (h as { source?: string }).source,
        credits: h.credits,
      })),
      averageGrade: profile.averageGrade,
      currentSemester: profile.currentSemester,
    }
  }

  async verifyMission(
    mission: { verificationKey: string | null; verificationValue: string | null },
    userId: string,
    metadata: string | null
  ): Promise<VerificationResult> {
    const profile = await this.getVerificationProfile(userId)
    if (!profile) {
      return { passed: false, progress: 0, message: "Perfil del estudiante no encontrado" }
    }

    return verifyMission(mission, userId, metadata, profile as DomainVerificationProfile)
  }

  async awardPoints(userId: string, amount: number, source: string, description: string, referenceKey?: string): Promise<number> {
    const periodCode = getCurrentPeriod()
    if (referenceKey) {
      const existing = await prisma.point.findUnique({ where: { referenceKey }, select: { id: true } })
      if (existing) return 0
    }

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [weekly, period] = await Promise.all([
      prisma.point.aggregate({
        where: { userId, source: "MISION_COMPLETADA", periodCode, createdAt: { gte: weekStart } },
        _sum: { amount: true },
      }),
      prisma.point.aggregate({
        where: { userId, source: "MISION_COMPLETADA", periodCode },
        _sum: { amount: true },
      }),
    ])

    if (!canAwardMissionPoints(amount, weekly._sum.amount || 0, period._sum.amount || 0)) return 0

    const data = {
      userId,
      amount,
      source: source as "MISION_COMPLETADA",
      periodCode,
      referenceKey,
      description,
    }

    if (referenceKey) {
      await prisma.point.upsert({ where: { referenceKey }, update: {}, create: data })
      return amount
    }

    await prisma.point.create({ data })
    return amount
  }

  async createNotification(userId: string, title: string, message: string, type: string, link: string): Promise<void> {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type as "LOGRO_OBTENIDO" | "INFO" | "MISION_DISPONIBLE",
        link,
      },
    })
  }
}