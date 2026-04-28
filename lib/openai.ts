import { hentLokalAuthSession } from './supabase'
import { byggAppBackendUrl } from './appBackendUrl'
import type {
  AppErrorResponse,
  GenererTilbudInput,
  GenererTilbudResponse,
  OppsummerJusteringResponse,
} from './appBackendContract'

async function hentSupabaseJwt(): Promise<string | null> {
  try {
    const session = await hentLokalAuthSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

async function postTilAppBackend<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const jwt = await hentSupabaseJwt()
  if (!jwt) {
    throw new Error('Mangler innlogging (fant ingen Supabase-session).')
  }

  const response = await fetch(byggAppBackendUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  })

  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    json = null
  }

  if (!response.ok) {
    const msg =
      (json as AppErrorResponse | null)?.error || `Forespørsel feilet (${response.status})`
    throw new Error(msg)
  }

  return json as TResponse
}

export async function genererTilbud(input: GenererTilbudInput): Promise<string> {
  const json = await postTilAppBackend<GenererTilbudResponse>('/api/app/generer-tilbud', input)

  if (typeof json?.tekst !== 'string' || !json.tekst.trim()) {
    throw new Error('Generering feilet (manglet tekst i svar).')
  }

  return json.tekst
}

export async function oppsummerJusteringsbehovForHandverker(input: {
  kundeMelding: string
  tilbudTekst: string
  tilbudId: string
  jobbBeskrivelse?: string
}): Promise<string> {
  const json = await postTilAppBackend<OppsummerJusteringResponse>(
    '/api/app/oppsummer-justering',
    {
      tilbudId: input.tilbudId,
      kundeJustering: input.kundeMelding,
      jobbBeskrivelse: input.jobbBeskrivelse ?? input.tilbudTekst,
    }
  )

  if (typeof json?.oppsummering !== 'string') {
    throw new Error('Mangler oppsummering i serversvar.')
  }

  return json.oppsummering
}
