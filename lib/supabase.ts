import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type Session } from '@supabase/supabase-js'
import { clearCachedFirma } from './firmaCache'
import { byggMaterialSpesifiseringRad, type MaterialSpesifiseringRad } from './materialSpesifisering'
import type {
  Forespørsel,
  Firma,
  LegacyTilbudStatus,
  Prishistorikk,
  TilbudDraftStage,
  TilbudHendelse,
  TilbudHendelseType,
  TilbudStatus,
} from '../types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

function erUgyldigRefreshTokenFeil(melding?: string | null): boolean {
  const normalisert = melding?.toLowerCase() ?? ''
  return (
    normalisert.includes('invalid refresh token') ||
    normalisert.includes('refresh token not found') ||
    normalisert.includes('refresh_token_not_found')
  )
}

export async function tømLokalAuthSession(): Promise<void> {
  clearCachedFirma()
  await supabase.auth.signOut({ scope: 'local' })
}

/**
 * Hent persistert session (inkl. stille refresh når access token er utløpt).
 * Ved ugyldig eller slettet refresh token: tømmer lokalt lager og returnerer null.
 */
export async function hentLokalAuthSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    if (erUgyldigRefreshTokenFeil(error.message)) {
      console.info('[auth] Ugyldig lokal refresh token. Tømmer lokal session.')
    }
    await tømLokalAuthSession()
    return null
  }
  return session ?? null
}

type SupabaseFeilLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

type TilbudRad = {
  id: string
  firma_id: string | null
  kunde_navn: string
  kunde_epost: string
  kunde_telefon?: string | null
  jobb_beskrivelse: string
  kort_beskrivelse?: string | null
  adresse?: string | null
  pris_eks_mva: number
  timer?: number | null
  materialkostnad?: number | null
  status: LegacyTilbudStatus | null
  opprettet_dato: string
  generert_tekst: string | null
  jobb_type?: string | null
  kunde_justering?: string | null
  ai_oppsummering?: string | null
  antall_paminnelser?: number | null
  sendt_dato?: string | null
  forste_paminnelse_dato?: string | null
  siste_paminnelse_dato?: string | null
  sist_oppdatert_dato?: string | null
  forste_sendt_dato?: string | null
  sist_sendt_dato?: string | null
  forste_paminnelse_sendt_dato?: string | null
  siste_paminnelse_sendt_dato?: string | null
  godkjent_dato?: string | null
  avslatt_dato?: string | null
  justering_onsket_dato?: string | null
  versjon?: number | null
  sett_som_lest?: boolean | null
  draft_stage?: string | null
}

type TilbudHendelseRad = {
  id: string
  tilbud_id: string
  firma_id: string
  hendelse_type: string
  tittel: string
  beskrivelse?: string | null
  metadata?: Record<string, unknown> | null
  opprettet_dato: string
}

type FirmaRad = {
  id: string
  user_id: string
  firmanavn: string
  org_nummer: string | null
  telefon: string | null
  epost: string | null
  adresse: string | null
  poststed: string | null
  logo_url: string | null
  timepris: number | null
  material_paslag: number | null
  fagkategori?: string | null
  tjenester?: string[] | null
  aktive_tjenester?: string[] | null
}

type PrishistorikkRad = {
  id: string
  firma_id: string
  oppdrag: string
  timepris: number
  materialer: number
  total: number
  dato: string
}

type TilbudHendelsePayload = {
  tilbudId: string
  firmaId: string
  hendelseType: TilbudHendelseType
  tittel: string
  beskrivelse?: string | null
  metadata?: Record<string, unknown>
  opprettetDato?: string
}

type HendelseRegistreringParams = {
  tilbudId: string
  firmaId: string
  opprettetDato?: string
  metadata?: Record<string, unknown>
  beskrivelse?: string | null
}

const TILBUD_VALGFRIE_KOLONNER = [
  'kunde_telefon',
  'antall_paminnelser',
  'sendt_dato',
  'forste_paminnelse_dato',
  'siste_paminnelse_dato',
  'sist_oppdatert_dato',
  'forste_sendt_dato',
  'sist_sendt_dato',
  'forste_paminnelse_sendt_dato',
  'siste_paminnelse_sendt_dato',
  'godkjent_dato',
  'avslatt_dato',
  'justering_onsket_dato',
  'versjon',
  'sett_som_lest',
]

