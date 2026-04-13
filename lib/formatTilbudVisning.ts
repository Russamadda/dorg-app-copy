/**
 * Visning av estimert tid — to varianter brukt i ulike skjermer (bevisst forskjellig ordlyd).
 */

/** Nytt tilbud: forhåndsvisning / metadata — «1 time» for eksakt 1. */
export function formatTimerOversiktNyttTilbud(v: number): string {
  if (v === 1) return '1 time'
  return `${v.toLocaleString('nb-NO')} timer`
}

/** Tilbud detaljer / intern oppsummering — 0 timer, heltall, ellers lokalisert desimal. */
export function formatTimerOversiktStandard(timer: number): string {
  if (timer <= 0) return '0 timer'
  if (timer % 1 === 0) return `${timer} timer`
  return `${timer.toLocaleString('nb-NO')} timer`
}
