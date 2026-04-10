import type { Firma } from '../types'

export const TILBUD_FALLBACK_JOBBTYPER = [
  'Rørlegging',
  'Elektro',
  'Snekker',
  'Maling',
  'Taklegging',
  'Annet',
] as const

export const TILBUD_MAX_TJENESTER = 6

/** Samme liste som i tilbudsflyten (aktive tjenester → tjenester → fallback). */
export function hentTilbudJobbtyper(firma: Firma | null): string[] {
  const rå =
    (firma?.aktiveTjenester?.length ?? 0) > 0
      ? (firma?.aktiveTjenester ?? [])
      : firma?.tjenester ?? []
  const liste = (rå.length > 0 ? rå : [...TILBUD_FALLBACK_JOBBTYPER]).slice(0, TILBUD_MAX_TJENESTER)
  return liste.length > 0 ? liste : [...TILBUD_FALLBACK_JOBBTYPER]
}
