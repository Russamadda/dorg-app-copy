import type { Forespørsel } from '../types'

/** Tidspunkt som brukes til å avgjøre om kategori-prikk skal vises etter siste besøk i filteret. */
export function hentPillTriggerMs(t: Forespørsel, kategori: 'justering' | 'godkjent'): number {
  const raw =
    kategori === 'justering'
      ? t.justeringOnsketDato ?? t.sistOppdatertDato ?? t.sistSendtDato ?? t.opprettetDato
      : t.godkjentDato ?? t.sistOppdatertDato ?? t.sistSendtDato ?? t.opprettetDato
  const ms = raw ? Date.parse(raw) : NaN
  return Number.isFinite(ms) ? ms : 0
}

export function skalVisePillJustering(liste: Forespørsel[], justeringAckAt: number): boolean {
  return liste.some(
    t => t.status === 'justering' && hentPillTriggerMs(t, 'justering') > justeringAckAt
  )
}

export function skalVisePillGodkjent(liste: Forespørsel[], godkjentAckAt: number): boolean {
  return liste.some(
    t => t.status === 'godkjent' && hentPillTriggerMs(t, 'godkjent') > godkjentAckAt
  )
}

export function antallUhandterteJusteringer(liste: Forespørsel[]): number {
  return liste.filter(t => t.status === 'justering').length
}

export function antallUhandterteGodkjente(liste: Forespørsel[]): number {
  return liste.filter(t => t.status === 'godkjent').length
}

export function antallKreverHandling(liste: Forespørsel[]): number {
  return antallUhandterteJusteringer(liste) + antallUhandterteGodkjente(liste)
}

/** Kort med puls/kant så lenge status er justering eller godkjent (til utført / nytt sendt). */
export function tilbudTrengerHandlingGlow(t: Forespørsel): boolean {
  return t.status === 'justering' || t.status === 'godkjent'
}

export function byggHandlingSjefHint(liste: Forespørsel[]): string | null {
  const j = antallUhandterteJusteringer(liste)
  const g = antallUhandterteGodkjente(liste)
  if (j > 0 && g > 0) {
    return `Du har ${j} tilbud i justering og ${g} godkjente — ta en titt når du kan.`
  }
  if (j > 0) {
    return j === 1
      ? 'Du har en justeringsforespørsel fra kunde som trenger oppfølging.'
      : `Du har ${j} justeringer fra kunde som trenger oppfølging.`
  }
  if (g > 0) {
    return g === 1
      ? 'Du har et godkjent tilbud — husk å markere utført når jobben er ferdig.'
      : `Du har ${g} godkjente tilbud — husk å markere utført når oppdragene er ferdige.`
  }
  return null
}
