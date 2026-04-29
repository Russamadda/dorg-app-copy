# DORG-ØKOYSTEM – ARKITEKTURKARTLEGGING
**Dato:** 2026-04-22  
**Prosjekter:** `/Users/Pawpaw/Desktop/dorg-app copy` · `/Users/Pawpaw/dorg-web-priv`

---

## Del 1: dorg-app copy

### 1A. Formål og teknologi

Expo/React Native mobilapp for norske håndverkere. Lar innlogget håndverker motta forespørsler, generere AI-tilbud, sende tilbud på e-post og følge opp status.

| Bibliotek | Versjon |
|---|---|
| Expo SDK | ~54.0.0 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| expo-router | ~6.0.23 |
| @supabase/supabase-js | ^2.45.4 |
| @react-native-async-storage/async-storage | 2.2.0 |
| expo-secure-store | ~15.0.8 |
| react-native-reanimated | ~4.1.1 |
| lucide-react-native | ^1.7.0 |
| react-native-markdown-display | ^7.0.2 |
| expo-image-picker | ~17.0.10 |

OpenAI SDK og Resend SDK er **ikke** installert som npm-pakker. Begge tjenester kalles via `fetch()`.

---

### 1B. Top-level struktur

| Mappe | Innhold |
|---|---|
| `app/` | Expo Router-ruter og skjermer |
| `components/` | Gjenbrukbare React Native-komponenter (21 filer) |
| `lib/` | Forretningslogikk, API-klienter, utilities (29+ filer) |
| `constants/` | Fargepalett, tjenestekategorier, plassholdertekster |
| `hooks/` | `useNyttTilbudFlyt.ts` |
| `types/` | TypeScript-typer |
| `supabase/` | Supabase-konfig og migrasjoner |
| `assets/` | Bilder og fonter |
| `design-lab/` | Designprototyper |
| `docs/` | Intern dokumentasjon |

---

### 1C. App-ruter

| Fil | Funksjon |
|---|---|
| `app/_layout.tsx` | Root-layout: auth-state, session, splash, fonter |
| `app/bedrift.tsx` | Bedriftsinnstillinger, logo-opplasting |
| `app/onboarding.tsx` | Onboarding for nye brukere |
| `app/auth/index.tsx` | Innlogging/registrering e-post+passord |
| `app/auth/reset-password.tsx` | Nullstill passord etter e-postlenke |
| `app/(tabs)/index.tsx` | Dashboard/hjemskjerm |
| `app/(tabs)/tilbud.tsx` | Tilbudsliste |

---

### 1D. Eksterne avhengigheter

#### Supabase-kall (`lib/supabase.ts`)

**Auth:**

| Kall | Fil |
|---|---|
| `supabase.auth.signInWithPassword()` | `app/auth/index.tsx` |
| `supabase.auth.signUp()` | `app/auth/index.tsx` |
| `supabase.auth.resetPasswordForEmail()` | `app/auth/index.tsx` |
| `supabase.auth.updateUser()` | `app/auth/reset-password.tsx` |
| `supabase.auth.getSession()` | `lib/supabase.ts:49` – `hentLokalAuthSession()` |
| `supabase.auth.onAuthStateChange()` | `app/_layout.tsx` |

**Database:**

| Tabell | Operasjoner |
|---|---|
| `tilbud` | SELECT (enkelt + liste etter firma+status), INSERT, UPDATE, DELETE |
| `tilbud_hendelser` | INSERT, SELECT |
| `firma` | SELECT, UPDATE, upsert |
| `prishistorikk` | SELECT |

**Storage:** `storage.from('logoer').upload()` og `.getPublicUrl()` i `lib/supabase.ts`

---

#### fetch()-kall

