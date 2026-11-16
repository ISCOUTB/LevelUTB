import test from "node:test"
import assert from "node:assert/strict"

import {
  buildWeeklyMissionPlan,
  pickWeeklyAdaptiveCode,
  pickWeeklyResourceCode,
  WEEKLY_HABIT_CODES,
} from "./weeklyMissionPlan"

const base = {
  averageGrade: 4.2,
  failedCourses: 0,
  unreadRecommendations: 0,
  hasRecentActivity: true,
  level: 1,
  weekNumber: 47,
}

test("plan semanal: siempre conserva las misiones de hábito", () => {
  const plan = buildWeeklyMissionPlan(base)
  for (const code of WEEKLY_HABIT_CODES) {
    assert.ok(plan.includes(code), `falta ${code}`)
  }
  assert.equal(plan.length, 5)
})

test("plan semanal: prioriza recuperación, promedio y recomendaciones", () => {
  assert.equal(pickWeeklyAdaptiveCode({ ...base, failedCourses: 2 }), "ADAPT_MALLA")
  assert.equal(pickWeeklyAdaptiveCode({ ...base, averageGrade: 3.2 }), "ADAPT_ESTADISTICAS")
  assert.equal(pickWeeklyAdaptiveCode({ ...base, unreadRecommendations: 3 }), "ADAPT_RECOMENDACIONES")
  assert.equal(pickWeeklyAdaptiveCode({ ...base, hasRecentActivity: false }), "ADAPT_RETOMAR")
  assert.equal(pickWeeklyAdaptiveCode({ ...base, level: 4 }), "ADAPT_LOGROS")
  assert.equal(pickWeeklyAdaptiveCode(base), "ADAPT_RECURSOS")
})

test("plan semanal: el recurso rota de forma determinista por semana", () => {
  assert.equal(pickWeeklyResourceCode(1), "RECURSO_SAVIO")
  assert.equal(pickWeeklyResourceCode(7), "RECURSO_SAVIO")
  assert.equal(pickWeeklyResourceCode(8), "RECURSO_BANNER")
  assert.equal(pickWeeklyResourceCode(47), pickWeeklyResourceCode(47))
})
