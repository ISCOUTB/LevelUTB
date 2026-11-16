import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getGetMissionsUseCase,
  getAcceptMissionUseCase,
  getStartMissionUseCase,
  getCompleteMissionUseCase,
  getVerifyMissionUseCase,
  getAwardPointsUseCase,
  getCreateNotificationUseCase,
  getVisitMissionUseCase,
  buildStartMetadata,
} from "@/application/missions/missionFactory"
import { getCurrentPeriod } from "@/lib/period"
import { getIsoWeekKey } from "@/lib/week"
import { isAllowedMissionUrl } from "@/lib/missionLinks"

type StudentSession = { userId: string } | { error: NextResponse }

async function requireStudentSession(): Promise<StudentSession> {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  if (session.user.role !== "STUDENT") {
    return {
      error: NextResponse.json(
        { error: "Solo los estudiantes pueden gestionar misiones" },
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

    // Obtener perfil del estudiante para el nivel
    const { prisma } = await import("@/lib/prisma")
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { level: true },
    })

    if (!studentProfile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const getMissionsUseCase = getGetMissionsUseCase()
    const result = await getMissionsUseCase.execute(userId, studentProfile.level)

    return NextResponse.json({
      missions: result.missions.map(({ pointsReward, ...mission }) => ({
        ...mission,
        points: pointsReward,
      })),
      stats: result.stats,
    })
  } catch (error) {
    console.error("Error fetching missions:", error)
    return internalServerError(error)
  }
}

async function loadMissionContext(
  userId: string,
  missionId: unknown
): Promise<{ value: { mission: { id: string; isActive: boolean; requiredLevel: number | null; autoVerify: boolean; verificationKey: string | null; verificationValue: string | null; actionUrl: string | null; actionLabel: string | null; cadence: "ONCE" | "WEEKLY"; title: string; pointsReward: number }; weekKey: string } & { existingMission: { id: string; status: string; metadata: string | null; evidence: string | null } | null } } | { error: NextResponse }> {
  if (!missionId) {
    return {
      error: NextResponse.json({ error: "ID de misión requerido" }, { status: 400 })
    }
  }

  const { prisma } = await import("@/lib/prisma")

  const mission = await prisma.mission.findUnique({ where: { id: missionId as string } })
  if (!mission?.isActive) {
    return {
      error: NextResponse.json(
        { error: "Misión no encontrada o inactiva" },
        { status: 404 }
      ),
    }
  }

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!studentProfile) {
    return { error: NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 }) }
  }

  if (mission.requiredLevel && studentProfile.level < mission.requiredLevel) {
    return {
      error: NextResponse.json(
        { error: "Nivel insuficiente para esta misión" },
        { status: 403 }
      ),
    }
  }

  const existingMission = await prisma.studentMission.findUnique({
    where: {
      studentId_missionId_weekKey: {
        studentId: userId,
        missionId: mission.id,
        weekKey: mission.cadence === "WEEKLY" ? getIsoWeekKey() : "",
      }
    }
  })

  return {
    value: {
      weekKey: mission.cadence === "WEEKLY" ? getIsoWeekKey() : "",
      mission: {
        id: mission.id,
        isActive: mission.isActive,
        requiredLevel: mission.requiredLevel,
        autoVerify: mission.autoVerify,
        verificationKey: mission.verificationKey,
        verificationValue: mission.verificationValue,
        actionUrl: mission.actionUrl,
        actionLabel: mission.actionLabel,
        cadence: mission.cadence,
        title: mission.title,
        pointsReward: mission.pointsReward,
      },
      existingMission: existingMission ? {
        id: existingMission.id,
        status: existingMission.status,
        metadata: existingMission.metadata,
        evidence: existingMission.evidence,
      } : null
    }
  }
}

async function acceptMission(userId: string, mission: { id: string; title: string }, weekKey: string): Promise<NextResponse> {
  const acceptMissionUseCase = getAcceptMissionUseCase()
  const createNotificationUseCase = getCreateNotificationUseCase()

  const result = await acceptMissionUseCase.execute(userId, mission.id, weekKey)

  await createNotificationUseCase.execute(
    userId,
    "Misión aceptada",
    `Has aceptado la misión: ${mission.title}`,
    "MISION_DISPONIBLE",
    "/misiones"
  )

  return NextResponse.json({ studentMission: result.studentMission })
}

