/**
 * DESIGN LAB — Entry point dokumentasjon
 *
 * Dette prosjektet bruker Expo Router (app/-mappe), så det finnes ingen
 * separat Navigator-fil å wrappe. Auth-guarden er deaktivert direkte
 * i app/_layout.tsx.
 *
 * Alle skjermer er tilgjengelige uten auth:
 *   - app/(tabs)/index.tsx  → Forespørsler (mockForespørsler)
 *   - app/(tabs)/tilbud.tsx → Sendte tilbud (mockSendteTilbud)
 *   - app/bedrift.tsx       → Bedriftsprofil (mockFirma)
 *
 * Mockdata:   design-lab/mockData.ts
 * Tema:       design-lab/theme.ts
 *
 * For å redesigne: importer theme og mockData i komponentene du vil endre.
 *
 * [DESIGN LAB] auth-guard deaktivert — alle skjermer tilgjengelige
 */

export { mockFirma, mockForespørsler, mockSendteTilbud, mockGenerertTekst } from './mockData'
export { theme } from './theme'
