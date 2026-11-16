/**
 * Plan semanal de misiones.
 *
 * Las misiones de hábito se asignan todas las semanas para sostener la
 * constancia; el recurso rota por semana y la misión adaptativa se elige según
 * la situación académica del estudiante. El plan es una función pura: la capa
 * de infraestructura lo traduce a `StudentMission` con `weekKey`.
 */

export type WeeklyMissionSnapshot = {
  averageGrade: number
  failedCourses: number
  unreadRecommendations: number
  hasRecentActivity: boolean
  level: number
  weekNumber: number
}

export const WEEKLY_HABIT_CODES = [
  "HABITO_RACHA_SEMANAL",
  "HABITO_TRES_MISIONES",
  "HABITO_BANDEJA_LIMPIA",
] as const

export const WEEKLY_RESOURCE_POOL = [
  "RECURSO_SAVIO",
  "RECURSO_BANNER",
  "RECURSO_BIBLIOTECA",
  "RECURSO_SEMILLEROS",
  "RECURSO_MOVILIDAD",
  "RECURSO_POSTGRADOS",
] as const

export type WeeklyResourceCode = (typeof WEEKLY_RESOURCE_POOL)[number]
export type WeeklyAdaptiveCode =
  | "ADAPT_MALLA"
  | "ADAPT_ESTADISTICAS"
  | "ADAPT_RECOMENDACIONES"
  | "ADAPT_RETOMAR"
  | "ADAPT_LOGROS"
  | "ADAPT_RECURSOS"

/** Elige la misión adaptativa de mayor prioridad para la semana. */
export function pickWeeklyAdaptiveCode(snapshot: WeeklyMissionSnapshot): WeeklyAdaptiveCode {
  if (snapshot.failedCourses > 0) return "ADAPT_MALLA"
  if (snapshot.averageGrade > 0 && snapshot.averageGrade < 3.5) return "ADAPT_ESTADISTICAS"
  if (snapshot.unreadRecommendations > 0) return "ADAPT_RECOMENDACIONES"
  if (!snapshot.hasRecentActivity) return "ADAPT_RETOMAR"
  if (snapshot.level >= 3) return "ADAPT_LOGROS"
  return "ADAPT_RECURSOS"
}

/** Recurso que rota de forma determinista según el número de semana ISO. */
export function pickWeeklyResourceCode(weekNumber: number): WeeklyResourceCode {
  const index = Math.abs(weekNumber - 1) % WEEKLY_RESOURCE_POOL.length
  return WEEKLY_RESOURCE_POOL[index]
}

/** Códigos de las misiones que el estudiante debe recibir esta semana. */
export function buildWeeklyMissionPlan(snapshot: WeeklyMissionSnapshot): string[] {
  return [
    ...WEEKLY_HABIT_CODES,
    pickWeeklyResourceCode(snapshot.weekNumber),
    pickWeeklyAdaptiveCode(snapshot),
  ]
}
