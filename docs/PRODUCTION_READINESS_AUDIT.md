# Production Readiness Audit - DORG app

Dato: 2026-04-28

## 1. Scope

Audit av `dorg-app copy` med lesing av `/Users/Pawpaw/dorg-web-priv`.
Fokus: Supabase RLS, tilgangskontroll, prod/dev-konfig, kundeportal, PDF-eksport,
storage/logoer og logging/persondata. Det er ikke gjort UI-refaktorering, ikke endret
systemPrompt/byggPrompt og ikke endret tilbudsgenerering.

## 2. Tabeller og RLS-status

| Tabell/bucket | Leses av | Skrives av | RLS/policy i repo etter audit | Status |
| --- | --- | --- | --- | --- |
| `firma` | app auth/onboarding/bedrift/tilbud, web aktivering/app-routes | app `opprettFirma`, `oppdaterFirma`, logo-url, web aktivering/registrering | Ny migration legger `select/insert/update` på `user_id = auth.uid()` | Må applyes og verifiseres i Supabase |
| `tilbud` | app lister/detaljer/utkast, web kundeportal/app API | app oppretter/oppdaterer/sletter, web public godkjenn/juster via service-role | Ny migration legger CRUD på firma-eierskap via `tilbud.firma_id -> firma.user_id` | Kritisk å verifisere at ingen bredere policies finnes |
| `tilbud_hendelser` | app timeline/detaljer, web status-sync/repair | app og web status-sync | Ny migration legger CRUD på firma-eierskap og sjekker at `tilbud_id` tilhører samme `firma_id` ved insert/update | Må applyes |
| `tilbud_materialer` | app materialspesifikasjon, web utført-snapshot/PDF | app materialspesifikasjon | Eksisterende RLS fantes, men ny migration strammer insert/update slik at `tilbud_id` må tilhøre samme firma | Fikset i migration |
| `utfort_oppdrag` | web snapshot/PDF, app via app-backend | web app API med service-role | Eksisterende RLS fantes, men ny migration strammer kobling mot samme firmas `tilbud` | Fikset i migration |
| `prishistorikk` | app `hentPrishistorikk` | ingen writes funnet i app | Ny migration legger eier-policy hvis tabellen finnes | Må sjekkes i dashboard siden schema ikke ligger i migrations |
| `logoer` bucket / `storage.objects` | app firmalogo | app `lastOppLogo` | Ny migration gjør public read, men insert/update/delete bare i `auth.uid()`-mappe | Fikset i migration + app-path |

Tabeller nevnt i gammel/planlagt flyt for forespørsler/leads ble ikke funnet i app/web-kode.

## 3. App-side Supabase-risikoer

- `lib/supabase.ts` har flere updates/deletes med bare rad-id:
  `oppdaterTilbudRadMedFallback`, `slettTilbud`, `markerSomLest`,
  `lagreTilbudMaterial`, `slettTilbudMaterial`, `slettAlleTilbudMaterialer`.
  Dette er akseptabelt bare når RLS er korrekt aktivert.
- App-lister filtrerer vanligvis på `firma_id`, men enkeltoppslag som utkastversjon,
  hendelser og materialer bruker id/tilbud-id og er derfor RLS-avhengige.
- Inserts til `tilbud` og `tilbud_materialer` setter `firma_id` fra aktiv firmaprofil.
  Ny RLS-policy sjekker at firmaet faktisk tilhører `auth.uid()`.
- `lastOppLogo` brukte tidligere flat filsti i public bucket. Det er endret til
  `${userId}/logo-<timestamp>.<ext>` slik at storage-policy kan begrense write/delete
  til egen mappe.
- `dorg-web-priv/app/registrer/page.tsx` forsøker å upserte `firma` direkte fra
  browser etter `signUp`. Hvis Supabase ikke gir session før e-postbekreftelse, vil
  ny `firma`-RLS blokkere dette. Web har senere auth-beskyttet `/api/aktivering` som
  kan opprette/oppdatere firma, men registreringsflyten bør verifiseres manuelt.

## 4. dorg-web API auth-status

Auditerte filer i `/Users/Pawpaw/dorg-web-priv`:

- `/api/app/generer-tilbud`: bruker `requireAppUser`. Ingen tilbud-eierskapssjekk fordi
  den bare genererer tekst fra request payload. Mangler rate limiting/kostnadskontroll.
- `/api/app/send-tilbud-epost`: bruker `requireAppUser`, henter firma på `user.id`,
  sjekker at `tilbud.firma_id === firma.id`.
- `/api/app/send-paminnelse-epost`: samme eierkontroll som sending.
- `/api/app/oppsummer-justering`: bruker `requireAppUser` og eierkontroll.
- `/api/app/opprett-utfort-snapshot`, `/hent-utfort-snapshot`,
  `/eksporter-utfort-pdf`: bruker `requireAppUser`, henter firma på `user.id` og
  `opprettEllerHentUtfortSnapshot` sjekker `tilbud_id + firma_id`.
- `/api/aktivering`: bruker `requireAppUser` for web onboarding/profil.
- `/api/admin/repair-tilbud-hendelser`: beskyttet med `ADMIN_REPAIR_KEY` og
  `timingSafeEqual`.

