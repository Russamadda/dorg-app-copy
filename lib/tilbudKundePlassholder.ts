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
    .replace(/\bTil:\s*Kunde\b/g, `Til: ${kundeNavnTrimmet}`)
    .replace(/\bHei Kunde!\b/g, `Hei ${fornavn}!`)
    .replace(/\bHei Kunde,\b/g, `Hei ${fornavn},`)
}
