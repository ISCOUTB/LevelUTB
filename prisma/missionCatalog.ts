import type { MissionCadence, MissionType } from "@prisma/client"

export type MissionCatalogItem = {
  code: string
  title: string
  description: string
  type: MissionType
  cadence: MissionCadence
  pointsReward: number
  autoVerify: boolean
  actionUrl: string | null
  actionLabel: string | null
  verificationKey?: string | null
  verificationValue?: string | null
}

/**
 * Catálogo canónico de misiones.
 *
 * - `ONCE`: misiones permanentes de interacción. Abren un recurso de la UTB o
 *   una página interna y acreditan puntos una sola vez por periodo.
 * - `WEEKLY`: plantillas del plan semanal. Se asignan por estudiante con
 *   `StudentMission.weekKey` (semana ISO). Las de hábito se repiten todas las
 *   semanas; el recurso rota y la adaptativa depende de sus datos académicos.
 */
export const MISSION_CATALOG: MissionCatalogItem[] = [
  // ===== Misiones permanentes (ONCE) =====
  {
    code: "SAVIO",
    title: "Conecta con Savio",
    description: "Abre Savio y revisa los cursos virtuales en los que estás matriculado.",
    type: "ACADEMICO",
    cadence: "ONCE",
    pointsReward: 25,
    autoVerify: false,
    actionUrl: "https://savio.utb.edu.co/",
    actionLabel: "Ir a Savio",
  },
  {
    code: "BANNER",
    title: "Revisa tu historia en Banner",
    description: "Entra a Banner y consulta tu cárdex académico y tus calificaciones.",
    type: "ACADEMICO",
    cadence: "ONCE",
    pointsReward: 25,
    autoVerify: false,
    actionUrl: "https://ssbprod.utb.edu.co:8443/ssomanager/c/SSB",
    actionLabel: "Abrir Banner",
  },
  {
    code: "RUTA_AUTONOMIA",
    title: "Descubre tu Ruta de Autonomía",
    description: "Explora la Ruta de Autonomía y Éxito Profesional y las experiencias que ofrece.",
    type: "PLANIFICACION",
    cadence: "ONCE",
    pointsReward: 20,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/ruta-de-autonomia-y-exito-profesional/",
    actionLabel: "Ver la Ruta",
  },
  {
    code: "SEMILLEROS",
    title: "Encuentra tu semillero",
    description: "Conoce los semilleros de investigación de la UTB y elige uno para explorar.",
    type: "ACADEMICO",
    cadence: "ONCE",
    pointsReward: 30,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/investigacion/apoyo-a-la-investigacion/semilleros-de-investigacion/",
    actionLabel: "Ver semilleros",
  },
  {
    code: "POSTGRADOS",
    title: "Explora los postgrados",
    description: "Conoce las especializaciones, maestrías y doctorados que ofrece la UTB.",
    type: "PLANIFICACION",
    cadence: "ONCE",
    pointsReward: 20,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/posgrados/",
    actionLabel: "Ver postgrados",
  },
  {
    code: "BIBLIOTECA",
    title: "Visita la Biblioteca UTB",
    description: "Explora el catálogo, las bases de datos y los recursos digitales de la Biblioteca.",
    type: "ACADEMICO",
    cadence: "ONCE",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/biblioteca-utb/",
    actionLabel: "Abrir biblioteca",
  },
  {
    code: "ECO",
    title: "Conoce el Ecosistema Universitario",
    description: "Descubre los programas de bienestar, autocuidado y vida universitaria de ECO.",
    type: "PLANIFICACION",
    cadence: "ONCE",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/vida-en-el-campus/eco-ecosistema-universitario/",
    actionLabel: "Conocer ECO",
  },
  {
    code: "MOVILIDAD",
    title: "Explora la movilidad internacional",
    description: "Consulta las convocatorias y destinos de movilidad internacional para estudiantes UTB.",
    type: "ACADEMICO",
    cadence: "ONCE",
    pointsReward: 20,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/utb-global/movilidad-internacional-estudiantes-utb/",
    actionLabel: "Ver movilidad",
  },
  {
    code: "MALLA",
    title: "Revisa tu malla curricular",
    description: "Abre tu malla, identifica créditos aprobados y revisa los prerrequisitos pendientes.",
    type: "PLANIFICACION",
    cadence: "ONCE",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/malla",
    actionLabel: "Abrir mi malla",
  },
  {
    code: "LOGROS",
    title: "Consulta tus logros",
    description: "Entra a logros y revisa las insignias que ya obtuviste y las que puedes desbloquear.",
    type: "MEJORA_CONTINUA",
    cadence: "ONCE",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/logros",
    actionLabel: "Ver mis logros",
  },
  {
    code: "RECOMPENSAS",
    title: "Explora las recompensas",
    description: "Abre el catálogo de recompensas y revisa cuántos puntos necesitas para canjear.",
    type: "MEJORA_CONTINUA",
    cadence: "ONCE",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/recompensas",
    actionLabel: "Ver recompensas",
  },
  {
    code: "ESTADISTICAS",
    title: "Revisa tus estadísticas",
    description: "Consulta tu promedio, créditos, nivel y tendencia por semestre.",
    type: "ACADEMICO",
    cadence: "ONCE",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/estadisticas",
    actionLabel: "Ver estadísticas",
  },
  {
    code: "PERFIL",
    title: "Actualiza tu perfil",
    description: "Abre tu perfil y verifica que tus datos académicos estén completos.",
    type: "PLANIFICACION",
    cadence: "ONCE",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/perfil",
    actionLabel: "Abrir mi perfil",
  },

  // ===== Plan semanal: hábitos que se repiten =====
  {
    code: "HABITO_RACHA_SEMANAL",
    title: "Constancia semanal",
    description: "Entra a LevelUTB todos los días y mantén tu racha activa durante 7 días.",
    type: "HABITO_ESTUDIO",
    cadence: "WEEKLY",
    pointsReward: 20,
    autoVerify: true,
    verificationKey: "RACHA_7_DIAS_ACCESO",
    actionUrl: null,
    actionLabel: null,
  },
  {
    code: "HABITO_TRES_MISIONES",
    title: "Tres misiones esta semana",
    description: "Completa al menos 3 misiones distintas en los próximos 7 días.",
    type: "HABITO_ESTUDIO",
    cadence: "WEEKLY",
    pointsReward: 25,
    autoVerify: true,
    verificationKey: "COMPLETAR_3_MISIONES_SEMANA",
    actionUrl: null,
    actionLabel: null,
  },
  {
    code: "HABITO_BANDEJA_LIMPIA",
    title: "Bandeja al día",
    description: "Revisa y cierra tus notificaciones pendientes para no perder ninguna ruta.",
    type: "HABITO_ESTUDIO",
    cadence: "WEEKLY",
    pointsReward: 10,
    autoVerify: true,
    verificationKey: "SIN_NOTIFICACIONES_PENDIENTES",
    actionUrl: null,
    actionLabel: null,
  },

  // ===== Plan semanal: recurso que rota =====
  {
    code: "RECURSO_SAVIO",
    title: "Semana en Savio",
    description: "Entra a Savio y revisa las novedades y tareas de tus cursos virtuales.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://savio.utb.edu.co/",
    actionLabel: "Ir a Savio",
  },
  {
    code: "RECURSO_BANNER",
    title: "Semana en Banner",
    description: "Consulta tu cárdex en Banner y confirma que tus calificaciones estén al día.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://ssbprod.utb.edu.co:8443/ssomanager/c/SSB",
    actionLabel: "Abrir Banner",
  },
  {
    code: "RECURSO_BIBLIOTECA",
    title: "Recurso de la semana: Biblioteca",
    description: "Explora un recurso digital o una base de datos de la Biblioteca UTB.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/biblioteca-utb/",
    actionLabel: "Abrir biblioteca",
  },
  {
    code: "RECURSO_SEMILLEROS",
    title: "Semana de investigación",
    description: "Revisa los semilleros de investigación y elige uno para explorar.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/investigacion/apoyo-a-la-investigacion/semilleros-de-investigacion/",
    actionLabel: "Ver semilleros",
  },
  {
    code: "RECURSO_MOVILIDAD",
    title: "Semana global",
    description: "Revisa las convocatorias de movilidad internacional disponibles para estudiantes UTB.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/utb-global/movilidad-internacional-estudiantes-utb/",
    actionLabel: "Ver movilidad",
  },
  {
    code: "RECURSO_POSTGRADOS",
    title: "Mira más allá de tu pregrado",
    description: "Explora las especializaciones y maestrías que ofrece la UTB.",
    type: "PLANIFICACION",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "https://www.utb.edu.co/posgrados/",
    actionLabel: "Ver postgrados",
  },

  // ===== Plan semanal: misión adaptativa =====
  {
    code: "ADAPT_MALLA",
    title: "Plan de recuperación",
    description: "Abre tu malla e identifica las materias reprobadas o que debes priorizar.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 20,
    autoVerify: false,
    actionUrl: "/malla",
    actionLabel: "Abrir mi malla",
  },
  {
    code: "ADAPT_ESTADISTICAS",
    title: "Revisa tu promedio",
    description: "Abre tus estadísticas y detecta en qué necesitas mejorar esta semana.",
    type: "ACADEMICO",
    cadence: "WEEKLY",
    pointsReward: 15,
    autoVerify: false,
    actionUrl: "/estadisticas",
    actionLabel: "Ver estadísticas",
  },
  {
    code: "ADAPT_RECOMENDACIONES",
    title: "Revisa tus recomendaciones",
    description: "Entra al dashboard y revisa las recomendaciones personalizadas de tu ruta.",
    type: "PLANIFICACION",
    cadence: "WEEKLY",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/dashboard",
    actionLabel: "Ir al dashboard",
  },
  {
    code: "ADAPT_RETOMAR",
    title: "Retoma tu semana",
    description: "Vuelve al dashboard, revisa tus pendientes y ponte al día con tus misiones.",
    type: "HABITO_ESTUDIO",
    cadence: "WEEKLY",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/dashboard",
    actionLabel: "Ir al dashboard",
  },
  {
    code: "ADAPT_LOGROS",
    title: "Desbloquea un logro",
    description: "Abre tus logros, revisa tu progreso y apunta al siguiente.",
    type: "MEJORA_CONTINUA",
    cadence: "WEEKLY",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/logros",
    actionLabel: "Ver mis logros",
  },
  {
    code: "ADAPT_RECURSOS",
    title: "Explora LevelUTB",
    description: "Abre tus recompensas y descubre qué puedes canjear con los puntos de la semana.",
    type: "MEJORA_CONTINUA",
    cadence: "WEEKLY",
    pointsReward: 10,
    autoVerify: false,
    actionUrl: "/recompensas",
    actionLabel: "Ver recompensas",
  },
]

export const PERMANENT_MISSION_CODES = MISSION_CATALOG.filter(
  (mission) => mission.cadence === "ONCE"
).map((mission) => mission.code)

export const WEEKLY_MISSION_CODES = MISSION_CATALOG.filter(
  (mission) => mission.cadence === "WEEKLY"
).map((mission) => mission.code)
