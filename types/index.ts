export type TilbudStatus =
  | 'avventer'
  | 'utkast'
  | 'sendt'
  | 'paminnelse_sendt'
  | 'siste_paminnelse_sendt'
  | 'godkjent'
  | 'utfort'
  | 'avslatt'
  | 'justering'

export type TilbudDraftStage = 'builder' | 'preview'

export type LegacyTilbudStatus = TilbudStatus | 'paminnelse' | 'siste'

export type TilbudHendelseType =
  | 'tilbud_sendt'
  | 'nytt_tilbud_sendt'
  | 'justering_forespurt'
  | 'paminnelse_sendt'
  | 'siste_paminnelse_sendt'
  | 'godkjent'
  | 'utfort'
  | 'avslatt'

export interface TilbudHendelse {
  id: string
  tilbudId: string
  firmaId: string
  hendelseType: TilbudHendelseType
  tittel: string
  beskrivelse?: string | null
  metadata?: Record<string, unknown>
  opprettetDato: string
}

export interface Forespørsel {
  id: string
  kundeNavn: string
  kundeEpost: string
  kundeTelefon?: string
  jobbBeskrivelse: string
  kortBeskrivelse?: string
  adresse?: string
  prisEksMva: number
  timer?: number
  materialkostnad?: number
  status: TilbudStatus
  /** Kjent bare for rader med status utkast (Supabase draft_stage). */
  draftStage?: TilbudDraftStage | null
  opprettetDato: string
  generertTekst?: string
  kundeJustering?: string | null
  aiOppsummering?: string | null
  firmaId: string
  jobbType?: string
  antallPaminnelser?: number
  sendtDato?: string
  forstePaminnelseDato?: string
  sistePaminnelseDato?: string
  sistOppdatertDato?: string
  forsteSendtDato?: string
  sistSendtDato?: string
  forstePaminnelseSendtDato?: string
  sistePaminnelseSendtDato?: string
  godkjentDato?: string
  avslattDato?: string
  justeringOnsketDato?: string
  versjon?: number
  settSomLest?: boolean
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
  fagkategori?: string | null
  tjenester?: string[]
  aktiveTjenester?: string[]
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

export interface UtfortMateriallinje {
  id: string
  materialId?: string | null
  navn: string
  enhet: string
  antall: number
  prisPerEnhet: number
  linjeTotal: number
}

export interface UtfortPrisgrunnlag {
  prisEksMva: number
  timer: number
  materialkostnad: number
  timepris: number
  materialPaslag: number
}

export interface UtfortSummaryData {
  arbeidEksMva: number
  materialerEksMva: number
  totalEksMva: number
  arbeidInklMva: number
  materialerInklMva: number
  totalInklMva: number
}

export interface UtfortOppdragSnapshot {
  id: string
  tilbudId: string
  firmaId: string
  firmanavn: string
  firmaOrgNummer?: string | null
  firmaEpost?: string | null
  firmaTelefon?: string | null
  firmaAdresse?: string | null
  kundeNavn: string
  kundeEpost?: string | null
  kundeTelefon?: string | null
  kundeAdresse?: string | null
  jobbBeskrivelse?: string | null
  kortBeskrivelse?: string | null
  jobbType?: string | null
  tilbudstekst?: string | null
  timer: number
  materialkostnad: number
  prisEksMva: number
  prisgrunnlag: UtfortPrisgrunnlag
  materialspesifikasjon: UtfortMateriallinje[]
  summaryData: UtfortSummaryData
  utfortDato: string
  opprettetDato: string
  sistOppdatertDato: string
}