export function normaliserTilbudStatus(status: string | null | undefined): TilbudStatus {
  switch (status) {
    case 'utkast':
      return 'utkast'
    case 'sendt':
    case 'justering':
    case 'godkjent':
    case 'utfort':
    case 'avslatt':
    case 'avventer':
      return status
    case 'paminnelse':
    case 'paminnelse_sendt':
      return 'paminnelse_sendt'
    case 'siste':
    case 'siste_paminnelse_sendt':
      return 'siste_paminnelse_sendt'
    default:
      return 'avventer'
  }
}

function fraForespørselRad(rad: TilbudRad): Forespørsel {
  const status = normaliserTilbudStatus(rad.status)
  const forsteSendtDato =
    rad.forste_sendt_dato ??
    (status !== 'avventer' && status !== 'utkast' ? rad.opprettet_dato : undefined)
  const sistSendtDato = rad.sist_sendt_dato ?? rad.sendt_dato ?? undefined
  const forstePaminnelseSendtDato =
    rad.forste_paminnelse_sendt_dato ?? rad.forste_paminnelse_dato ?? undefined
  const sistePaminnelseSendtDato =
    rad.siste_paminnelse_sendt_dato ?? rad.siste_paminnelse_dato ?? undefined

  return {
    id: rad.id,
    kundeNavn: rad.kunde_navn,
    kundeEpost: rad.kunde_epost,
    kundeTelefon: rad.kunde_telefon ?? undefined,
    jobbBeskrivelse: rad.jobb_beskrivelse,
    kortBeskrivelse: rad.kort_beskrivelse ?? undefined,
    adresse: rad.adresse ?? undefined,
    prisEksMva: Number(rad.pris_eks_mva),
    timer: rad.timer ?? 0,
    materialkostnad: rad.materialkostnad ?? 0,
    status,
    opprettetDato: rad.opprettet_dato,
    generertTekst: rad.generert_tekst ?? undefined,
    kundeJustering: rad.kunde_justering ?? null,
    aiOppsummering: rad.ai_oppsummering ?? null,
    firmaId: rad.firma_id ?? '',
    jobbType: rad.jobb_type ?? undefined,
    antallPaminnelser: rad.antall_paminnelser ?? 0,
    sendtDato: sistSendtDato,
    forstePaminnelseDato: forstePaminnelseSendtDato,
    sistePaminnelseDato: sistePaminnelseSendtDato,
    sistOppdatertDato: rad.sist_oppdatert_dato ?? undefined,
    forsteSendtDato,
    sistSendtDato,
    forstePaminnelseSendtDato,
    sistePaminnelseSendtDato,
    godkjentDato: rad.godkjent_dato ?? undefined,
    avslattDato: rad.avslatt_dato ?? undefined,
    justeringOnsketDato: rad.justering_onsket_dato ?? undefined,
    versjon: rad.versjon ?? 1,
    settSomLest: rad.sett_som_lest ?? false,
    draftStage:
      rad.draft_stage === 'builder' || rad.draft_stage === 'preview'
        ? rad.draft_stage
        : null,
  }
}

function fraTilbudHendelseRad(rad: TilbudHendelseRad): TilbudHendelse {
  return {
    id: rad.id,
    tilbudId: rad.tilbud_id,
    firmaId: rad.firma_id,
    hendelseType: rad.hendelse_type as TilbudHendelseType,
    tittel: rad.tittel,
    beskrivelse: rad.beskrivelse ?? null,
    metadata: rad.metadata ?? {},
    opprettetDato: rad.opprettet_dato,
  }
}

function fraFirmaRad(rad: FirmaRad): Firma {
  return {
    id: rad.id,
    userId: rad.user_id,
    firmanavn: rad.firmanavn,
    orgNummer: rad.org_nummer ?? undefined,
    telefon: rad.telefon ?? undefined,
    epost: rad.epost ?? undefined,
    adresse: rad.adresse ?? undefined,
    poststed: rad.poststed ?? undefined,
    logoUrl: rad.logo_url ?? undefined,
    timepris: rad.timepris ?? undefined,
    materialPaslag: rad.material_paslag ?? undefined,
    fagkategori: rad.fagkategori ?? null,
    tjenester: rad.tjenester ?? [],
    aktiveTjenester: rad.aktive_tjenester ?? undefined,
  }
}

