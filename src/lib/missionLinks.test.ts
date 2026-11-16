import test from "node:test"
import assert from "node:assert/strict"

import { isAllowedMissionUrl, isExternalMissionUrl } from "./missionLinks"

test("missionLinks acepta rutas internas y URLs HTTPS de la UTB", () => {
  assert.equal(isAllowedMissionUrl("/malla"), true)
  assert.equal(isAllowedMissionUrl("/recompensas"), true)
  assert.equal(isAllowedMissionUrl("https://utb.edu.co/posgrados/"), true)
  assert.equal(isAllowedMissionUrl("https://savio.utb.edu.co/"), true)
  assert.equal(isAllowedMissionUrl("https://ssbprod.utb.edu.co:8443/ssomanager/c/SSB"), true)
})

test("missionLinks rechaza destinos fuera de la UTB o protocolos inseguros", () => {
  assert.equal(isAllowedMissionUrl(""), false)
  assert.equal(isAllowedMissionUrl(null), false)
  assert.equal(isAllowedMissionUrl("/"), false)
  assert.equal(isAllowedMissionUrl("//evil.example"), false)
  assert.equal(isAllowedMissionUrl("/\\evil.example"), false)
  assert.equal(isAllowedMissionUrl("javascript:alert(1)"), false)
  assert.equal(isAllowedMissionUrl("http://utb.edu.co/"), false)
  assert.equal(isAllowedMissionUrl("https://evil.example/"), false)
  assert.equal(isAllowedMissionUrl("https://utb.edu.co.evil.example/"), false)
  assert.equal(isAllowedMissionUrl("https://fakeutb.edu.co/"), false)
})

test("missionLinks distingue recursos externos de rutas internas", () => {
  assert.equal(isExternalMissionUrl("https://savio.utb.edu.co/"), true)
  assert.equal(isExternalMissionUrl("/perfil"), false)
  assert.equal(isExternalMissionUrl("https://evil.example/"), false)
})
