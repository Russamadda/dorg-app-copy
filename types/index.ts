export interface Forespørsel {
  id: string
  kundeNavn: string
  kundeEpost: string
  jobbBeskrivelse: string
  prisEksMva: number
  status: 'avventer' | 'sendt' | 'godkjent' | 'avslatt'
  opprettetDato: string
  generertTekst?: string
  firmaId: string
  jobbType?: string
}

export interface Firma {
  id: string
  userId: string
  firmanavn: string
  orgNummer?: string
  telefon?: string
  epost?: string
  adresse?: string
  poststed?: string
  logoUrl?: string
  timepris?: number
  materialPaslag?: number
}

export interface Prishistorikk {
  id: string
  firmaId: string
  oppdrag: string
  timepris: number
  materialer: number
  total: number
  dato: string
}