function fraPrishistorikkRad(rad: PrishistorikkRad): Prishistorikk {
  return {
    id: rad.id,
    firmaId: rad.firma_id,
    oppdrag: rad.oppdrag,
    timepris: rad.timepris,
    materialer: rad.materialer,
    total: rad.total,
    dato: rad.dato,
  }
}

function erManglendeKolonneFeil(error: SupabaseFeilLike | null, kolonne: string) {
  return error?.code === 'PGRST204' && error.message?.includes(`'${kolonne}'`) === true
}

function erManglendeTabellFeil(error: SupabaseFeilLike | null, tabell: string) {
  if (!error) return false

  const melding = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  const tabellnavn = tabell.toLowerCase()

  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (melding.includes(tabellnavn) &&
      (melding.includes('schema cache') ||
        melding.includes('could not find') ||
        melding.includes('relation')))
  )
}

async function oppdaterTilbudRadMedFallback(
  id: string,
  update: Record<string, unknown>,
  valgfrieKolonner: string[] = []
) {
  const payload: Record<string, unknown> = {
    ...update,
    sist_oppdatert_dato: update.sist_oppdatert_dato ?? new Date().toISOString(),
  }
  const gjenstaendeKolonner = Array.from(
    new Set([...TILBUD_VALGFRIE_KOLONNER, ...valgfrieKolonner])
  )

  while (true) {
    const { error } = await supabase.from('tilbud').update(payload).eq('id', id)

    if (!error) {
      return
    }

    const manglendeKolonne = gjenstaendeKolonner.find(kolonne =>
      erManglendeKolonneFeil(error, kolonne)
    )

    if (!manglendeKolonne) {
      throw error
    }

    delete payload[manglendeKolonne]
    const indeks = gjenstaendeKolonner.indexOf(manglendeKolonne)
    if (indeks !== -1) {
      gjenstaendeKolonner.splice(indeks, 1)
    }
  }
}

// Preferred model: persist communication history in tilbud_hendelser.
// Snapshot fields on tilbud are still updated so the app can fall back cleanly
// if the migration has not been applied everywhere yet.
async function opprettTilbudHendelse(payload: TilbudHendelsePayload) {
  const insertData = {
    tilbud_id: payload.tilbudId,
    firma_id: payload.firmaId,
    hendelse_type: payload.hendelseType,
    tittel: payload.tittel,
    beskrivelse: payload.beskrivelse ?? null,
    metadata: payload.metadata ?? {},
    opprettet_dato: payload.opprettetDato ?? new Date().toISOString(),
  }

  const { error } = await supabase.from('tilbud_hendelser').insert(insertData)

  if (!error) {
    return
  }

  if (erManglendeTabellFeil(error, 'tilbud_hendelser')) {
    console.warn('[supabase] tilbud_hendelser mangler, fortsetter med snapshot-only fallback')
    return
  }

  throw error
}

export async function hentTilbudHendelser(tilbudId: string): Promise<TilbudHendelse[]> {
  let result
  try {
    result = await supabase
      .from('tilbud_hendelser')
      .select('*')
      .eq('tilbud_id', tilbudId)
      .order('opprettet_dato', { ascending: true })
  } catch (error) {
    console.warn('[supabase] Kunne ikke hente tilbud_hendelser, bruker tom historikk', {
      tilbudId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }

  const { data, error } = result

  if (error) {
    if (erManglendeTabellFeil(error, 'tilbud_hendelser')) {
      return []
    }

    console.warn('[supabase] Kunne ikke hente tilbud_hendelser, bruker tom historikk', {
      tilbudId,
      error: error.message,
    })
    return []
  }

  return (data as TilbudHendelseRad[]).map(fraTilbudHendelseRad)
}

export async function oppdaterTilbudSnapshotUtenHendelse(
  id: string,
  update: Record<string, unknown>,
  valgfrieKolonner: string[] = []
) {
  await oppdaterTilbudRadMedFallback(id, update, valgfrieKolonner)
}

export async function registrerForsteTilbudSendt(
  params: HendelseRegistreringParams & {
    versjon?: number
  }
) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'sendt',
    forste_sendt_dato: opprettetDato,
    sist_sendt_dato: opprettetDato,
    sendt_dato: opprettetDato,
    antall_paminnelser: 0,
    forste_paminnelse_sendt_dato: null,
    siste_paminnelse_sendt_dato: null,
    forste_paminnelse_dato: null,
    siste_paminnelse_dato: null,
    // Når et tilbud (re)sendes skal det kunne trigge nye varsler senere.
    sett_som_lest: false,
    versjon: params.versjon ?? 1,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'tilbud_sendt',
    tittel: 'Tilbud sendt',
    beskrivelse: params.beskrivelse,
    metadata: {
      versjon: params.versjon ?? 1,
      ...(params.metadata ?? {}),
    },
    opprettetDato,
  })
}