async function startMission(
  userId: string,
  mission: { id: string; verificationKey: string | null },
  existingMission: { id: string; status: string } | null,
  weekKey: string
): Promise<NextResponse> {
  if (!existingMission || !["PENDIENTE", "RECHAZADA"].includes(existingMission.status)) {
    return NextResponse.json(
      { error: "No puedes iniciar esta misión" },
      { status: 400 }
    )
  }

  const metadata = await buildStartMetadataSafe(mission, userId)
  if ("error" in metadata) return metadata.error

  const startMissionUseCase = getStartMissionUseCase()
  const result = await startMissionUseCase.execute(userId, mission.id, metadata.value, weekKey)

  return NextResponse.json({ studentMission: result.studentMission })
}

async function buildStartMetadataSafe(
  mission: { verificationKey: string | null },
  userId: string
): Promise<{ value: string | null } | { error: NextResponse }> {
  try {
    return { value: await buildStartMetadata(mission, userId) }
  } catch (metaError) {
    console.error("Error en buildStartMetadata:", metaError)
    const response = devError("Error al preparar la misión", metaError)
    return response ? { error: response } : { value: null }
  }
}

async function runAutoVerification(
  mission: { autoVerify: boolean; verificationKey: string | null; verificationValue: string | null },
  userId: string,
  metadata: string | null
): Promise<{ value: string | null } | { error: NextResponse }> {
  if (!mission.autoVerify || !mission.verificationKey) return { value: null }

  const verifyMissionUseCase = getVerifyMissionUseCase()
  const verification = await verifyMissionUseCase.execute(mission, userId, metadata)
  if (!verification.passed) {
    return {
      error: NextResponse.json(
        {
          error: "Tu misión aún no cumple la condición de verificación automática.",
          message: verification.message,
          progress: verification.progress
        },
        { status: 400 }
      ),
    }
  }

  return { value: verification.message }
}

function buildCompletionEvidence(
  mission: { autoVerify: boolean },
  submittedEvidence: string | undefined,
  verificationMessage: string | null
): string | null {
  if (!mission.autoVerify) return submittedEvidence ?? null
  return verificationMessage
    ? `Cumplimiento registrado automáticamente — ${verificationMessage}`
    : "Cumplimiento registrado automáticamente"
}

/**
 * Llave idempotente de puntos. Las misiones semanales añaden la semana ISO para
 * que la recompensa se pueda ganar de nuevo cada semana sin duplicarse dentro
 * de la misma semana.
 */
function missionReferenceKey(
  userId: string,
  mission: { id: string; cadence: "ONCE" | "WEEKLY" },
  weekKey: string
): string {
  const base = `MISSION:${userId}:${mission.id}:${getCurrentPeriod()}`
  return mission.cadence === "WEEKLY" ? `${base}:${weekKey}` : base
}

async function completeMission(
  userId: string,
  mission: { id: string; cadence: "ONCE" | "WEEKLY"; autoVerify: boolean; verificationKey: string | null; verificationValue: string | null; title: string; pointsReward: number },
  existingMission: { id: string; status: string; metadata: string | null; evidence: string | null },
  evidence: unknown,
  weekKey: string
): Promise<NextResponse> {
  if (existingMission.status !== "EN_PROGRESO") {
    return NextResponse.json(
      { error: "No puedes completar esta misión" },
      { status: 400 }
    )
  }

  const submittedEvidence =
    typeof evidence === "string" ? evidence.trim() : existingMission.evidence?.trim()
  if (!mission.autoVerify && !submittedEvidence) {
    return NextResponse.json(
      { error: "Debes adjuntar una evidencia antes de enviar la misión" },
      { status: 400 }
    )
  }

  const verification = await runAutoVerification(mission, userId, existingMission.metadata)
  if ("error" in verification) return verification.error

  const completeMissionUseCase = getCompleteMissionUseCase()
  const result = await completeMissionUseCase.execute(
    userId,
    mission.id,
    buildCompletionEvidence(mission, submittedEvidence, verification.value),
    verification.value ? { passed: true, progress: 100, message: verification.value } : null,
    weekKey
  )

  let awardedPoints = 0
  if (mission.autoVerify) {
    const awardPointsUseCase = getAwardPointsUseCase()
    awardedPoints = await awardPointsUseCase.execute(
      userId,
      mission.pointsReward,
      "MISION_COMPLETADA",
      `Misión completada: ${mission.title}`,
      missionReferenceKey(userId, mission, weekKey)
    )
  }

  const createNotificationUseCase = getCreateNotificationUseCase()
  await createNotificationUseCase.execute(
    userId,
    mission.autoVerify ? "Misión completada" : "Misión enviada a revisión",
    mission.autoVerify
      ? awardedPoints > 0
        ? `Completaste «${mission.title}» y ganaste ${awardedPoints} puntos.`
        : `Completaste «${mission.title}», pero alcanzaste el límite de puntos de misiones del periodo.`
      : `Tu evidencia para «${mission.title}» será revisada por un docente.`,
    mission.autoVerify ? "LOGRO_OBTENIDO" : "INFO",
    "/misiones"
  )

  return NextResponse.json({ studentMission: result.studentMission })
}

