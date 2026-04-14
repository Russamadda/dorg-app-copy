import type { Forespørsel } from '../types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Én felles modell: badge = nåværende fase, subline = relativ tid, farger til liste/kort. */
export type TilbudStatusMeta = {
  badge: string
  /** Bakoverkompatibel med kode som forventet ett `label`-felt (samme som badge). */
  label: string
  subline: string | null
  color: string
  dotColor: string
  dotCheckmark?: boolean
}

type TilbudHistorikkRad = {
  label: string
  verdi: string
}

function startPåDag(dato: Date) {
  const kopi = new Date(dato)
  kopi.setHours(0, 0, 0, 0)
  return kopi
}

function dagerMellom(fra: Date, til: Date) {
  return Math.floor((startPåDag(til).getTime() - startPåDag(fra).getTime()) / MS_PER_DAY)
}

function formaterLangDato(dato: Date) {
  return dato.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "i dag" | "i går" | "for N dager siden" */
export function relativTidsdel(datoIso: string, now: Date): string {
  const d = new Date(datoIso)
  if (Number.isNaN(d.getTime())) return ''
  const dager = Math.max(0, dagerMellom(d, now))
  if (dager === 0) return 'i dag'
  if (dager === 1) return 'i går'
  return `for ${dager} dager siden`
}

function medPrefiks(prefiks: string, datoIso: string | undefined, now: Date): string | null {
  if (!datoIso) return null
  const del = relativTidsdel(datoIso, now)
  if (!del) return null
  return `${prefiks} ${del}`
}

function hentAktivSendtDato(tilbud: Forespørsel) {
  return (
    tilbud.sistSendtDato ??
    tilbud.sendtDato ??
    tilbud.forsteSendtDato ??
    tilbud.opprettetDato
  )
}

function hentPaminnelser(tilbud: Forespørsel) {
  const fraStatus =
    tilbud.status === 'siste_paminnelse_sendt'
      ? 2
      : tilbud.status === 'paminnelse_sendt'
        ? 1
        : 0

  const fraDatoer =
    (tilbud.forstePaminnelseSendtDato || tilbud.forstePaminnelseDato ? 1 : 0) +
    (tilbud.sistePaminnelseSendtDato || tilbud.sistePaminnelseDato ? 1 : 0)

  return Math.max(tilbud.antallPaminnelser ?? 0, fraStatus, fraDatoer)
}

/** Minst ett nytt send etter første (versjon eller to ulike sendt-datoer). */
export function erOppdatertTilbudSendt(tilbud: Forespørsel): boolean {
  if ((tilbud.versjon ?? 1) > 1) return true
  const f = tilbud.forsteSendtDato
  const s = tilbud.sistSendtDato ?? tilbud.sendtDato
  if (f && s && f !== s) return true
  return false
}

function meta(
  badge: string,
  subline: string | null,
  color: string,
  dotColor: string,
  dotCheckmark?: boolean
): TilbudStatusMeta {
  return { badge, label: badge, subline, color, dotColor, dotCheckmark }
}

/**
 * Badge = kort nåværende fase (ingen relativ tid i badge).
 * Subline = når noe sist inntraff (forutsigbart under badge / i kort).
 */
export function getTilbudStatusPresentasjon(tilbud: Forespørsel, now = new Date()): TilbudStatusMeta {
  if (tilbud.status === 'utkast') {
    return meta('Utkast', null, '#AEB6C2', '#4ADE80')
  }

  if (tilbud.status === 'avventer') {
    return meta(
      'Avventer',
      medPrefiks('Mottatt', tilbud.opprettetDato, now),
      '#B8860B',
      '#B8860B'
    )
  }

  if (tilbud.status === 'godkjent') {
    return meta(
      'Godkjent',
      medPrefiks('Godkjent', tilbud.godkjentDato, now),
      '#2D7A4F',
      '#2D7A4F',
      true
    )
  }

  if (tilbud.status === 'utfort') {
    const datoKilde = tilbud.sistOppdatertDato ?? tilbud.godkjentDato
    return meta(
      'Utført',
      datoKilde ? medPrefiks('Utført', datoKilde, now) : null,
      '#2D7A4F',
      '#2D7A4F',
      true
    )
  }

  if (tilbud.status === 'avslatt') {
    return meta(
      'Avslått',
      medPrefiks('Avslått', tilbud.avslattDato, now),
      '#888888',
      '#888888'
    )
  }

  if (tilbud.status === 'justering') {
    return meta(
      'Justering mottatt',
      medPrefiks('Justering mottatt', tilbud.justeringOnsketDato, now),
      '#4B7BFF',
      '#4B7BFF'
    )
  }

  const paminnelser = hentPaminnelser(tilbud)
  if (paminnelser >= 2 || tilbud.status === 'siste_paminnelse_sendt') {
    const d =
      tilbud.sistePaminnelseSendtDato ??
      tilbud.sistePaminnelseDato ??
      tilbud.forstePaminnelseSendtDato ??
      tilbud.forstePaminnelseDato
    return meta(
      'Siste påminnelse sendt',
      d ? medPrefiks('Siste påminnelse sendt', d, now) : null,
      '#C46A1A',
      '#C46A1A'
    )
  }

  if (paminnelser >= 1 || tilbud.status === 'paminnelse_sendt') {
    const d = tilbud.forstePaminnelseSendtDato ?? tilbud.forstePaminnelseDato
    return meta(
      'Påminnelse sendt',
      d ? medPrefiks('Påminnelse sendt', d, now) : null,
      '#D2A13B',
      '#D2A13B'
    )
  }

  const sendtDato = hentAktivSendtDato(tilbud)
  const dagerSidenSendt = Math.max(0, dagerMellom(new Date(sendtDato), now))

  const oppdatert = erOppdatertTilbudSendt(tilbud)
  const sistSendtForSubline = tilbud.sistSendtDato ?? tilbud.sendtDato ?? sendtDato

  if (oppdatert) {
    const m = meta(
      'Oppdatert tilbud sendt',
      medPrefiks('Oppdatert tilbud sendt', sistSendtForSubline, now),
      '#AEB6C2',
      '#48C774'
    )
    if (dagerSidenSendt > 7) {
      return { ...m, color: '#E04040', dotColor: '#E04040' }
    }
    return m
  }

  const m = meta(
    'Sendt',
    medPrefiks('Sendt', sendtDato, now),
    '#AEB6C2',
    '#48C774'
  )
  if (dagerSidenSendt > 7) {
    return { ...m, color: '#E04040', dotColor: '#E04040' }
  }
  return m
}

/** @alias getTilbudStatusPresentasjon */
export function getTilbudKortStatus(tilbud: Forespørsel, now = new Date()): TilbudStatusMeta {
  return getTilbudStatusPresentasjon(tilbud, now)
}

export function getTilbudHistorikk(tilbud: Forespørsel): TilbudHistorikkRad[] {
  const p = getTilbudStatusPresentasjon(tilbud)
  const historikk: TilbudHistorikkRad[] = [
    {
      label: 'Status',
      verdi: p.subline ? `${p.badge} · ${p.subline}` : p.badge,
    },
  ]

  if (tilbud.forsteSendtDato) {
    historikk.push({
      label: 'Tilbud sendt',
      verdi: formaterLangDato(new Date(tilbud.forsteSendtDato)),
    })
  }

  if (tilbud.forstePaminnelseSendtDato || tilbud.forstePaminnelseDato) {
    historikk.push({
      label: 'Påminnelse sendt',
      verdi: formaterLangDato(
        new Date(tilbud.forstePaminnelseSendtDato ?? tilbud.forstePaminnelseDato!)
      ),
    })
  }

  if (tilbud.sistePaminnelseSendtDato || tilbud.sistePaminnelseDato) {
    historikk.push({
      label: 'Siste påminnelse sendt',
      verdi: formaterLangDato(
        new Date(tilbud.sistePaminnelseSendtDato ?? tilbud.sistePaminnelseDato!)
      ),
    })
  }

  if (tilbud.justeringOnsketDato) {
    historikk.push({
      label: 'Kunde ba om justering',
      verdi: formaterLangDato(new Date(tilbud.justeringOnsketDato)),
    })
  }

  if (tilbud.sistSendtDato && tilbud.forsteSendtDato && tilbud.sistSendtDato !== tilbud.forsteSendtDato) {
    historikk.push({
      label: 'Oppdatert tilbud sendt',
      verdi: formaterLangDato(new Date(tilbud.sistSendtDato)),
    })
  }

  if (tilbud.godkjentDato) {
    historikk.push({
      label: 'Tilbud godkjent',
      verdi: formaterLangDato(new Date(tilbud.godkjentDato)),
    })
  }

  if (tilbud.avslattDato) {
    historikk.push({
      label: 'Tilbud avslått',
      verdi: formaterLangDato(new Date(tilbud.avslattDato)),
    })
  }

  return historikk
}
