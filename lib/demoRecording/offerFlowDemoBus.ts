import { isOfferFlowRecordingDemoEnabled } from './offerFlowDemoFlags'

type TilbudDemoOpenHandler = () => void

let pendingScriptOnNextModalOpen = false
/** Unngår at beskrivelsesfeltet får fokus (tastatur) i det modal åpnes før demo-skriptet starter. */
let suppressNextFormFocusOnce = false
const tilbudOpenHandlers = new Set<TilbudDemoOpenHandler>()

export function registerOfferFlowDemoTilbudOpenHandler(handler: TilbudDemoOpenHandler): () => void {
  tilbudOpenHandlers.add(handler)
  return () => {
    tilbudOpenHandlers.delete(handler)
  }
}

export function consumeSuppressOfferFlowDemoFormFocusOnce(): boolean {
  if (!suppressNextFormFocusOnce) return false
  suppressNextFormFocusOnce = false
  return true
}

/**
 * Kalles fra TopBar: åpner tilbud-fanen med demo-tjeneste og merker at NyttTilbudModal skal kjøre skript.
 */
export function requestOfferFlowRecordingDemo(): void {
  if (!isOfferFlowRecordingDemoEnabled()) return
  pendingScriptOnNextModalOpen = true
  suppressNextFormFocusOnce = true
  tilbudOpenHandlers.forEach(h => {
    h()
  })
}

export function consumePendingOfferFlowRecordingDemo(): boolean {
  if (!pendingScriptOnNextModalOpen) return false
  pendingScriptOnNextModalOpen = false
  return true
}

let postSendDetaljerDemoTilbudId: string | null = null

/** Etter vellykket sending i opptaksdemo: åpne tilbudsdetaljer og scroll i preview. */
export function markOfferFlowPostSendDetaljerDemo(tilbudId: string): void {
  if (!isOfferFlowRecordingDemoEnabled()) return
  postSendDetaljerDemoTilbudId = tilbudId
}

export function consumeOfferFlowPostSendDetaljerDemo(): string | null {
  const id = postSendDetaljerDemoTilbudId
  postSendDetaljerDemoTilbudId = null
  return id
}
