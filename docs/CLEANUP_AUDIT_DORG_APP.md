# Cleanup Audit DORG App

Dato: 2026-04-28

## 1. Kort oversikt over hovedflyter

- Auth og routing styres i `app/_layout.tsx`. Innlogget bruker rutes til onboarding hvis firmaprofilen ikke er komplett, ellers til tab-app.
- Onboarding ligger i `app/onboarding.tsx` og `components/onboarding/OnboardingFlow.tsx`: firmanavn/fagkategori, tjenester, timepris og materialpåslag.
- Nytt tilbud starter fra FAB i `app/(tabs)/index.tsx` eller `app/(tabs)/tilbud.tsx`, via `hooks/useNyttTilbudFlyt.ts`, tjenestevelger og `components/NyttTilbudModal.tsx`.
- Tilbudsgenerering går fra appen til dorg-web-priv via `lib/openai.ts` -> `/api/app/generer-tilbud`.
- Sending/påminnelse går via `lib/resend.ts` -> `/api/app/send-tilbud-epost` og `/api/app/send-paminnelse-epost`.
- Sendte tilbud vises i `app/(tabs)/tilbud.tsx`, med kort i `components/TilbudKort.tsx` og detaljer i `components/TilbudDetaljerModal.tsx`.
- Kundeportal/godkjenning/justering ligger i dorg-web-priv. Appen lytter på Supabase realtime for statusendringer og henter historikk fra `tilbud_hendelser`.
- Godkjent -> utført håndteres i `components/TilbudDetaljerModal.tsx` via `lib/utfort.ts` mot dorg-web-priv `/api/app/*utfort*`.
- Fakturagrunnlag/PDF bruker server-side snapshot i dorg-web-priv og vises i utført-delen av `TilbudDetaljerModal`.

## 2. Viktige filer

- `components/NyttTilbudModal.tsx`: hovedflyt for nytt tilbud, preview, kundeinfo, materialspesifikasjon og sending.
- `components/MaterialSpesifiseringScreen.tsx`: søk, custom materiale, enhet, antall, pris per enhet og bekreftelse av materialspesifikasjon.
- `components/TilbudDetaljerModal.tsx`: statusdetaljer, tidslinje, justering, påminnelse, revidert tilbud, godkjent -> utført og PDF-eksport.
- `lib/supabase.ts`: klient, auth-session, firma, tilbud, hendelser, utkast og materialrader.
- `lib/materialSpesifisering.ts`: materialradmodell, summering, parsing/serialisering og legacy materialoversikt.
- `lib/materialSeksjon.ts`: ny deterministisk materialseksjon med markører i tilbudstekst.
- `lib/tilbudPris.ts`: prisberegning for arbeid/materialer, påslag og mva.
- `lib/tilbudFinalisering.ts`: trygg kunde-/oppstart-finalisering av tilbudstekst.
- `lib/appBackendClient.ts`: felles klient for app-authenticated POST-kall til dorg-web-priv.
- `lib/appBackendContract.ts`: appens speil av dorg-web-priv `/api/app/*` kontrakter.
- `utils/tilbudStatus.ts`: visningsstatus og tidslogikk for tilbudskort.

## 3. Hva som ble ryddet

- Fjernet hardkodede midlertidige demo-tilbud fra `app/(tabs)/tilbud.tsx`. De ble alltid lagt inn i Sendte tilbud-listen.
- Fjernet ubrukte imports/locals funnet med `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`.
- Samlet duplisert app-backend POST-logikk fra `lib/openai.ts`, `lib/resend.ts` og `lib/utfort.ts` i `lib/appBackendClient.ts`.
- Justerte ny-tilbud-kundeinfo slik at telefon og prosjektadresse er valgfrie i appflyten, i tråd med produktbeskrivelsen. E-post og kundenavn er fortsatt påkrevd.

## 4. Hva som ble fjernet

- Ingen filer ble slettet.
- Fjernet kun åpenbart ubrukte symboler og den hardkodede demo-listen i `app/(tabs)/tilbud.tsx`.

## 5. Hva som ikke ble rørt fordi det var risikabelt

- `systemPrompt` / `byggPrompt` i dorg-web-priv ble ikke rørt.
- Tilbudstekstgenerering og AI-promptinnhold ble ikke endret.
- Prislinje-oppdatering i tilbudstekst er duplisert i ny-tilbud- og detaljmodalen, men ble ikke samlet fordi dette ligger tett på kjerneflyten for tilbudstekst.
- Store komponenter som `NyttTilbudModal` og `TilbudDetaljerModal` ble ikke splittet. De bør refaktoreres i mindre steg med manuell QA.
- Supabase-kontrakter/migrasjoner ble ikke endret.

## 6. Sikkerhetsfunn