export async function registrerNyttTilbudSendt(
  params: HendelseRegistreringParams & {
    versjon?: number
  }
) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()
  const nesteVersjon = Math.max(2, (params.versjon ?? 1) + 1)

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'sendt',
    sist_sendt_dato: opprettetDato,
    sendt_dato: opprettetDato,
    antall_paminnelser: 0,
    forste_paminnelse_sendt_dato: null,
    siste_paminnelse_sendt_dato: null,
    forste_paminnelse_dato: null,
    siste_paminnelse_dato: null,
    // Revisjon skal starte "rent" i appen/web, og kunne trigge nye varsler.
    sett_som_lest: false,
    kunde_justering: null,
    ai_oppsummering: null,
    justering_onsket_dato: null,
    versjon: nesteVersjon,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'nytt_tilbud_sendt',
    tittel: 'Nytt tilbud sendt',
    beskrivelse: params.beskrivelse,
    metadata: {
      versjon: nesteVersjon,
      ...(params.metadata ?? {}),
    },
    opprettetDato,
  })
}

export async function registrerJusteringForespurt(
  params: HendelseRegistreringParams & {
    kundeJustering?: string | null
    aiOppsummering?: string | null
  }
) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()

  const update: Record<string, unknown> = {
    status: 'justering',
    justering_onsket_dato: opprettetDato,
    sett_som_lest: false,
  }

  if (params.kundeJustering !== undefined) {
    update.kunde_justering = params.kundeJustering
  }

  if (params.aiOppsummering !== undefined) {
    update.ai_oppsummering = params.aiOppsummering
  }

  await oppdaterTilbudRadMedFallback(params.tilbudId, update)

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'justering_forespurt',
    tittel: 'Kunde ba om justering',
    beskrivelse: params.beskrivelse ?? params.kundeJustering ?? params.aiOppsummering ?? null,
    metadata: params.metadata,
    opprettetDato,
  })
}

export async function registrerForstePaminnelseSendt(
  params: HendelseRegistreringParams & {
    antallPaminnelser?: number
  }
) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()
  const nesteAntall = Math.max(1, params.antallPaminnelser ?? 0)

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'paminnelse_sendt',
    antall_paminnelser: nesteAntall,
    forste_paminnelse_sendt_dato: opprettetDato,
    forste_paminnelse_dato: opprettetDato,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'paminnelse_sendt',
    tittel: 'Påminnelse sendt',
    beskrivelse: params.beskrivelse,
    metadata: params.metadata,
    opprettetDato,
  })
}

export async function registrerSistePaminnelseSendt(
  params: HendelseRegistreringParams & {
    antallPaminnelser?: number
  }
) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()
  const nesteAntall = Math.max(2, params.antallPaminnelser ?? 0)

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'siste_paminnelse_sendt',
    antall_paminnelser: nesteAntall,
    siste_paminnelse_sendt_dato: opprettetDato,
    siste_paminnelse_dato: opprettetDato,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'siste_paminnelse_sendt',
    tittel: 'Siste påminnelse sendt',
    beskrivelse: params.beskrivelse,
    metadata: params.metadata,
    opprettetDato,
  })
}