Funn:

- `/api/oppsummer-justering` er en eldre unauthenticated route som kaller OpenAI og
  `lagreJusteringsOppsummering` via service-role basert på `tilbudId`. Den ser ikke ut
  til å brukes av kundeportalen nå, men bør fjernes eller få samme auth/eierskapssjekk
  som `/api/app/oppsummer-justering`.
- `/api/juster-tilbud` er public, bruker bare `tilbudId`, kaller OpenAI best-effort og
  skriver justering med service-role. Det er forventet kundeportal-overflate, men mangler
  egen public token, rate limiting og status-/lengdevalidering.
- `/api/godkjenn-tilbud` er public, bruker bare `tilbudId` og kan sette status til
  `godkjent` dersom id er kjent.

## 5. PDF-eksportstatus

`dorg-web-priv/app/api/app/eksporter-utfort-pdf/route.ts` har fortsatt:

```ts
const TEST_MOTTAKER = 'russamadda@gmail.com'
```

og sender alle PDF-er til denne adressen. Dette er en launch-blokker. Riktig modell:

- I dev/test kan `RESEND_TEST_EMAIL` brukes eksplisitt.
- I produksjon skal mottaker være firmaets registrerte e-post (`firma.epost`) eller
  innlogget brukers e-post (`user.email`).
- Hvis ingen mottaker finnes, returner 400/422 med tydelig feil.
- Ikke send kundedata/PDF til privat hardkodet adresse.

Web-repoet ligger utenfor skrive-roten i denne økten, så dette ble dokumentert i stedet
for endret.

## 6. Kundeportal/public-link-status

- E-postlenker bygges i `dorg-web-priv/lib/app-resend.ts` som `/t/${tilbudId}` og
  `/t/${tilbudId}?action=godkjenn`.
- `app/t/[hash]/page.tsx` tolker `hash` som intern `tilbud.id` og henter med
  service-role `.eq("id", hash)`.
- Dette er sannsynligvis UUID og vanskelig å gjette, men det er ikke en separat,
  roterbar/revokerbar public token.
- `?action=godkjenn` muterer status på GET. E-postscannere/link preview kan dermed
  godkjenne et tilbud utilsiktet.
- Public portal viser tilbudstekst, pris og firma-info. Den mapper også kunde-epost,
  telefon og adresse inn i klient-props selv om det ikke vises tydelig i UI. Minimering
  bør vurderes.

Anbefalt modell før bred launch:

- Legg `public_token` på `tilbud`, generer kryptografisk tilfeldig token server-side.
- Bruk `/t/[public_token]` i kundeportal og e-post.
- Ikke eksponer intern `tilbud.id`.
- Godkjenning bør være eksplisitt POST fra side med knapp, ikke GET-sideeffekt.
- Vurder `public_token_revoked_at` og senere `expires_at`.

## 7. Storage/logo bucket-status

Før audit:

- Bucket `logoer` er public.
- Policies tillot authenticated users insert/select/update i hele bucketen.
- App lastet opp filer på flat sti `logo-<userId>-<timestamp>.<ext>`.

Endret:

- App laster opp logoer til `${userId}/logo-<timestamp>.<ext>`.
- Ny migration erstatter brede write/update policies med path-policy:
  første path-segment må være `auth.uid()`.
- Public read beholdes, siden firmalogoer er ment å vises offentlig.

Må verifiseres i dashboard:

- At gamle brede policies faktisk er borte.
- At ingen andre storage policies gir alle authenticated write/delete i `logoer`.

## 8. Env/prod-konfigstatus

App:

- `EXPO_PUBLIC_SUPABASE_URL` og `EXPO_PUBLIC_SUPABASE_ANON_KEY` er public-safe.
- `EXPO_PUBLIC_DORG_WEB_BASE_URL` brukes som app-backend base.
- Ingen `EXPO_PUBLIC_OPENAI_*` eller `EXPO_PUBLIC_RESEND_*` hemmeligheter funnet i
  aktiv appkode.
- `.env` er ikke tracked. `.env.example` dokumenterer public env.
- Demo-opptaksflagg er `EXPO_PUBLIC_*`; de er public og må ikke være satt i prod-build.

Web:

