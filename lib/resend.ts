import { hentLokalAuthSession } from './supabase'
import { byggAppBackendUrl } from './appBackendUrl'
import type {
  AppErrorResponse,
  SendPaminnelseEpostInput,
  SendTilbudEpostInput,
} from './appBackendContract'

async function hentSupabaseJwt(): Promise<string | null> {
  try {
    const session = await hentLokalAuthSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

async function postTilAppBackend(path: string, body: Record<string, unknown>): Promise<void> {
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
      (json as AppErrorResponse | null)?.error || `E-postsending feilet (${response.status})`
    throw new Error(msg)
  }
}

export async function sendPaminnelseEpost(
  input: SendPaminnelseEpostInput,
  erSiste = false
): Promise<void> {
  await postTilAppBackend('/api/app/send-paminnelse-epost', {
    tilbudId: input.tilbudId,
    tilEpost: input.tilEpost,
    kundeNavn: input.kundeNavn,
    firmanavn: input.firmanavn,
    generertTekst: input.generertTekst,
    prisEksMva: input.prisEksMva,
    firmaTelefon: input.firmaTelefon ?? null,
    firmaEpost: input.firmaEpost ?? null,
    erSiste,
  })
}

export async function sendTilbudEpost(input: SendTilbudEpostInput): Promise<void> {
  await postTilAppBackend('/api/app/send-tilbud-epost', {
    tilbudId: input.tilbudId,
    tilEpost: input.tilEpost,
    kundeNavn: input.kundeNavn,
    firmanavn: input.firmanavn,
    generertTekst: input.generertTekst,
    prisEksMva: input.prisEksMva,
    firmaTelefon: input.firmaTelefon ?? null,
    firmaEpost: input.firmaEpost ?? null,
  })
}
