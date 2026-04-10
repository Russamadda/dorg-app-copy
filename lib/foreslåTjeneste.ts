/**
 * Velger beste treff blant firmaets tjenester ut fra fritekst (enkel heuristikk, ingen nettverkskall).
 */
export function foreslåTjenesteFraBeskrivelse(
  beskrivelse: string,
  alternativer: string[]
): string | null {
  const trimmet = beskrivelse.trim()
  if (!trimmet || alternativer.length === 0) return null

  const lavBesk = trimmet.toLowerCase()
  const ordIBesk = new Set(
    lavBesk.split(/[^a-zæøå0-9]+/i).filter(w => w.length >= 3)
  )

  let beste: { t: string; score: number } | null = null

  for (const t of alternativer) {
    const lavT = t.toLowerCase()
    if (lavBesk.includes(lavT)) {
      return t
    }
    const tOrd = lavT.split(/[^a-zæøå0-9]+/i).filter(w => w.length >= 3)
    let score = 0
    for (const w of tOrd) {
      if (ordIBesk.has(w)) score += 2
      if (lavBesk.includes(w)) score += 1
    }
    if (score > 0 && (!beste || score > beste.score)) {
      beste = { t, score }
    }
  }

  return beste?.t ?? null
}
