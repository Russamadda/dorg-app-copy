import { postTilAppBackend } from './appBackendClient'
import type {
  EksporterUtfortPdfResponse,
  UtfortOppdragSnapshot,
  UtfortSnapshotResponse,
} from './appBackendContract'

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