export async function registrerTilbudGodkjent(params: HendelseRegistreringParams) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'godkjent',
    godkjent_dato: opprettetDato,
    sett_som_lest: false,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'godkjent',
    tittel: 'Tilbud godkjent',
    beskrivelse: params.beskrivelse,
    metadata: params.metadata,
    opprettetDato,
  })
}

export async function registrerTilbudAvslatt(params: HendelseRegistreringParams) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'avslatt',
    avslatt_dato: opprettetDato,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'avslatt',
    tittel: 'Tilbud avslått',
    beskrivelse: params.beskrivelse,
    metadata: params.metadata,
    opprettetDato,
  })
}

export async function registrerTilbudUtfort(params: HendelseRegistreringParams) {
  const opprettetDato = params.opprettetDato ?? new Date().toISOString()

  await oppdaterTilbudRadMedFallback(params.tilbudId, {
    status: 'utfort',
    sist_oppdatert_dato: opprettetDato,
  })

  await opprettTilbudHendelse({
    tilbudId: params.tilbudId,
    firmaId: params.firmaId,
    hendelseType: 'utfort',
    tittel: 'Markert som utført',
    beskrivelse: params.beskrivelse,
    metadata: params.metadata,
    opprettetDato,
  })
}

export async function hentForespørsler(firmaId: string): Promise<Forespørsel[]> {
  const { data, error } = await supabase
    .from('tilbud')
    .select('*')
    .eq('firma_id', firmaId)
    .eq('status', 'avventer')
    .order('opprettet_dato', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as TilbudRad[]).map(fraForespørselRad)
}

