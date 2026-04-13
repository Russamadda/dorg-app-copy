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
