import type { Firma } from '../../types'

const PLACEHOLDER_FIRMANAVN = 'Min bedrift'

export function deriveOnboardingStep(firma: Firma | null): 1 | 2 | 3 | 4 {
  if (!firma) return 1

  const navn = firma.firmanavn?.trim() ?? ''
  if (!navn || navn === PLACEHOLDER_FIRMANAVN || !firma.fagkategori?.trim()) {
    return 1
  }

  if ((firma.tjenester?.length ?? 0) < 1) {
    return 2
  }

  if (firma.timepris == null || firma.timepris <= 0 || firma.materialPaslag == null) {
    return 3
  }

  return 4
}