export async function hentUtkast(firmaId: string): Promise<Forespørsel[]> {
  const { data, error } = await supabase
    .from('tilbud')
    .select('*')
    .eq('firma_id', firmaId)
    .eq('status', 'utkast')
    .order('sist_oppdatert_dato', { ascending: false, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data as TilbudRad[]).map(fraForespørselRad)
}

export type LagreUtkastParams = {
  id?: string
  firmaId: string
  jobbType: string
  jobbBeskrivelse: string
  timer: number
  materialkostnad: number
  prisEksMva: number
  generertTekst: string | null
  draftStage: TilbudDraftStage
}

/**
 * Oppretter eller oppdaterer en rad med status utkast (én lagring ved bekreftet avslutning).
 */
export async function lagreTilbudUtkast(params: LagreUtkastParams): Promise<Forespørsel> {
  const now = new Date().toISOString()
  const kortBeskrivelse = params.jobbType

  if (params.id) {
    await oppdaterTilbudRadMedFallback(
      params.id,
      {
        jobb_beskrivelse: params.jobbBeskrivelse,
        jobb_type: params.jobbType,
        kort_beskrivelse: kortBeskrivelse,
        timer: params.timer,
        materialkostnad: params.materialkostnad,
        pris_eks_mva: params.prisEksMva,
        generert_tekst: params.generertTekst,
        status: 'utkast',
        draft_stage: params.draftStage,
        sist_oppdatert_dato: now,
      },
      ['draft_stage']
    )
    const { data, error } = await supabase.from('tilbud').select('*').eq('id', params.id).single()
    if (error) throw new Error(error.message)
    return fraForespørselRad(data as TilbudRad)
  }

  const { data: userData } = await supabase.auth.getUser()
  const { data: firmaData } = await supabase
    .from('firma')
    .select('id, firmanavn')
    .eq('user_id', userData.user?.id ?? '')
    .single()

  const oppstartsDato = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const gyldigTilDato = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const insertData: Record<string, unknown> = {
    firma_id: params.firmaId,
    kunde_navn: '',
    kunde_epost: '',
    jobb_beskrivelse: params.jobbBeskrivelse,
    kort_beskrivelse: kortBeskrivelse,
    pris_eks_mva: params.prisEksMva,
    timer: params.timer,
    materialkostnad: params.materialkostnad,
    status: 'utkast',
    draft_stage: params.draftStage,
    generert_tekst: params.generertTekst,
    jobb_type: params.jobbType,
    adresse: '',
    oppstarts_dato: oppstartsDato,
    gyldig_til_dato: gyldigTilDato,
    firmanavn: (firmaData as { firmanavn: string } | null)?.firmanavn ?? '',
    versjon: 1,
    sist_oppdatert_dato: now,
  }

  let valgfrie = ['draft_stage', 'kunde_telefon', 'versjon']

  let { data: inserted, error } = await supabase
    .from('tilbud')
    .insert(insertData)
    .select()
    .single()

  while (error) {
    const manglendeKolonne = valgfrie.find(kolonne =>
      erManglendeKolonneFeil(error, kolonne)
    )
    if (!manglendeKolonne) {
      console.error('[supabase] lagreTilbudUtkast insert:', error)
      throw error
    }
    delete insertData[manglendeKolonne]
    valgfrie = valgfrie.filter(k => k !== manglendeKolonne)
    ;({ data: inserted, error } = await supabase
      .from('tilbud')
      .insert(insertData)
      .select()
      .single())
  }

  return fraForespørselRad(inserted as TilbudRad)
}

export async function lagreForespørsel(
  data: Omit<Forespørsel, 'id' | 'opprettetDato'>
): Promise<Forespørsel> {
  const { data: userData } = await supabase.auth.getUser()

  const { data: firmaData } = await supabase
    .from('firma')
    .select('id, firmanavn')
    .eq('user_id', userData.user?.id ?? '')
    .single()

  const oppstartsDato = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const gyldigTilDato = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const telefon = data.kundeTelefon?.trim()

  const baseInsertData = {
    firma_id: data.firmaId,
    kunde_navn: data.kundeNavn,
    kunde_epost: data.kundeEpost,
    jobb_beskrivelse: data.jobbBeskrivelse,
    kort_beskrivelse: data.kortBeskrivelse ?? null,
    pris_eks_mva: data.prisEksMva,
    timer: data.timer ?? 0,
    materialkostnad: data.materialkostnad ?? 0,
    status: data.status ?? 'sendt',
    generert_tekst: data.generertTekst ?? null,
    jobb_type: data.jobbType ?? 'annet',
    adresse: data.adresse ?? '',
    oppstarts_dato: oppstartsDato,
    gyldig_til_dato: gyldigTilDato,
    firmanavn: (firmaData as { firmanavn: string } | null)?.firmanavn ?? '',
    versjon: data.versjon ?? 1,
  }

  const insertData = telefon
    ? {
        ...baseInsertData,
        kunde_telefon: telefon,
      }
    : baseInsertData

  let { data: inserted, error } = await supabase
    .from('tilbud')
    .insert(insertData)
    .select()
    .single()

  const valgfrieInsertKolonner = ['kunde_telefon', 'versjon']

  while (error) {
    const manglendeKolonne = valgfrieInsertKolonner.find(kolonne =>
      erManglendeKolonneFeil(error, kolonne)
    )

    if (!manglendeKolonne) {
      break
    }

    delete insertData[manglendeKolonne as keyof typeof insertData]
    const indeks = valgfrieInsertKolonner.indexOf(manglendeKolonne)
    if (indeks !== -1) {
      valgfrieInsertKolonner.splice(indeks, 1)
    }

    ;({ data: inserted, error } = await supabase
      .from('tilbud')
      .insert(insertData)
      .select()
      .single())
  }

  if (error) {
    console.error('[supabase] insert error:', error)
    throw error
  }

  return fraForespørselRad(inserted as TilbudRad)
}

export async function oppdaterForespørsel(
  id: string,
  data: Partial<Omit<Forespørsel, 'id'>>
): Promise<void> {
  const update: Record<string, unknown> = {}

  if (data.kundeNavn !== undefined) update.kunde_navn = data.kundeNavn
  if (data.kundeEpost !== undefined) update.kunde_epost = data.kundeEpost
  if (data.kundeTelefon !== undefined) update.kunde_telefon = data.kundeTelefon
  if (data.jobbBeskrivelse !== undefined) update.jobb_beskrivelse = data.jobbBeskrivelse
  if (data.kortBeskrivelse !== undefined) update.kort_beskrivelse = data.kortBeskrivelse
  if (data.adresse !== undefined) update.adresse = data.adresse
  if (data.prisEksMva !== undefined) update.pris_eks_mva = data.prisEksMva
  if (data.timer !== undefined) update.timer = data.timer
  if (data.materialkostnad !== undefined) update.materialkostnad = data.materialkostnad
  if (data.status !== undefined) update.status = data.status
  if (data.generertTekst !== undefined) update.generert_tekst = data.generertTekst
  if (data.jobbType !== undefined) update.jobb_type = data.jobbType
  if (data.draftStage !== undefined) update.draft_stage = data.draftStage
  if (data.kundeJustering !== undefined) update.kunde_justering = data.kundeJustering
  if (data.aiOppsummering !== undefined) update.ai_oppsummering = data.aiOppsummering

  await oppdaterTilbudRadMedFallback(id, update)
}

export async function hentSendteTilbud(firmaId: string): Promise<Forespørsel[]> {
  const { data, error } = await supabase
    .from('tilbud')
    .select('*')
    .eq('firma_id', firmaId)
    .neq('status', 'utkast')
    .order('sist_sendt_dato', { ascending: false, nullsFirst: false })
    .order('opprettet_dato', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as TilbudRad[]).map(fraForespørselRad)
}


export async function markerSomLest(tilbudId: string): Promise<void> {
  await oppdaterTilbudRadMedFallback(
    tilbudId,
    { sett_som_lest: true },
    ['sett_som_lest']
  )
}

export async function slettTilbud(id: string): Promise<void> {
  const { error } = await supabase
    .from('tilbud')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Feil ved sletting av tilbud:', error)
    throw error
  }
}

