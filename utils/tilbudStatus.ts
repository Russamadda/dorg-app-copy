import type { Forespørsel } from '../types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

type TilbudStatusMeta = {
  label: string
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

export function getTilbudKortStatus(tilbud: Forespørsel, now = new Date()): TilbudStatusMeta {
  if (tilbud.status === 'utkast') {
    return { label: 'Utkast', color: '#AEB6C2', dotColor: '#4ADE80' }
  }

  if (tilbud.status === 'avventer') {
    return { label: 'Avventer', color: '#B8860B', dotColor: '#B8860B' }
  }

  if (tilbud.status === 'godkjent') {
    return { label: 'Godkjent', color: '#2D7A4F', dotColor: '#2D7A4F', dotCheckmark: true }
  }

  if (tilbud.status === 'utfort') {
    return { label: 'Utført', color: '#2D7A4F', dotColor: '#2D7A4F', dotCheckmark: true }
  }

  if (tilbud.status === 'avslatt') {
    return { label: 'Avslått', color: '#888888', dotColor: '#888888' }
  }

  if (tilbud.status === 'justering') {
    return { label: 'Kunden ønsker justering', color: '#4B7BFF', dotColor: '#4B7BFF' }
  }

  const paminnelser = hentPaminnelser(tilbud)
  if (paminnelser >= 2 || tilbud.status === 'siste_paminnelse_sendt') {
    return { label: 'Siste påminnelse sendt', color: '#C46A1A', dotColor: '#C46A1A' }
  }

  if (paminnelser >= 1 || tilbud.status === 'paminnelse_sendt') {
    return { label: 'Påminnelse sendt', color: '#D2A13B', dotColor: '#D2A13B' }
  }

  const dagerSidenSendt = Math.max(0, dagerMellom(new Date(hentAktivSendtDato(tilbud)), now))

  if (dagerSidenSendt > 7) {
    return { label: 'Kontakt kunde', color: '#E04040', dotColor: '#E04040' }
  }

  if (dagerSidenSendt === 0) {
    return { label: 'Sendt i dag', color: '#AEB6C2', dotColor: '#48C774' }
  }

  if (dagerSidenSendt === 1) {
    return { label: 'Sendt i går', color: '#AEB6C2', dotColor: '#48C774' }
  }

  return {
    label: `Sendt for ${dagerSidenSendt} dager siden`,
    color: '#AEB6C2',
    dotColor: '#48C774',
  }
}

export function getTilbudHistorikk(tilbud: Forespørsel): TilbudHistorikkRad[] {
  const historikk: TilbudHistorikkRad[] = [
    {
      label: 'Status',
      verdi: getTilbudKortStatus(tilbud).label,
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
      label: 'Nytt tilbud sendt',
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
