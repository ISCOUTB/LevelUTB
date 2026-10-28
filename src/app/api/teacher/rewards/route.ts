import { NextResponse } from "next/server"
import { requireRole, jsonUnauthorized, jsonForbidden } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getGetTeacherRewardsUseCase, getReviewRewardUseCase, getCreateTeacherRewardUseCase } from "@/application/rewards/rewardFactory"

export async function GET() {
  const session = await requireRole("TEACHER")

  if (session.error) {
    return session.status === 401 ? jsonUnauthorized(session.error) : jsonForbidden(session.error)
  }

  const teacherUserId = session.data?.userId
  if (!teacherUserId) {
    return jsonUnauthorized("No autorizado")
  }

  try {
    const getTeacherRewardsUseCase = getGetTeacherRewardsUseCase()
    const result = await getTeacherRewardsUseCase.execute(teacherUserId)

    const createUseCase = getCreateTeacherRewardUseCase()
    const customRewards = await createUseCase.getTeacherCustomRewards(teacherUserId)

    return NextResponse.json({
      pending: result.pending,
      reviewed: result.reviewed,
      customRewards,
    })
  } catch (error) {
    console.error("Error fetching teacher rewards:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireRole("TEACHER")

  if (session.error) {
    return session.status === 401 ? jsonUnauthorized(session.error) : jsonForbidden(session.error)
  }

  const teacherUserId = session.data?.userId
  if (!teacherUserId) {
    return jsonUnauthorized("No autorizado")
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
    }
    const { name, description, icon, category, cost, courseId } = body as { name?: unknown; description?: unknown; icon?: unknown; category?: unknown; cost?: unknown; courseId?: unknown }

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "El nombre de la recompensa es obligatorio" }, { status: 400 })
    }

    const parsedCost = typeof cost === "string" ? Number(cost) : cost
    if (typeof parsedCost !== "number" || Number.isNaN(parsedCost) || parsedCost <= 0) {
      return NextResponse.json({ error: "El costo debe ser un número positivo" }, { status: 400 })
    }

    const validCategories = ["EXAMEN", "ASISTENCIA", "ENTREGA", "OTRO"] as const
    if (typeof category !== "string" || !validCategories.includes(category as (typeof validCategories)[number])) {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 })
    }
    if (typeof icon !== "string" || icon.trim().length === 0) {
      return NextResponse.json({ error: "El icono es obligatorio" }, { status: 400 })
    }
    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 })
    }
    const createUseCase = getCreateTeacherRewardUseCase()
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      include: { assignedCourses: { include: { course: true } } },
    })
    const assignedCourses = teacherProfile?.assignedCourses ?? []
    const assignedCourseId = assignedCourses[0]?.courseId
    const finalCourseId = typeof courseId === "string" && courseId.trim() ? (courseId as string).trim() : assignedCourseId
    if (!finalCourseId) {
      return NextResponse.json({ error: "No tienes cursos asignados para crear recompensas" }, { status: 400 })
    }
    if (!assignedCourses.some((assignment) => assignment.courseId === finalCourseId)) {
      return NextResponse.json({ error: "Solo puedes crear recompensas para cursos que tienes asignados" }, { status: 403 })
    }

    const result = await createUseCase.execute(teacherUserId, {
      teacherId: teacherUserId,
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim(),
      category: category as (typeof validCategories)[number],
      cost: parsedCost,
      courseId: finalCourseId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating teacher reward:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await requireRole("TEACHER")

  if (session.error) {
    return session.status === 401 ? jsonUnauthorized(session.error) : jsonForbidden(session.error)
  }

  const teacherUserId = session.data?.userId
  if (!teacherUserId) {
    return jsonUnauthorized("No autorizado")
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
    }
    const { studentRewardId, courseId, decision, comment } = body as { studentRewardId?: unknown; courseId?: string; decision?: unknown; comment?: unknown }

    if (typeof studentRewardId !== "string" || !["approve", "reject"].includes(decision as string)) {
      return NextResponse.json({ error: "Decisión inválida" }, { status: 400 })
    }
    if (typeof comment === "string" && comment.length > 2000) {
      return NextResponse.json({ error: "El comentario no puede superar 2000 caracteres" }, { status: 400 })
    }

    const reviewRewardUseCase = getReviewRewardUseCase()
    const result = await reviewRewardUseCase.execute(teacherUserId, { studentRewardId, courseId, decision: decision as "approve" | "reject", comment: typeof comment === "string" ? comment : undefined })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error reviewing reward:", error)

    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_REQUEST":
          return NextResponse.json({ error: "Solicitud no encontrada o ya procesada" }, { status: 400 })
        case "STUDENT_PROFILE_NOT_FOUND":
          return NextResponse.json({ error: "Perfil de estudiante no encontrado" }, { status: 404 })
        case "NOT_ASSIGNED":
          return NextResponse.json({ error: "El estudiante no pertenece a tus cursos vigentes" }, { status: 403 })
        case "El estudiante no está matriculado en ese curso asignado":
          return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}