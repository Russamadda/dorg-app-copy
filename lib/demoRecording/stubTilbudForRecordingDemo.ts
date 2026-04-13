/**
 * Statisk tilbudstekst for opptaksdemo når EXPO_PUBLIC_OFFER_FLOW_DEMO_STUB_AI=1.
 * Struktur matcher AI-mal (tittel, meta, seksjoner, pris) for forhåndsvisning.
 */
export function byggStubTilbudForRecordingDemo(firmanavn: string): string {
  return `Tilbud – Montering av nytt kjøkken i enebolig

Til: Kari Nordmann
Fra: ${firmanavn}

Adresse: Eksempelveien 1, 0001 Oslo
Tlf: 22 33 44 55
E-post: post@eksempel.no
Dato: 10.04.2026

---

Hei Kari!
Her er prisoverslaget på montering av nytt kjøkken i enebolig hos deg.

Dette er inkludert:

- Demontering av eksisterende innredning og bortkjøring
- Montering av skap og fronter, tilpasning av benkeplate
- Montering av håndtak, dekksider og sokkellister samt justering av dører og skuffer
- Estimert tid: 18 timer

Viktig å merke seg:

- Eventuelle tillegg utover avtalt omfang prises og bekreftes skriftlig før oppstart
- Tilgang til heis og parkering må være avklart på forhånd

Vi kan starte i uke 19 etter avtale.

Dette prisoverslaget gjelder i 14 dager, til 24.04.2026.

---

Pris:

Materialer inkl. mva: kr 10 000
Arbeid inkl. mva: kr 42 750
─────────────────────────────────────
Totalt inkl. mva: kr 52 750

Gi beskjed om du har spørsmål — vi justerer gjerne om du ønsker noe endret.

Med vennlig hilsen,
${firmanavn}`
}