export async function hentFirma(userId: string): Promise<Firma | null> {
  const { data, error } = await supabase
    .from('firma')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return fraFirmaRad(data as FirmaRad)
}

export async function oppdaterFirma(userId: string, data: Partial<Firma>): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.firmanavn !== undefined) update.firmanavn = data.firmanavn
  if (data.orgNummer !== undefined) update.org_nummer = data.orgNummer
  if (data.telefon !== undefined) update.telefon = data.telefon
  if (data.epost !== undefined) update.epost = data.epost
  if (data.adresse !== undefined) update.adresse = data.adresse
  if (data.poststed !== undefined) update.poststed = data.poststed
  if (data.logoUrl !== undefined) update.logo_url = data.logoUrl
  if (data.timepris !== undefined) update.timepris = data.timepris
  if (data.materialPaslag !== undefined) update.material_paslag = data.materialPaslag
  if (data.fagkategori !== undefined) update.fagkategori = data.fagkategori
  if (data.tjenester !== undefined) update.tjenester = data.tjenester
  if (data.aktiveTjenester !== undefined) update.aktive_tjenester = data.aktiveTjenester

  let { error } = await supabase.from('firma').update(update).eq('user_id', userId)

  if (erManglendeKolonneFeil(error, 'aktive_tjenester')) {
    delete update.aktive_tjenester
    ;({ error } = await supabase.from('firma').update(update).eq('user_id', userId))
  }

  if (error) throw new Error(error.message)
}