async function visitMission(
  userId: string,
  mission: { id: string; cadence: "ONCE" | "WEEKLY"; actionUrl: string | null; title: string; pointsReward: number },
  existingMission: { id: string; status: string } | null,
  weekKey: string
): Promise<NextResponse> {
  const redirectUrl = mission.actionUrl?.trim()
  if (!redirectUrl || !isAllowedMissionUrl(redirectUrl)) {
    return NextResponse.json(
      { error: "Esta misión no tiene un recurso válido para abrir" },
      { status: 400 }
    )
  }

  const alreadyCompleted =
    existingMission !== null &&
    (existingMission.status === "COMPLETADA" || existingMission.status === "VERIFICADA")

  // Las plantillas semanales solo se pueden completar si el plan de la semana
  // ya las asignó; así no se pueden farmear plantillas no asignadas.
  if (!alreadyCompleted && mission.cadence === "WEEKLY" && !existingMission) {
    return NextResponse.json(
      { error: "Esta misión no está asignada en tu plan de la semana" },
      { status: 400 }
    )
  }

  // Se redirige incluso si ya estaba completada: abrir el recurso siempre lleva
  // al estudiante al apartado, pero los puntos solo se acreditan una vez.
  if (alreadyCompleted) {
    return NextResponse.json({
      redirectUrl,
      awardedPoints: 0,
      alreadyCompleted: true,
    })
  }

  const visitMissionUseCase = getVisitMissionUseCase()
  const result = await visitMissionUseCase.execute(userId, mission.id, redirectUrl, weekKey)

  const awardPointsUseCase = getAwardPointsUseCase()
  const awardedPoints = await awardPointsUseCase.execute(
    userId,
    mission.pointsReward,
    "MISION_COMPLETADA",
    `Misión completada: ${mission.title}`,
    missionReferenceKey(userId, mission, weekKey)
  )

  const createNotificationUseCase = getCreateNotificationUseCase()
  await createNotificationUseCase.execute(
    userId,
    "Misión completada",
    awardedPoints > 0
      ? `Abriste «${mission.title}» y ganaste ${awardedPoints} puntos.`
      : `Abriste «${mission.title}», pero alcanzaste el límite de puntos de misiones del periodo.`,
    "LOGRO_OBTENIDO",
    "/misiones"
  )

  return NextResponse.json({
    redirectUrl,
    awardedPoints,
    alreadyCompleted: false,
    studentMission: result.studentMission,
  })
}

// POST: Aceptar/ejecutar una misión
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
    const { missionId, action, evidence } = body as {
      missionId?: unknown
      action?: unknown
      evidence?: unknown
    }
    if (typeof missionId !== "string" || missionId.length === 0) {
      return NextResponse.json({ error: "missionId requerido" }, { status: 400 })
    }
    if (typeof evidence === "string" && evidence.length > 2000) {
      return NextResponse.json(
        { error: "La evidencia no puede superar 2000 caracteres" },
        { status: 400 }
      )
    }

    const context = await loadMissionContext(userId, missionId)
    if ("error" in context) return context.error

    const { mission, existingMission, weekKey } = context.value

    if (action === "accept") {
      if (mission.cadence === "WEEKLY") {
        return NextResponse.json(
          { error: "Las misiones semanales se asignan automáticamente" },
          { status: 400 }
        )
      }
      if (existingMission) {
        return NextResponse.json(
          { error: "Ya tienes esta misión asignada" },
          { status: 400 }
        )
      }
      return acceptMission(userId, mission, weekKey)
    }

    if (action === "start") {
      return startMission(userId, mission, existingMission, weekKey)
    }

    if (action === "complete") {
      if (!existingMission) {
        return NextResponse.json(
          { error: "No puedes completar esta misión" },
          { status: 400 }
        )
      }
      return completeMission(userId, mission, existingMission, evidence, weekKey)
    }

    if (action === "visit") {
      return visitMission(userId, mission, existingMission, weekKey)
    }

    return NextResponse.json(
      { error: "Acción no válida" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error processing mission:", error)
    return internalServerError(error)
  }
}