| URL | Trigger | Auth | Betingelse |
|---|---|---|---|
| `${DORG_WEB_BASE_URL}/api/app/generer-tilbud` | Opprettelse av tilbud | `Bearer <supabase_jwt>` | **Alltid – primær vei** |
| `https://api.openai.com/v1/chat/completions` (`lib/openai.ts:1848`) | Tilbudsgenering | `Bearer <EXPO_PUBLIC_OPENAI_API_KEY>` | **Fallback** kun ved server-feil |
| `https://api.openai.com/v1/chat/completions` (`lib/openai.ts:1922`) | `oppsummerJusteringsbehovForHandverker()` | `Bearer <EXPO_PUBLIC_OPENAI_API_KEY>` | **Alltid direkte** – ingen server-rute finnes |
| `${DORG_WEB_BASE_URL}/api/app/send-tilbud-epost` | Send tilbuds-e-post | `Bearer <supabase_jwt>` | Kun når `EXPO_PUBLIC_RESEND_API_KEY` **ikke** er satt |
| `${DORG_WEB_BASE_URL}/api/app/send-paminnelse-epost` | Send påminnelses-e-post | `Bearer <supabase_jwt>` | Kun når `EXPO_PUBLIC_RESEND_API_KEY` **ikke** er satt – **ruten finnes ikke i dorg-web-priv** |
| `https://api.resend.com/emails` (`lib/resend.ts:544,610`) | Send tilbud/påminnelse direkte | `Bearer <EXPO_PUBLIC_RESEND_API_KEY>` | Kun når `EXPO_PUBLIC_RESEND_API_KEY` **er** satt |

**Ruting-logikk (asymmetrisk):**
- OpenAI: dorg-web-server er **primær**, direkte OpenAI er **fallback** (ved serverfeil).
- Resend: `EXPO_PUBLIC_RESEND_API_KEY` **mangler** → prøver dorg-web-server. `EXPO_PUBLIC_RESEND_API_KEY` **finnes** → direkte Resend.

---

#### `EXPO_PUBLIC_*`-hemmeligheter

