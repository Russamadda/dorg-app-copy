import type { Firma } from '../types'

const PLACEHOLDER_FIRMANAVN = 'Min bedrift'

/**
 * Onboarding er fullført når kjerneoppsett for tilbud er på plass:
 * ekte firmanavn (ikke standardplassholder), kategori, minst én tjeneste,
 * timepris > 0 og materialpåslag satt (0 % er gyldig).
 */
export function erFirmaOppsettFullfort(firma: Firma | null): boolean {
  const navn = firma?.firmanavn?.trim() ?? ''
  if (!navn || navn === PLACEHOLDER_FIRMANAVN) return false
  if (!firma?.fagkategori?.trim()) return false
  if ((firma.tjenester?.length ?? 0) < 1) return false
  const tp = firma.timepris
  if (tp == null || tp <= 0) return false
  if (firma.materialPaslag == null) return false
  return true
}
