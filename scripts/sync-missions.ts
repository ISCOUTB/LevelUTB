import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { MISSION_CATALOG } from "../prisma/missionCatalog"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  let created = 0
  let updated = 0

  const canonicalCodes = new Set(MISSION_CATALOG.map((mission) => mission.code))
  const canonicalTitles = new Set(MISSION_CATALOG.map((mission) => mission.title))

  // Purga fuera de catálogo: primero las asignaciones para no dejar progreso
  // huérfano. Aplica igual a misiones permanentes y plantillas semanales.
  const existingMissions = await prisma.mission.findMany({
    select: { id: true, code: true, title: true },
  })
  const staleIds = existingMissions
    .filter((mission) => {
      if (mission.code && canonicalCodes.has(mission.code)) return false
      return !canonicalTitles.has(mission.title)
    })
    .map((mission) => mission.id)

  if (staleIds.length > 0) {
    await prisma.studentMission.deleteMany({ where: { missionId: { in: staleIds } } })
    const stale = await prisma.mission.deleteMany({ where: { id: { in: staleIds } } })
    console.log(`Se eliminaron ${stale.count} misiones fuera del catálogo.`)
  }

  for (const mission of MISSION_CATALOG) {
    const data = {
      code: mission.code,
      description: mission.description,
      type: mission.type,
      cadence: mission.cadence,
      pointsReward: mission.pointsReward,
      autoVerify: mission.autoVerify,
      actionUrl: mission.actionUrl,
      actionLabel: mission.actionLabel,
      verificationKey: mission.verificationKey ?? null,
      verificationValue: mission.verificationValue ?? null,
      isActive: true,
    }

    const existing =
      (await prisma.mission.findUnique({ where: { code: mission.code } })) ??
      (await prisma.mission.findFirst({ where: { title: mission.title } }))

    if (existing) {
      await prisma.mission.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.mission.create({ data: { title: mission.title, ...data } })
      created++
    }
  }

  console.log(
    `Misiones sincronizadas: ${created} creadas, ${updated} actualizadas ` +
      `(${MISSION_CATALOG.filter((m) => m.cadence === "WEEKLY").length} plantillas semanales).`
  )
}

main()
  .catch((error) => {
    console.error("No se pudieron sincronizar las misiones:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
