import { postTilAppBackend as postTilAppBackendRequest } from './appBackendClient'
import type {
  SendPaminnelseEpostInput,
  SendTilbudEpostInput,
} from './appBackendContract'

async function postTilAppBackend(path: string, body: Record<string, unknown>): Promise<void> {
  await postTilAppBackendRequest<unknown>(path, body, {
    fallbackErrorMessage: status => `E-postsending feilet (${status})`,
  })
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
