import type { Firma } from '../../types'

const PLACEHOLDER_FIRMANAVN = 'Min bedrift'

/** Første steg brukeren bør stå på ut fra lagret firma (1–5). */
export function deriveOnboardingStep(firma: Firma | null): 1 | 2 | 3 | 4 | 5 {
  if (!firma) return 1
  const navn = firma.firmanavn?.trim() ?? ''
  if (!navn || navn === PLACEHOLDER_FIRMANAVN) return 1
  if (!firma.fagkategori?.trim()) return 2
  if ((firma.tjenester?.length ?? 0) < 1) return 3
  if (firma.timepris == null || firma.timepris <= 0 || firma.materialPaslag == null) return 4
  return 5
}
