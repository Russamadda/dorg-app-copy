/**
 * Navn som sendes til AI når kunden ikke er kjent ennå (genereringsfase).
 * Ved sending erstattes typiske formuleringer med ekte kundenavn.
 */
export const TILBUD_KUNDE_PLASSHOLDER_NAVN = 'Kunde'

export function tilbudTekstMedKundenavn(
  tekst: string,
  kundeNavnTrimmet: string
): string {
  if (!kundeNavnTrimmet) return tekst
  const fornavn = kundeNavnTrimmet.split(/\s+/)[0] ?? kundeNavnTrimmet

  return tekst
    .replace(/\bTil:\s*Kunde\b/gi, `Til: ${kundeNavnTrimmet}`)
    .replace(/\bHei\s+Kunde\s*!/gi, `Hei ${fornavn}!`)
    .replace(/\bHei\s+Kunde\s*,/gi, `Hei ${fornavn},`)
    .replace(/\bHei\s+Kunde\b/gi, `Hei ${fornavn}`)
}
