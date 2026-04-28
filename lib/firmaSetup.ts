import type { Firma } from '../types'

const PLACEHOLDER_FIRMANAVN = 'Min bedrift'

type AuthMetadata = Record<string, unknown> | null | undefined

function harTekstverdi(verdi?: string | null): boolean {
  return Boolean(verdi?.trim())
}

function hentMetadataTekst(metadata: AuthMetadata, nøkler: string[]): string {
  if (!metadata) return ''

  for (const nøkkel of nøkler) {
    const verdi = metadata[nøkkel]
    if (typeof verdi === 'string' && verdi.trim()) {
      return verdi.trim()
    }
  }

  return ''
}

export function hentFirmanavnFraAuthMetadata(metadata: AuthMetadata): string {
  return hentMetadataTekst(metadata, [
    'company_name',
    'companyName',
    'firmanavn',
    'firma_navn',
    'business_name',
    'businessName',
  ])
}

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

export function erMinimumFirmaprofilFullfort(firma: Firma | null): boolean {
  if (!erFirmaOppsettFullfort(firma)) return false
  if (!harTekstverdi(firma?.adresse)) return false
  if (!harTekstverdi(firma?.telefon)) return false
  if (!harTekstverdi(firma?.epost)) return false
  return true
}
