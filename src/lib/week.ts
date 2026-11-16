const DAY_MS = 24 * 60 * 60 * 1000

function isoWeekParts(date: Date): { year: number; week: number } {
  // Algoritmo ISO 8601: el jueves de la semana define el año y el número.
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)

  const year = target.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)

  return { year, week }
}

/** Clave idempotente de la semana ISO, por ejemplo `2026-W47`. */
export function getIsoWeekKey(date = new Date()): string {
  const { year, week } = isoWeekParts(date)
  return `${year}-W${String(week).padStart(2, "0")}`
}

/** Número de semana ISO (1-53), útil para rotar contenido semanal. */
export function getIsoWeekNumber(date = new Date()): number {
  return isoWeekParts(date).week
}

/** Rango [lunes, lunes siguiente) de la semana ISO que contiene `date`. */
export function getIsoWeekRange(date = new Date()): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = startsAt.getUTCDay() || 7
  startsAt.setUTCDate(startsAt.getUTCDate() - (dayNumber - 1))
  const endsAt = new Date(startsAt.getTime() + 7 * DAY_MS)
  return { startsAt, endsAt }
}
