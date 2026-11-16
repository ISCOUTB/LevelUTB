const ALLOWED_ROOT_DOMAIN = "utb.edu.co"

/**
 * Valida los destinos de misión antes de guardarlos o redirigir.
 *
 * Acepta rutas internas de LevelUTB ("/malla") y URLs HTTPS del dominio
 * institucional o sus subdominios (savio.utb.edu.co, ssbprod.utb.edu.co...).
 * Rechaza protocolos ejecutables, dominios externos y rutas protocol-relative.
 */
export function isAllowedMissionUrl(value: string | null | undefined): boolean {
  if (!value) return false

  const trimmed = value.trim()
  if (trimmed.startsWith("/")) {
    if (trimmed.length <= 1 || trimmed.startsWith("//") || trimmed.includes("\\")) {
      return false
    }
    try {
      const relative = new URL(trimmed, "https://levelutb.local")
      return relative.origin === "https://levelutb.local"
    } catch {
      return false
    }
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:") return false

    const host = url.hostname.toLowerCase()
    return host === ALLOWED_ROOT_DOMAIN || host.endsWith(`.${ALLOWED_ROOT_DOMAIN}`)
  } catch {
    return false
  }
}

export function isExternalMissionUrl(value: string | null | undefined): boolean {
  return isAllowedMissionUrl(value) && !value!.trim().startsWith("/")
}
