import { hentLokalAuthSession } from './supabase'
import { byggAppBackendUrl } from './appBackendUrl'
import type {
  AppErrorResponse,
  EksporterUtfortPdfResponse,
  UtfortOppdragSnapshot,
  UtfortSnapshotResponse,
} from './appBackendContract'

async function hentSupabaseJwt(): Promise<string | null> {
  try {
    const session = await hentLokalAuthSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

async function postTilAppBackend<TResponse>(path: string, body: unknown): Promise<TResponse> {
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

export async function opprettUtfortSnapshot(tilbudId: string): Promise<UtfortOppdragSnapshot> {
  const json = await postTilAppBackend<UtfortSnapshotResponse>('/api/app/opprett-utfort-snapshot', {
    tilbudId,
  })
  return json.snapshot
}

export async function hentUtfortSnapshot(tilbudId: string): Promise<UtfortOppdragSnapshot> {
  const json = await postTilAppBackend<UtfortSnapshotResponse>('/api/app/hent-utfort-snapshot', {
    tilbudId,
  })
  return json.snapshot
}

export async function eksporterUtfortPdf(tilbudId: string): Promise<EksporterUtfortPdfResponse> {
  return postTilAppBackend<EksporterUtfortPdfResponse>('/api/app/eksporter-utfort-pdf', {
    tilbudId,
  })
}
