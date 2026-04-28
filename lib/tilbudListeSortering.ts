import type { Forespørsel } from '../types'

/**
 * Nyeste relevante tidspunkt for sortering (utkast som sendes beholder gammel `opprettetDato`,
 * men får `sistSendtDato` / `sendtDato` ved sending — da skal den ligge øverst).
 */
export function hentTilbudSorteringsTidsstempel(t: Forespørsel): number {
  const datoer: string[] = [
    t.godkjentDato,
    t.avslattDato,
    t.justeringOnsketDato,
    t.sistSendtDato,
    t.sendtDato,
    t.forsteSendtDato,
    t.sistOppdatertDato,
    t.opprettetDato,
  ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0)

  let maxMs = 0
  for (const s of datoer) {
    const ms = new Date(s).getTime()
    if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms
  }
  return maxMs
}

/** Avsluttede tilbud sist i listen; ellers synkende aktivitet (nyeste øverst). */
export function sorterTilbudForSendtListe(a: Forespørsel, b: Forespørsel): number {
  const erAvsluttet = (status: Forespørsel['status']) =>
    status === 'godkjent' || status === 'utfort' || status === 'avslatt'

  const aAv = erAvsluttet(a.status)
  const bAv = erAvsluttet(b.status)
  if (aAv !== bAv) {
    return aAv ? 1 : -1
  }

  return hentTilbudSorteringsTidsstempel(b) - hentTilbudSorteringsTidsstempel(a)
}

function hentGodkjentSorteringsTidsstempel(t: Forespørsel): number {
  const datoer = [
    t.godkjentDato,
    t.sistOppdatertDato,
    t.sistSendtDato,
    t.sendtDato,
    t.opprettetDato,
  ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0)

  for (const dato of datoer) {
    const ms = new Date(dato).getTime()
    if (!Number.isNaN(ms)) return ms
  }

  return 0
}

/** Godkjent-filteret skal prioritere nyeste godkjenning, ikke generell sendeliste-gruppering. */
export function sorterGodkjenteTilbudNyestFørst(a: Forespørsel, b: Forespørsel): number {
  return hentGodkjentSorteringsTidsstempel(b) - hentGodkjentSorteringsTidsstempel(a)
}