- `.env.example` har server-only `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
  `RESEND_API_KEY`.
- `NEXT_PUBLIC_TILBUD_BASE_URL` valideres og avviser gammel Vercel-URL i
  `lib/app-resend.ts`.
- PDF-ruten har hardkodet privat testmottaker og mangler `RESEND_TEST_EMAIL`-styrt
  dev/test-modus.

## 9. Logging/persondata-status

Endret i app:

- `app/bedrift.tsx` logger ikke lenger full logo-URL ved bildevisningsfeil.

Funn som bør fikses i web:

- `app/api/juster-tilbud/route.ts` logger `kundeJustering` ved AI-oppsummeringsfeil.
  Det er rå kundemelding og bør fjernes fra logs.
- Flere routes logger `tilbudId` og `userId`. Det kan være OK for sikkerhetsdebugging,
  men bør behandles som intern metadata og ikke kombineres med rå kundetekst.
- Ingen logging av PDF base64 funnet.

## 10. Kritiske launch-blokkere

1. `dorg-web-priv` PDF-eksport sender til hardkodet privat testadresse.
2. Public kundeportal bruker intern `tilbud.id` som link-token og har ingen roterbar
   public token.
3. Godkjenningslenke muterer status via GET (`/t/[id]?action=godkjenn`).
4. Legacy `/api/oppsummer-justering` er unauthenticated og kan bruke OpenAI/skrive
   oppsummering basert på kjent `tilbudId`.
5. Supabase må få migrationen `20260428_production_readiness_rls.sql` applyet og
   dashboard-verifisert før prod, særlig hvis tabellene i dag har RLS av.

## 11. Bør-fikses før launch

- Rate limiting på `/api/app/generer-tilbud`, public `/api/juster-tilbud` og public
  `/api/godkjenn-tilbud`.
- Public routes bør validere at tilbudet er i en status der handlingen er lov
  (`sendt`, `paminnelse_sendt`, `siste_paminnelse_sendt`, eventuelt `justering` for ny
  justering).
- E-postsending bør vurdere å sjekke at `tilEpost` matcher `tilbud.kunde_epost`, eller
  eksplisitt logge/avvise avvik for å redusere misbruk.
- `app/t/[hash]/page.tsx` bør hente eksplisitte kolonner i stedet for `select("*")`,
  og ikke sende kundeepost/telefon/adresse til klienten hvis UI ikke trenger det.

## 12. Kan vente til etter launch

- Dele backend-kontrakter mellom app og web i en package i stedet for manuelle speil.
- Egen admin-side for token-rotasjon/revokering.
- Full forespørsels-/lead-tabellmodell med RLS når V1-forespørselsflyten bygges.
- Finere audit logging for sikkerhetshendelser.

## 13. Konkrete anbefalte migrations/policies

Implementert i app-repoet:

- `supabase/migrations/20260428_production_readiness_rls.sql`

Den gjør:

- `firma`: owner policies på `user_id = auth.uid()`.
- `tilbud`: owner policies via `tilbud.firma_id -> firma.user_id`.
- `tilbud_hendelser`: owner policies og kontroll av samme `tilbud_id/firma_id`.
- `tilbud_materialer`: strammere owner + samme tilbud/firma-sjekk.
- `utfort_oppdrag`: strammere owner + samme tilbud/firma-sjekk.
- `prishistorikk`: owner policies hvis tabellen finnes.
- `logoer`: public read, men write/update/delete kun i `auth.uid()`-mappe.

Viktig: Hvis Supabase allerede har brede policies med andre navn, vil en ny policy ikke
oppheve dem automatisk. Policies er additive. Sjekk dashboard/SQL før launch.

## 14. Manuelle Supabase checks i dashboard

Kjør/verifiser etter migration:

- RLS enabled på `firma`, `tilbud`, `tilbud_hendelser`, `tilbud_materialer`,
  `utfort_oppdrag` og eventuell `prishistorikk`.
- Policies på disse tabellene gir kun tilgang til rader eid av `auth.uid()` via firma.
- Ingen policy som gir `authenticated` eller `anon` generell tilgang til alle rader.
- `storage.objects` for bucket `logoer` har ikke brede insert/update/delete policies.
- En bruker A kan ikke lese/oppdatere/slette bruker B sitt tilbud via anon key.
- En bruker A kan ikke insert/update `tilbud_materialer` med egen `firma_id` men B sitt
  `tilbud_id`.
- En bruker A kan ikke opprette `utfort_oppdrag` for B sitt `tilbud_id`.
- Service-role brukes bare server-side i `dorg-web-priv`.

## 15. QA-scenarier for sikkerhet

1. Logg inn som bruker A og bekreft at A ser egne tilbud/materialer/hendelser.
2. Logg inn som bruker B og forsøk å hente A sitt `tilbud.id` direkte fra app-klient:
   forvent 0 rader/403.
3. Forsøk å oppdatere/slette A sitt tilbud som B:
   forvent blokkert av RLS.
4. Forsøk å insert `tilbud_materialer` som B med B sin `firma_id` og A sitt `tilbud_id`:
   forvent blokkert.
5. Last opp logo som A og bekreft path `A-user-id/logo-...`.
6. Forsøk å overskrive/slette B sin logo-path som A:
   forvent blokkert.
7. Kall `/api/app/send-tilbud-epost` uten Authorization:
   forvent 401.
8. Kall `/api/app/send-tilbud-epost` som B med A sitt `tilbudId`:
   forvent 403.
9. Kall `/api/app/eksporter-utfort-pdf` som B med A sitt `tilbudId`:
   forvent 403.
10. Klikk kundeportal-godkjenning og bekreft at godkjenning ikke skjer via GET etter
    web-fiks.
11. Kall public `/api/oppsummer-justering` uten auth etter web-fiks:
    forvent 401/404 eller fjernet route.
12. PDF-eksport i prod skal gå til firma/bruker-epost, ikke testadresse.
