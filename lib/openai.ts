import { postTilAppBackend } from './appBackendClient'
import type {
  GenererTilbudInput,
  GenererTilbudResponse,
  OppsummerJusteringResponse,
} from './appBackendContract'

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
