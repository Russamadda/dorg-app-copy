import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Forespørsel, Firma, Prishistorikk } from '../types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Rad-typer som matcher Supabase-tabellene fra rssa-tilbud ───────────────

type TilbudRad = {
  id: string
  firma_id: string | null
  kunde_navn: string
  kunde_epost: string
  jobb_beskrivelse: string
  pris_eks_mva: number
  status: string | null
  opprettet_dato: string
  generert_tekst: string | null
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

// ─── Mapping-funksjoner ──────────────────────────────────────────────────────

function fraForespørselRad(rad: TilbudRad): Forespørsel {
  return {
    id: rad.id,
    kundeNavn: rad.kunde_navn,
    kundeEpost: rad.kunde_epost,
    jobbBeskrivelse: rad.jobb_beskrivelse,
    prisEksMva: Number(rad.pris_eks_mva),
    status: (rad.status as Forespørsel['status']) ?? 'avventer',
    opprettetDato: rad.opprettet_dato,
    generertTekst: rad.generert_tekst ?? undefined,
    firmaId: rad.firma_id ?? '',
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

// ─── Forespørsler ────────────────────────────────────────────────────────────

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

export async function lagreForespørsel(
  data: Omit<Forespørsel, 'id' | 'opprettetDato'>
): Promise<Forespørsel> {
  console.log('=== LAGRER TILBUD ===')
  console.log('Input:', JSON.stringify(data, null, 2))

  const { data: userData } = await supabase.auth.getUser()
  console.log('User ID:', userData.user?.id)

  const { data: firmaData } = await supabase
    .from('firma')
    .select('id, firmanavn')
    .eq('user_id', userData.user?.id ?? '')
    .single()
  console.log('Firma:', JSON.stringify(firmaData, null, 2))

  const oppstartsDato = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const gyldigTilDato = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const insertData = {
    firma_id: data.firmaId,
    kunde_navn: data.kundeNavn,
    kunde_epost: data.kundeEpost,
    jobb_beskrivelse: data.jobbBeskrivelse,
    pris_eks_mva: data.prisEksMva,
    status: data.status ?? 'sendt',
    generert_tekst: data.generertTekst ?? null,
    jobb_type: data.jobbType ?? 'annet',
    adresse: '',
    oppstarts_dato: oppstartsDato,
    gyldig_til_dato: gyldigTilDato,
    firmanavn: (firmaData as { firmanavn: string } | null)?.firmanavn ?? '',
  }

  console.log('[supabase] lagreForespørsel insert:', JSON.stringify(insertData, null, 2))

  const { data: inserted, error } = await supabase
    .from('tilbud')
    .insert(insertData)
    .select()
    .single()

  console.log('Insert result - data:', JSON.stringify(inserted, null, 2))
  console.log('Insert result - error:', JSON.stringify(error, null, 2))

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
  if (data.jobbBeskrivelse !== undefined) update.jobb_beskrivelse = data.jobbBeskrivelse
  if (data.prisEksMva !== undefined) update.pris_eks_mva = data.prisEksMva
  if (data.status !== undefined) update.status = data.status
  if (data.generertTekst !== undefined) update.generert_tekst = data.generertTekst

  const { error } = await supabase.from('tilbud').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function hentSendteTilbud(firmaId: string): Promise<Forespørsel[]> {
  const { data, error } = await supabase
    .from('tilbud')
    .select('*')
    .eq('firma_id', firmaId)
    .neq('status', 'avventer')
    .order('opprettet_dato', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as TilbudRad[]).map(fraForespørselRad)
}

// ─── Firma ───────────────────────────────────────────────────────────────────

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

  const { error } = await supabase.from('firma').update(update).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function opprettFirma(userId: string, firmanavn: string): Promise<void> {
  const { error } = await supabase
    .from('firma')
    .insert({ user_id: userId, firmanavn })

  if (error) throw new Error(error.message)
}

// ─── Prishistorikk ───────────────────────────────────────────────────────────

export async function hentPrishistorikk(firmaId: string): Promise<Prishistorikk[]> {
  const { data, error } = await supabase
    .from('prishistorikk')
    .select('*')
    .eq('firma_id', firmaId)
    .order('dato', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as PrishistorikkRad[]).map(fraPrishistorikkRad)
}

// ─── Logo-opplasting ─────────────────────────────────────────────────────────

export async function lastOppLogo(
  uri: string,
  userId: string
): Promise<string> {
  const response = await fetch(uri)
  const blob = await response.blob()

  const filExt = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg'
  const filNavn = `logo-${userId}-${Date.now()}.${filExt}`
  const contentType = `image/${filExt === 'jpg' ? 'jpeg' : filExt}`

  console.log('[supabase] lastOppLogo:', { filNavn, contentType })

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('logoer')
    .upload(filNavn, blob, { contentType, upsert: true })

  console.log('[supabase] upload result:', { uploadData, uploadError })

  if (uploadError) {
    console.error('[supabase] logo upload error:', uploadError)
    throw uploadError
  }

  const { data: urlData } = supabase.storage
    .from('logoer')
    .getPublicUrl(filNavn)

  const publicUrl = urlData.publicUrl
  console.log('[supabase] logo public URL:', publicUrl)

  await supabase
    .from('firma')
    .update({ logo_url: publicUrl })
    .eq('user_id', userId)

  return publicUrl
}


// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loggUt(): Promise<void> {
  await supabase.auth.signOut()
}