- App-klienten bruker nå kun public Supabase URL/anon key, dorg-web base URL, public web URL og demo-flagg i `EXPO_PUBLIC_*`. OpenAI/Resend-secrets er ikke i app-klientkoden.
- `lib/openai.ts`, `lib/resend.ts` og `lib/utfort.ts` sender Supabase access token som `Authorization: Bearer ...` til dorg-web-priv.
- dorg-web-priv har app-authenticated routes med `requireAppUser` og firma/tilbud-tilgangssjekk for e-post, justeringsoppsummering og utført-snapshot.
- App-repoets migrasjoner viser RLS for `tilbud_materialer` og `utfort_oppdrag`, men ikke for `tilbud`, `firma` eller `tilbud_hendelser`. Produksjonsdatabasen bør verifiseres for RLS/policies på disse tabellene.
- Flere app-operasjoner oppdaterer/sletter `tilbud` og `tilbud_materialer` kun med rad-id. Dette er akseptabelt bare hvis RLS/policies er korrekte.
- Kundeportalen i dorg-web-priv bruker `tilbud.id` som URL-token (`/t/[hash]`). Det er UUID-basert, men ikke en separat signert/rotert kundetoken.
- dorg-web-priv PDF-eksport er hardkodet til `TEST_MOTTAKER` i `app/api/app/eksporter-utfort-pdf/route.ts`. Det bør flyttes til riktig mottakerlogikk/serverkonfig før produksjonsbruk.
- Logo-bucketen `logoer` er public og storage-policyene er brede for alle authenticated brukere. Vurder objektsti per bruker/firma og strengere policy.
- Logger i appen logger primært feilobjekter/meldinger. Det bør fortsatt unngås å logge rå tilbudstekst, kundeepost eller kundemeldinger i nye feilbaner.

## 7. Potensielle bugs / teknisk gjeld

- `dorg-oppsummering.md` er historisk og beskriver eldre direkte OpenAI/Resend-bruk som ikke lenger stemmer med nåværende appkode.
- `lib/appBackendContract.ts` i appen og `lib/app-backend-contract.ts` i dorg-web-priv er manuelle speil. De kan drive fra hverandre.
- Prisberegning finnes både i appen (`lib/tilbudPris.ts`) og i dorg-web-priv (`lib/app-utfort.ts`/`lib/tilbudPris.ts`). Hold runding/påslag/mva synkronisert.
- Materialtekst har både legacy `Materialoversikt:`-støtte og ny markørbasert `Materialer inkludert:`-seksjon. Dette er bevisst kompatibilitet, men bør samles senere.
- `NyttTilbudModal.tsx` og `TilbudDetaljerModal.tsx` er store og blander UI, flyt, tekstkomposisjon og persistens.
- Appen er fortsatt avhengig av at Supabase Realtime og statusfeltene i `tilbud` holder seg i sync med `tilbud_hendelser`.
- `app/auth/register.tsx` redirecter til `/auth` med `mode=register`, men registrering skjer i praksis på web via velkomstskjermen.

## 8. Forslag til senere refaktorering

- Flytt felles prislinje-tekstoppdatering til én helper etter at det finnes test/QA rundt tilbudstekstformat.
- Del `NyttTilbudModal` i builder, preview, kundeinfo og material-integrasjon.
- Del `TilbudDetaljerModal` i status/tidslinje, prisjustering, justering, utført/faktura og material-integrasjon.
- Lag delt kilde for app-backend kontrakter mellom app og dorg-web-priv.
- Legg til Supabase migration/policy-dokumentasjon for alle tabeller appen leser/skriver.
- Erstatt kundeportalens tilbud-ID-lenke med signert kundetoken eller separat `public_token`.
- Flytt PDF-mottakerlogikk ut av hardkodet testmottaker i dorg-web-priv.

## 9. Manuelle QA-scenarier

- Ny bruker logger inn etter webregistrering og fullfører onboarding.
- Bruker lager nytt tilbud uten materialspesifikasjon og sender med kun navn/e-post.
- Bruker lager nytt tilbud med materialspesifikasjon, bekrefter materialpris og sender.
- Bruker velger å inkludere materialspesifikasjon i tilbudstekst og ser seksjonen i preview/e-posttekst.
- Bruker sletter alle materialrader og går tilbake til manuell materialpris.
- Sendt tilbud vises uten hardkodede demo-rader.
- Kunde godkjenner tilbud via dorg-web; appen viser godkjent status.
- Kunde ber om justering; appen viser kundemelding i Justering-filteret.
- Bruker genererer og sender revidert tilbud basert på opprinnelig beskrivelse + justering.
- Bruker markerer godkjent tilbud som utført.
- Utført detalj viser fakturagrunnlag, materialrader og totaler.
- PDF-eksport fra utført tilbud kaller server og viser responsstatus.
- Sendt/godkjent/utført detaljer viser riktige status, priser og tidslinje etter refresh.
