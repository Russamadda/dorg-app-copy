/**
 * Opptaks-/promodemodus for tilbudsflyt. Av som standard — ingen effekt i produksjon.
 *
 * @see offerFlowDemoBus — utløser flyt fra TopBar når aktivert.
 */
export function isOfferFlowRecordingDemoEnabled(): boolean {
  return process.env.EXPO_PUBLIC_OFFER_FLOW_RECORDING_DEMO === '1'
}

/** Unngå ekte OpenAI-kall under demo (rask, deterministisk forhåndsvisning). */
export function shouldUseStubAiInOfferFlowRecordingDemo(): boolean {
  return process.env.EXPO_PUBLIC_OFFER_FLOW_DEMO_STUB_AI === '1'
}

/**
 * Når opptaksdemo er på: sending er ekte (toast + liste) som standard.
 * Sett `EXPO_PUBLIC_OFFER_FLOW_DEMO_MOCK_SEND=1` for å hoppe over Resend/Supabase og bare vise Alert.
 */
export function offerFlowDemoMockSendOnly(): boolean {
  return process.env.EXPO_PUBLIC_OFFER_FLOW_DEMO_MOCK_SEND === '1'
}