| Variabelnavn | Fil | Bruk |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `lib/supabase.ts:15` | Supabase prosjekt-URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts:16` | Supabase anon-nøkkel |
| `EXPO_PUBLIC_OPENAI_API_KEY` | `lib/openai.ts` | OpenAI-nøkkel (fallback + alltid for justering-oppsummering) |
| `EXPO_PUBLIC_RESEND_API_KEY` | `lib/resend.ts:3` | Resend-nøkkel (brukt direkte hvis satt) |
| `EXPO_PUBLIC_RESEND_FROM_EMAIL` | `lib/resend.ts:4` | Avsender-adresse |
| `EXPO_PUBLIC_RESEND_TEST_EMAIL` | `lib/resend.ts:6` | Test-mottaker for sandboxmodus |
| `EXPO_PUBLIC_DORG_WEB_BASE_URL` | `lib/appBackendUrl.ts` via `lib/openai.ts`, `lib/resend.ts`, `lib/utfort.ts` | Intern app-backend-base for `/api/app/*`; ingen hardkodet fallback |
| `EXPO_PUBLIC_OFFER_FLOW_RECORDING_DEMO` | `lib/demoRecording/offerFlowDemoFlags.ts` | Demo-modus |
| `EXPO_PUBLIC_OFFER_FLOW_DEMO_STUB_AI` | `lib/demoRecording/offerFlowDemoFlags.ts` | Stub AI-svar |
| `EXPO_PUBLIC_OFFER_FLOW_DEMO_MOCK_SEND` | `lib/demoRecording/offerFlowDemoFlags.ts` | Mock e-postsending |

---

### 1E. AI-prompts (`lib/openai.ts`)

| Navn | Linje | Beskrivelse |
|---|---|---|
| `legacySystemPrompt` | L8 | Eldre systemPrompt, ikke i aktiv bruk |
| `systemPrompt` | L955 | Aktiv systemPrompt for tilbudsgenering |
| `byggPrompt()` | L1622 | Dynamisk user-prompt-fabrikk fra `GenererTilbudInput` |
| Inline system prompt | L1922 | For `oppsummerJusteringsbehovForHandverker()` |

Total: 1953 linjer / 46 KB.

---

### 1F. E-postmaler (`lib/resend.ts`)

| Funksjon | Beskrivelse |
|---|---|
| `prøvParsePrisSeksjonEpost()` | Parser prisseksjon til HTML |
| `generertTekstTilVisningsHtml()` | Konverterer tilbudstekst til HTML |
| `byggTilbudEpostDokumentHtml()` | Wrapper: header, CTA-knapper, kontaktinfo, footer |
| `byggHtmlBody()` | Slår alt sammen til komplett HTML-body |
| `byggPaminnelseHtmlBody()` | Bygger HTML for påminnelses-e-post |
| `sendTilbudEpost()` | Sender tilbud (direkte Resend eller via server) |
| `sendPaminnelseEpost()` | Sender påminnelse (direkte Resend eller forsøker server) |

---

### 1G. Forretningslogikk (`lib/tilbudPris.ts`)

- `rundTilNarmeste500()` – avrunding til nærmeste 500 kr
- `beregnTilbudPrisLinjer()` – beregner arbeid + materialer eks/inkl. 25% MVA
- `beregnTilbudTotalInklMva()` – total inkl. MVA (fra tekst eller beregning)
- Defaults: timepris 950 kr/t, materialpåslag 15%, MVA 25%

Materialkatalog (100+ varer): `lib/materialForslag.ts`  
Mengdeutregning: `lib/materialSpesifisering.ts`

---

### 1H. Auth

**Innlogging:** E-post + passord via `supabase.auth.signInWithPassword()`. Magic link for passordgjenoppretting.

**Session-lagring:** `@react-native-async-storage/async-storage`, `persistSession: true`, `autoRefreshToken: true`.

**JWT til server:** `Authorization: Bearer ${session.access_token}` på alle kall til dorg-web-priv (`lib/resend.ts:441`, `lib/openai.ts:1536`).

---

## Del 2: dorg-web-priv (`/Users/Pawpaw/dorg-web-priv`)

### 2A. Formål og teknologi

Next.js-nettapp med to formål: kundeportal (det kunden åpner fra e-posten) og app-backend (server-endepunkter mobilappen kaller).

| Bibliotek | Versjon |
|---|---|
| Next.js | 16.2.1 (App Router) |
| React | 19.2.4 |
| @supabase/supabase-js | ^2.100.0 |
| Tailwind CSS | ^4 |
| TypeScript | ^5 |

OpenAI og Resend kalles via `fetch()` (ingen SDK-pakker).

---

### 2B. Top-level struktur

| Mappe/fil | Innhold |
|---|---|
| `app/` | Next.js App Router – ruter og API-handlers |
| `lib/` | Server-side utilities (8 filer) |
| `types/` | `index.ts` – `Tilbud`-interface |
| `public/` | SVG-ikoner |
| `.env.example` | Variabelnavn-mal |
| `vercel.json` | Vercel deployment-konfig |

---

### 2C. Alle ruter

#### GRUPPE 1 – Kundeportal

| Fil | URL | Formål |
|---|---|---|
| `app/t/[hash]/page.tsx` | `/t/[tilbudId]` | Server Component: henter tilbud + firma fra DB, dispatches til riktig child-komponent |
| `app/t/[hash]/tilbud-page-client.tsx` | (komponent) | Client Component: UI-states (visning/godkjent/justering), kaller `/api/godkjenn-tilbud` og `/api/juster-tilbud` |
| `app/t/[hash]/offer-document.tsx` | (komponent) | Presentasjonskomponent for tilbudsteksten, kaller `parseOfferContent()` for strukturert rendering |
| `app/t/[hash]/offer-actions-panel.tsx` | (komponent) | Høyre-panel med godkjennings-/justeringsknapper og tekstfelt |
| `app/t/[hash]/godkjent-side.tsx` | (komponent) | Bekreftelsesskjerm: "Tilbud godkjent!" med håndverkerens kontaktinfo |
| `app/t/[hash]/loading.tsx` | (loading state) | Skeleton-laster |
| `app/t/[hash]/not-found.tsx` | (404) | Feilside |

**Auth for kunden:** Ingen. Tilbud-ID i URL er eneste tilgangsnøkkel.

`page.tsx`-logikk: Hvis `?action=godkjenn` er i URL → kaller `godkjennTilbud()` server-side direkte. Hvis tilbud allerede `status=godkjent` → viser "allerede godkjent". Ellers → renderer `TilbudPageClient`.

---

#### GRUPPE 2 – App-backend (appen kaller disse)

| Fil | URL | Metode | Formål | Auth |
|---|---|---|---|---|
| `app/api/app/generer-tilbud/route.ts` | `/api/app/generer-tilbud` | POST | AI-generering av tilbudstekst via GPT-4.1 | Bearer JWT → `requireAppUser()` |
| `app/api/app/send-tilbud-epost/route.ts` | `/api/app/send-tilbud-epost` | POST | Send tilbud på e-post til kunde via Resend | Bearer JWT → `requireAppUser()` |

**Merk:** Det finnes **ingen** `/api/app/send-paminnelse-epost`-rute i dorg-web-priv.

**Auth-mekanisme:** `requireAppUser()` (`lib/app-auth.ts`) – ekstraherer JWT fra `Authorization: Bearer`-header, validerer mot Supabase anon-klienten, returnerer `User`-objekt.

---

#### GRUPPE 1 – Kundekalt (uautentisert)

| Fil | URL | Metode | Formål |
|---|---|---|---|
| `app/api/godkjenn-tilbud/route.ts` | `/api/godkjenn-tilbud` | POST | Kunden godkjenner tilbud |
| `app/api/juster-tilbud/route.ts` | `/api/juster-tilbud` | POST | Kunden ber om justering + AI-oppsummering |
| `app/api/oppsummer-justering/route.ts` | `/api/oppsummer-justering` | POST | Standalone AI-oppsummering av justeringsforespørsel |

Ingen auth på disse tre.

---

#### GRUPPE 3 – Admin

| Fil | URL | Metode | Formål | Auth |
|---|---|---|---|---|
| `app/api/admin/repair-tilbud-hendelser/route.ts` | `/api/admin/repair-tilbud-hendelser` | POST | Backfill manglende hendelser og datoer | `x-admin-repair-key`-header vs `ADMIN_REPAIR_KEY` env (timing-safe) |

---

### 2D. Hemmeligheter og env-variabler

| Variabelnavn | Fil(er) | Bruk |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.ts:3`, `lib/app-auth.ts:6` | Supabase-URL (synlig for klient) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts:4`, `lib/app-auth.ts:7` | Anon-nøkkel (synlig for klient) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase.ts:6` | Service role (server-only, omgår RLS) |
| `OPENAI_API_KEY` | `lib/app-openai.ts:516`, `app/api/juster-tilbud/route.ts:42`, `app/api/oppsummer-justering/route.ts:15` | GPT-4.1 |
| `RESEND_API_KEY` | `lib/app-resend.ts:3` | Resend e-post |
| `RESEND_FROM_EMAIL` | `lib/app-resend.ts:4` | Avsender-adresse |
| `RESEND_TEST_EMAIL` | `lib/app-resend.ts:6` | Test-mottaker (valgfri) |
| `NEXT_PUBLIC_TILBUD_BASE_URL` | `lib/app-resend.ts:8` | Base-URL for kundelenker i e-post |
| `ADMIN_REPAIR_KEY` | `app/api/admin/repair-tilbud-hendelser/route.ts:9,27` | Admin-nøkkel |

---

### 2E. AI-prompts

| Navn | Fil | Linje | Beskrivelse |
|---|---|---|---|
| `systemPrompt` | `lib/app-openai.ts` | L3–514 | 512-linjes instruksjonssett for GPT-4.1 |
| `byggPrompt()` | `lib/app-openai.ts` | L543–622 | Dynamisk user-prompt fra `GenererTilbudInput` |
| Inline system prompt (justering) | `app/api/juster-tilbud/route.ts` | L47–62 | Oppsummer justeringsønsker på 1-2 setninger |
| Identisk inline prompt | `app/api/oppsummer-justering/route.ts` | L22–29 | Identisk kopi av ovenfor |

Justeringsprompten er **duplisert identisk** i to route-filer.

---

### 2F. E-postmaler (`lib/app-resend.ts`)

| Funksjon | Linje | Beskrivelse |
|---|---|---|
| `byggHtmlBody()` | L20–86 | Komplett HTML-e-post for tilbud (header, body, to CTA-knapper, footer) |
| `sendTilbudEpostServer()` | L114–157 | Sender tilbud via Resend; subject: `"Tilbud fra ${firmanavn}"` |

Ingen `sendPaminnelseEpostServer()` eller påminnelses-HTML finnes i dorg-web-priv.

---

### 2G. lib/-filer

| Fil | Eksporter / Formål |
|---|---|
| `lib/app-auth.ts` | `requireAppUser(request)` – JWT-validering mot Supabase |
| `lib/app-openai.ts` | `genererTilbudServer(input)` – kaller GPT-4.1; eksporterer `GenererTilbudInput` |
| `lib/app-resend.ts` | `sendTilbudEpostServer(input)` – sender e-post via Resend |
| `lib/offer-document-parse.ts` | `parseOfferContent(raw)` – parser AI-generert tekst til strukturert `OfferContent`-objekt for rendering |
| `lib/tilbud-status.ts` | `godkjennTilbud()`, `beOmTilbudsjustering()`, `lagreJusteringsOppsummering()` |
| `lib/supabase.ts` | `getSupabaseClient()` (anon), `getSupabaseServiceClient()` (service role, omgår RLS) |
| `lib/repair-tilbud-hendelser.ts` | `repairTilbudHendelser()` – admin backfill av manglende hendelser |
| `lib/tilbudPris.ts` | `rundTilNarmeste500()`, `hentTotalInklMvaFraTekst()`, `beregnTilbudTotalInklMva()` |

---

## Del 3: Grensesnittet mellom de to

### 3A. Appens fetch-kall mot dorg-web-priv

#### 1. Tilbudsgenering

| | |
|---|---|
| **App-fil** | `lib/openai.ts:1536` – `genererTilbud()` |
| **Web-route** | `app/api/app/generer-tilbud/route.ts` |
| **Request** | `POST`, `Authorization: Bearer <jwt>`, body: `GenererTilbudInput`-felt |
| **Response** | `{ tekst: string }` |
| **Auth** | Supabase JWT validert av `requireAppUser()` |
| **Status** | Aktiv. Direkte OpenAI er fallback ved serverfeil. |

#### 2. Send tilbuds-e-post (via server)

| | |
|---|---|
| **App-fil** | `lib/resend.ts:441` – `sendTilbudEpost()` |
| **Web-route** | `app/api/app/send-tilbud-epost/route.ts` |
| **Request** | `POST`, `Authorization: Bearer <jwt>`, body: tilbudId + e-postfelter |
| **Response** | `{ ok: true }` |
| **Auth** | Supabase JWT |
| **Betingelse** | Kun når `EXPO_PUBLIC_RESEND_API_KEY` ikke er satt |
| **Status** | Aktiv (kondisjonelt). |

#### 3. Send påminnelses-e-post (via server)

| | |
|---|---|
| **App-fil** | `lib/resend.ts` – `sendPaminnelseEpost()` |
| **Web-route** | `/api/app/send-paminnelse-epost` |
| **Betingelse** | Kun når `EXPO_PUBLIC_RESEND_API_KEY` ikke er satt |
| **Status** | **IKKE-EKSISTERENDE RUTE.** Ruten finnes ikke i dorg-web-priv. Kallet vil returnere 404. |

---

### 3B. Delt datamodell

**Tabeller brukt av begge:**

| Tabell | dorg-app-bruk | dorg-web-priv-bruk |
|---|---|---|
| `tilbud` | CRUD | SELECT, UPDATE |
| `firma` | SELECT, UPDATE, upsert | SELECT |
| `tilbud_hendelser` | INSERT, SELECT | INSERT, SELECT, UPDATE |

**`Tilbud`-interface – duplisert og driftet:**

| Felt | App (`lib/openai.ts:1569`) | Web (`lib/app-openai.ts:518`) |
|---|---|---|
| `behandleSomUtkastUtenTekstanalyse?` | **Finnes** (L1608) | **Finnes ikke** |

---

### 3C. Duplisert logikk

#### systemPrompt

| | App (`lib/openai.ts`) | Web (`lib/app-openai.ts`) |
|---|---|---|
| Filstørrelse | 1953 linjer / 46 KB | 662 linjer / 21 KB |
| Linje der prompt starter | L955 | L3 |
| Åpningstekst | `"Du er tilbudsassistent for norske håndverkere.\nOppgaven din er å skrive tilbud..."` | `"Du er tilbudsassistent for norske håndverkere.\nSkriv tilbud som en erfaren håndverker..."` |
| `legacySystemPrompt` | Finnes (L8) | Finnes ikke |
| **Status** | **Driftet** – app-versjonen er vesentlig lengre |

Appen bruker sin systemPrompt kun ved fallback til direkte OpenAI. Normalt er det web-serverens systemPrompt som kjøres.

#### `byggPrompt()`

Separat implementasjon i begge filer. Samme funksjonsnavn, samme input-type, ikke delt kode.

#### `GenererTilbudInput`

| Felt | App | Web |
|---|---|---|
| `behandleSomUtkastUtenTekstanalyse?` | Finnes | **Mangler** |
| Alle andre felt | Identiske | Identiske |

#### E-postmaler

| | App (`lib/resend.ts`) | Web (`lib/app-resend.ts`) |
|---|---|---|
| Funksjon | `byggHtmlBody()` + `generertTekstTilVisningsHtml()` + `byggTilbudEpostDokumentHtml()` + `prøvParsePrisSeksjonEpost()` + `byggEpostKontaktHjelpSeksjon()` | `byggHtmlBody()` (flatere, uten sub-funksjoner) |
| Påminnelses-HTML | `byggPaminnelseHtmlBody()` finnes | **Finnes ikke** |
| **Status** | **Duplisert og driftet** | |

#### `tilbudPris.ts`

`rundTilNarmeste500()`, `hentTotalInklMvaFraTekst()` og `beregnTilbudTotalInklMva()` finnes i begge prosjekter under samme filnavn, ikke delt.

---

## Del 4: Kjent state akkurat nå

### 4A. Hva sender appen direkte ut på internett (uten server)?

| Tjeneste | Fil | Trigger | Betingelse |
|---|---|---|---|
| **OpenAI** direkte | `lib/openai.ts:1848` | Tilbudsgenering | Fallback ved server-feil |
| **OpenAI** direkte | `lib/openai.ts:1922` | `oppsummerJusteringsbehovForHandverker()` | **Alltid** – ingen server-rute eksisterer |
| **Resend** direkte | `lib/resend.ts:544` | Send tilbud-e-post | Når `EXPO_PUBLIC_RESEND_API_KEY` er satt |
| **Resend** direkte | `lib/resend.ts:610` | Send påminnelse-e-post | Når `EXPO_PUBLIC_RESEND_API_KEY` er satt |

### 4B. `EXPO_PUBLIC_*`-hemmeligheter i app-miljøet

Variabelnavn (verdier ikke vist):

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_OPENAI_API_KEY
EXPO_PUBLIC_RESEND_API_KEY
EXPO_PUBLIC_RESEND_FROM_EMAIL
EXPO_PUBLIC_RESEND_TEST_EMAIL
EXPO_PUBLIC_DORG_WEB_BASE_URL
EXPO_PUBLIC_OFFER_FLOW_RECORDING_DEMO
EXPO_PUBLIC_OFFER_FLOW_DEMO_STUB_AI
EXPO_PUBLIC_OFFER_FLOW_DEMO_MOCK_SEND
```

### 4C. Hemmeligheter på Vercel

Ingen direkte tilgang til Vercel-konsollen. `.env.example` i dorg-web-priv angir følgende som forventet konfigurert:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_TEST_EMAIL
NEXT_PUBLIC_TILBUD_BASE_URL
```

`ADMIN_REPAIR_KEY` leses i kode men er ikke i `.env.example`.

---

*Rapporten er basert på lesing av faktisk kode per 2026-04-22. Prosjekt: dorg-app copy på `/Users/Pawpaw/Desktop/dorg-app copy` og dorg-web-priv på `/Users/Pawpaw/dorg-web-priv`. Ingen filer er endret.*