export async function opprettFirma(userId: string, firmanavn: string): Promise<void> {
  const { error } = await supabase
    .from('firma')
    .upsert({ user_id: userId, firmanavn }, { onConflict: 'user_id', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
}

export async function sikreFirmaForBruker(
  userId: string,
  firmanavn = 'Min bedrift'
): Promise<void> {
  const eksisterende = await hentFirma(userId)
  if (eksisterende) {
    return
  }

  await opprettFirma(userId, firmanavn)
}

export async function hentPrishistorikk(firmaId: string): Promise<Prishistorikk[]> {
  const { data, error } = await supabase
    .from('prishistorikk')
    .select('*')
    .eq('firma_id', firmaId)
    .order('dato', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as PrishistorikkRad[]).map(fraPrishistorikkRad)
}

export async function lastOppLogo(
  uri: string,
  userId: string
): Promise<string> {
  const response = await fetch(uri)
  let bytes: ArrayBuffer
  if (typeof response.arrayBuffer === 'function') {
    bytes = await response.arrayBuffer()
  } else {
    const blob = await response.blob()
    if (typeof blob.arrayBuffer !== 'function') {
      throw new Error('Kunne ikke lese bildefilen. Prøv et annet bildeformat.')
    }
    bytes = await blob.arrayBuffer()
  }

  if (bytes.byteLength === 0) {
    throw new Error('Logo-filen var tom (0 bytes). Velg et annet bilde og prøv igjen.')
  }

  const filExt = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg'
  const filNavn = `${userId}/logo-${Date.now()}.${filExt}`
  const contentType = `image/${filExt === 'jpg' ? 'jpeg' : filExt}`

  const { error: uploadError } = await supabase.storage
    .from('logoer')
    .upload(filNavn, bytes, { contentType, upsert: true })

  if (uploadError) {
    console.error('[supabase] logo upload error:', uploadError)
    throw uploadError
  }

  const { data: urlData } = supabase.storage
    .from('logoer')
    .getPublicUrl(filNavn)

  const publicUrl = urlData.publicUrl

  await supabase
    .from('firma')
    .update({ logo_url: publicUrl })
    .eq('user_id', userId)

  return publicUrl
}

type TilbudMaterialRad = {
  id: string
  navn: string
  antall: number
  enhet: string | null
  pris_per_enhet: number
  sortering: number
}

export async function hentTilbudMaterialer(tilbudId: string): Promise<MaterialSpesifiseringRad[]> {
  const { data, error } = await supabase
    .from('tilbud_materialer')
    .select('id, navn, antall, enhet, pris_per_enhet, sortering')
    .eq('tilbud_id', tilbudId)
    .order('sortering', { ascending: true })

  if (error) {
    if (erManglendeTabellFeil(error, 'tilbud_materialer')) return []
    throw new Error(error.message)
  }

  return (data as TilbudMaterialRad[]).map(rad =>
    byggMaterialSpesifiseringRad({
      id: rad.id,
      navn: rad.navn,
      enhet: rad.enhet ?? 'stk',
      antall: rad.antall,
      prisPerEnhet: rad.pris_per_enhet,
    })
  )
}

export async function lagreTilbudMaterial(
  tilbudId: string,
  firmaId: string,
  rad: MaterialSpesifiseringRad,
  sortering: number
): Promise<string> {
  const erNy = rad.id.startsWith('mat-')

  if (erNy) {
    const { data, error } = await supabase
      .from('tilbud_materialer')
      .insert({
        tilbud_id: tilbudId,
        firma_id: firmaId,
        navn: rad.navn,
        antall: rad.antall,
        enhet: rad.enhet,
        pris_per_enhet: rad.prisPerEnhet,
        sortering,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return (data as { id: string }).id
  }

  const { error } = await supabase
    .from('tilbud_materialer')
    .update({
      navn: rad.navn,
      antall: rad.antall,
      enhet: rad.enhet,
      pris_per_enhet: rad.prisPerEnhet,
      sortering,
    })
    .eq('id', rad.id)

  if (error) throw new Error(error.message)
  return rad.id
}

export async function slettTilbudMaterial(id: string): Promise<void> {
  if (id.startsWith('mat-')) return
  const { error } = await supabase
    .from('tilbud_materialer')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function slettAlleTilbudMaterialer(tilbudId: string): Promise<void> {
  const { error } = await supabase
    .from('tilbud_materialer')
    .delete()
    .eq('tilbud_id', tilbudId)

  if (error) {
    if (erManglendeTabellFeil(error, 'tilbud_materialer')) return
    throw new Error(error.message)
  }
}

export async function lagreAlleTilbudMaterialer(
  tilbudId: string,
  firmaId: string,
  rader: MaterialSpesifiseringRad[]
): Promise<void> {
  if (!rader.length) return

  const rows = rader.map((rad, index) => ({
    tilbud_id: tilbudId,
    firma_id: firmaId,
    navn: rad.navn,
    antall: rad.antall,
    enhet: rad.enhet,
    pris_per_enhet: rad.prisPerEnhet,
    sortering: index,
  }))

  const { error } = await supabase.from('tilbud_materialer').insert(rows)

  if (error) {
    if (erManglendeTabellFeil(error, 'tilbud_materialer')) return
    throw new Error(error.message)
  }
}

export async function loggUt(): Promise<void> {
  clearCachedFirma()
  const { error } = await supabase.auth.signOut()
  if (error) {
    await tømLokalAuthSession()
  }
}
