import { byggAppBackendUrl } from './appBackendUrl'
import type { AppErrorResponse } from './appBackendContract'
import { hentLokalAuthSession } from './supabase'

async function hentSupabaseJwt(): Promise<string | null> {
  try {
    const session = await hentLokalAuthSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

export async function postTilAppBackend<TResponse>(
  path: string,
  body: unknown,
  options: { fallbackErrorMessage?: (status: number) => string } = {}
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
    const fallback =
      options.fallbackErrorMessage?.(response.status) || `Forespørsel feilet (${response.status})`
    const msg = (json as AppErrorResponse | null)?.error || fallback
    throw new Error(msg)
  }

  return json as TResponse
}
