export interface GenererTilbudInput {
  kundeNavn: string
  jobbBeskrivelse: string
  prisEksMva: number
  firmanavn: string
  adresse?: string
  fagkategori?: string
  tjeneste?: string
  timepris?: number
  materialPaslag?: number
  materialpaslagProsent?: number
  telefon?: string
  kundeTelefon?: string
  epost?: string
  kundeEpost?: string
  timer?: number
  materialkostnad?: number
  dagensdato?: string
  justeringer?: string
  behandleSomUtkastUtenTekstanalyse?: boolean
}

export interface GenererTilbudResponse {
  tekst: string
}

export interface SendTilbudEpostInput {
  tilEpost: string
  kundeNavn: string
  firmanavn: string
  generertTekst: string
  prisEksMva: number
  tilbudId: string
  firmaTelefon?: string | null
  firmaEpost?: string | null
}

export interface SendPaminnelseEpostInput extends SendTilbudEpostInput {
  erSiste?: boolean
}

export interface SendEpostResponse {
  ok: true
}

export interface OppsummerJusteringRequest {
  tilbudId: string
  kundeJustering: string
  jobbBeskrivelse?: string
}

export interface OppsummerJusteringResponse {
  oppsummering: string
}

export interface AppErrorResponse {
  error: string
}

export interface OpprettUtfortSnapshotInput {
  tilbudId: string
}

export interface HentUtfortSnapshotInput {
  tilbudId: string
}

export interface EksporterUtfortPdfInput {
  tilbudId: string
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

export interface UtfortSnapshotResponse {
  snapshot: UtfortOppdragSnapshot
}

export interface EksporterUtfortPdfResponse {
  ok: true
  sentTo: string
}
