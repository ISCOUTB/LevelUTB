import test from "node:test"
import assert from "node:assert/strict"

import { getIsoWeekKey, getIsoWeekNumber, getIsoWeekRange } from "./week"

test("week: calcula la clave ISO 8601", () => {
  assert.equal(getIsoWeekKey(new Date("2026-01-01T12:00:00.000Z")), "2026-W01")
  assert.equal(getIsoWeekKey(new Date("2026-11-16T12:00:00.000Z")), "2026-W47")
  // 2026 tiene 53 semanas ISO: el 1 de enero de 2027 cae en 2026-W53.
  assert.equal(getIsoWeekKey(new Date("2027-01-01T12:00:00.000Z")), "2026-W53")
})

test("week: expone el número de semana para la rotación", () => {
  assert.equal(getIsoWeekNumber(new Date("2026-11-16T12:00:00.000Z")), 47)
})

test("week: el rango empieza el lunes y termina el lunes siguiente", () => {
  const { startsAt, endsAt } = getIsoWeekRange(new Date("2026-11-18T12:00:00.000Z"))
  assert.equal(startsAt.toISOString(), "2026-11-16T00:00:00.000Z")
  assert.equal(endsAt.toISOString(), "2026-11-23T00:00:00.000Z")
})
