import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGetStudentRewardsUseCase, getRedeemRewardUseCase, getCurrentPeriod } from "@/application/rewards/rewardFactory"
import { prisma } from "@/lib/prisma"
import { buildStats, buildRewardWithEligibility } from "@/domain/rewards/rewardRules"

type StudentSession = { userId: string } | { error: NextResponse }
type RewardTeacher = { id: string; name: string | null }
type RewardTeacherCourse = { id: string; code: string; name: string; semester: number; period: string }

async function requireStudentSession(): Promise<StudentSession> {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  if (session.user.role !== "STUDENT") {
    return {
      error: NextResponse.json(
        { error: "Solo los estudiantes pueden acceder a recompensas" },
        { status: 403 }
      ),
    }
  }

  return { userId: session.user.id as string }
}

function devError(error: string, cause: unknown): NextResponse | null {
  if (process.env.NODE_ENV !== "development") return null
  return NextResponse.json(
    { error, details: cause instanceof Error ? cause.message : String(cause) },
    { status: 500 }
  )
}

function internalServerError(cause: unknown): NextResponse {
  return (
    devError("Error interno del servidor", cause) ??
    NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  )
}

export async function GET() {
  try {
    const session = await requireStudentSession()
    if ("error" in session) return session.error

    const { userId } = session
    const period = getCurrentPeriod()

    const getStudentRewardsUseCase = getGetStudentRewardsUseCase()
    const result = await getStudentRewardsUseCase.execute(userId, period)

    // Get teacher info for rewards
    const rewardsWithTeacher = await Promise.all(
      result.rewards.map(async (reward) => {
        if (reward.teacherId) {
          const teacher = await prisma.user.findUnique({
            where: { id: reward.teacherId },
            select: { id: true, name: true }
          })
          // Find which course the teacher teaches
          const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: reward.teacherId },
            include: {
              assignedCourses: {
                include: {
                  course: {
                    include: {
                      semester: true
                    }
                  }
                },
                take: 1
              }
            }
          })
          const teacherCourse = teacherProfile?.assignedCourses?.[0]?.course
            ? {
                id: teacherProfile.assignedCourses[0].course.id,
                code: teacherProfile.assignedCourses[0].course.code,
                name: teacherProfile.assignedCourses[0].course.name,
                semester: teacherProfile.assignedCourses[0].course.semester.number,
                period: teacherProfile.assignedCourses[0].period
              }
            : null
          return { ...reward, teacher, teacherCourse }
        }
        return reward
      })
    )

    // Filter to only teacher-created rewards
    const teacherRewards = rewardsWithTeacher.filter(
      (reward): reward is typeof reward & { teacherId: string; teacher: RewardTeacher | null; teacherCourse: RewardTeacherCourse | null } =>
        Boolean(reward.teacherId)
    )

    const mappedRewards = teacherRewards.map((reward) => {
        const studentReward = result.studentRewards.find((sr) => sr.rewardId === reward.id)
        const usesCount = result.studentRewards.filter((sr) => sr.rewardId === reward.id && sr.status !== "RECHAZADO").length
        const canUse = reward.maxUses === null || usesCount < reward.maxUses

        const teacherCourse = reward.teacherCourse
        const rewardCourse = teacherCourse
          ? {
              id: teacherCourse.id,
              code: teacherCourse.code,
              name: teacherCourse.name,
              semester: teacherCourse.semester,
            }
          : null

        return {
          id: reward.id,
          name: reward.name,
          description: reward.description,
          icon: reward.icon,
          category: reward.category,
          cost: reward.cost,
          isActive: reward.isActive,
          maxUses: reward.maxUses,
          teacherId: reward.teacherId,
          courseId: reward.courseId,
          createdAt: reward.createdAt,
          updatedAt: reward.updatedAt,
          teacher: reward.teacher,
          teacherCourse,
          course: rewardCourse,
          canAfford: result.totalPoints >= reward.cost,
          canUse,
          usesCount,
          earned: studentReward ? {
            id: studentReward.id,
            status: studentReward.status,
            pointsSpent: studentReward.pointsSpent,
            requestedAt: studentReward.requestedAt.toISOString(),
            reviewedAt: studentReward.reviewedAt?.toISOString() || null,
            reviewNote: studentReward.reviewNote,
            expiresAt: studentReward.expiresAt?.toISOString() || null,
            course: {
              id: studentReward.course.id,
              code: studentReward.course.code,
              name: studentReward.course.name,
              semester: studentReward.course.semester.number,
            },
          } : null,
        }
      })

    const eligibleRewards = teacherRewards.map((reward) =>
      buildRewardWithEligibility(reward, result.studentRewards, result.totalPoints)
    )
    const stats = buildStats(eligibleRewards, result.studentRewards)
    stats.totalPoints = result.totalPoints

    return NextResponse.json({
      rewards: mappedRewards,
      enrolledCourses: result.enrolledCourses,
      currentPeriod: period,
      stats,
    })
  } catch (error) {
    console.error("Error fetching rewards:", error)
    return internalServerError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStudentSession()
    if ("error" in session) return session.error

    const { userId } = session
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
    }
    const { rewardId, courseId, evidence } = body as { rewardId?: unknown; courseId?: unknown; evidence?: unknown }

    if (typeof rewardId !== "string" || typeof courseId !== "string" || !rewardId || !courseId) {
      return NextResponse.json({ error: "Debes seleccionar el curso objetivo" }, { status: 400 })
    }
    if (typeof evidence === "string" && evidence.length > 2000) {
      return NextResponse.json(
        { error: "La evidencia no puede superar 2000 caracteres" },
        { status: 400 }
      )
    }

    const redeemRewardUseCase = getRedeemRewardUseCase()
    const result = await redeemRewardUseCase.execute(userId, { rewardId, courseId, evidence: typeof evidence === "string" ? evidence : undefined })

    return NextResponse.json({ studentReward: result.studentReward })
  } catch (error) {
    console.error("Error redeeming reward:", error)

    if (error instanceof Error) {
      switch (error.message) {
        case "REWARD_NOT_FOUND":
          return NextResponse.json({ error: "Recompensa no encontrada o inactiva" }, { status: 404 })
        case "INELIGIBLE_COURSE": {
          const period = getCurrentPeriod()
          return NextResponse.json(
            { error: `Solo puedes reclamar la recompensa para un curso matriculado oficialmente en el semestre actual del periodo ${period}. Verifica tus cursos vigentes en /malla.` },
            { status: 400 }
          )
        }
        case "MAX_USES_REACHED":
          return NextResponse.json({ error: "Has alcanzado el límite de usos para esta recompensa" }, { status: 400 })
        case "INSUFFICIENT_POINTS":
          return NextResponse.json({ error: "Puntos insuficientes" }, { status: 400 })
        case "PENDING_REQUEST_EXISTS":
          return NextResponse.json({ error: "Ya tienes una solicitud pendiente para esta recompensa" }, { status: 400 })
      }
    }

    return internalServerError(error)
  }
}