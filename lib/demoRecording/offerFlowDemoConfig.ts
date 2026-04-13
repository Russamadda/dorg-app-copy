/** Tjeneste som brukes i opptaksdemo (kjøkken / snekker). */
export const OFFER_FLOW_DEMO_TJENESTE = 'Kjøkkenmontering'

/**
 * Ventetid etter tjenesteark er synlig før scroll + «trykk» på rad (synlig i opptak).
 * Økes for roligere opptak før Kjøkkenmontering velges.
 */
export const OFFER_FLOW_DEMO_TJENESTE_SHEET_PAUSE_MS = 3200

/** Ekstra vent etter scroll til rad, før samme lukkeanimasjon som ved manuelt trykk (ms). */
export const OFFER_FLOW_DEMO_TJENESTE_TRYKK_PAUSE_MS = 750

/** Pause etter tjeneste er valgt og ark lukkes, før Nytt tilbud-modal åpnes (reduserer «flash»). */
export const OFFER_FLOW_DEMO_MODAL_OPEN_DELAY_MS = 320

/** Synlig grønn markering på tjenesterad før lukk (opptaksdemo), etter scroll-pause. */
export const OFFER_FLOW_DEMO_TJENESTE_HIGHLIGHT_MS = 420

/** Etter sending i demo: vent før «trykk» på kort (ms). */
export const OFFER_FLOW_DEMO_POST_SEND_KORT_PAUSE_MS = 500

/** «Trykk»-puls på tilbudskort før detaljer åpnes (ms). */
export const OFFER_FLOW_DEMO_POST_SEND_KORT_PULS_MS = 360

/** Sakte scroll gjennom tilbudstekst i detaljmodal (opptaksdemo). */
export const OFFER_FLOW_DEMO_DETALJER_PREVIEW_SCROLL_MS = 4200

/** Tegn for tegn i jobbeskrivelse (høyere = saktere). */
export const OFFER_FLOW_DEMO_TYPING_MS_PER_CHAR = 54

/** Pause mellom hvert steg i timer-/materialhjul (ms). */
export const OFFER_FLOW_DEMO_WHEEL_STEP_MS = 280

/** Varighet for siste jevne scroll i tilbudsforhåndsvisning (ms). */
export const OFFER_FLOW_DEMO_PREVIEW_SCROLL_MS = 3400

export const OFFER_FLOW_DEMO_JOBB_TEKST =
  'Montering av nytt kjøkken i enebolig, inkludert demontering av eksisterende innredning, montering av skap og fronter, tilpasning av benkeplate samt montering av håndtak, dekksider og sokkellister. Avsluttes med justering av dører og skuffer.'

export const OFFER_FLOW_DEMO_KUNDE_NAVN = 'Kari Nordmann'
/** Må samsvare med EXPO_PUBLIC_RESEND_TEST_EMAIL når Resend kjører i testmodus (resend.dev). */
export const OFFER_FLOW_DEMO_KUNDE_EPOST = 'russamadda@gmail.com'
export const OFFER_FLOW_DEMO_KUNDE_TELEFON = '928 45 672'
export const OFFER_FLOW_DEMO_PROSJEKT_ADRESSE = 'Kirkeveien 12, 0363 Oslo'

/** Målverdier for hjul (må finnes i TIMER_VERDIER / MATERIALE_VERDIER i NyttTilbudModal). */
export const OFFER_FLOW_DEMO_TIMER_MÅL = 18
export const OFFER_FLOW_DEMO_MATERIALE_MÅL = 8000
