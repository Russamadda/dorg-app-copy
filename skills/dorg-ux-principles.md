# Dorg Onboarding-spec

Du bygger onboarding-flyten for Dorg-appen.
Følg denne specen nøyaktig. Kombiner med
dorg-design-system.md og dorg-ux-principles.md.

## Når vises onboarding?

Når firma.fagkategori er null eller tom string.
Onboarding erstatter hele bedrift.tsx-innholdet.
Etter fullføring vises vanlig bedriftsside.

## Komponentstruktur

Opprett components/Onboarding.tsx
Props:
  userId: string
  firma: Firma | null
  onFerdig: (oppdatertFirma: Firma) => void

Internt state:
  aktivtSteg: 0 | 1 | 2 | 3 | 4
  valgtKategori: string | null
  valgteTjenester: string[]
  timepris: number  (default: 950)
  materialPaslag: number  (default: 15)

## State-maskin

STEG_0_VELKOMST
    ↓ bruker trykker "Kom i gang"
STEG_1_FAGKATEGORI
    ↓ automatisk etter 300ms ved valg
STEG_2_TJENESTER
    ↓ bruker trykker "Neste"
STEG_3_PRISER
    ↓ bruker trykker "Neste"
STEG_4_FERDIG
    ↓ bruker trykker "Lag mitt første tilbud"
    → naviger til tilbud-fanen

## Progress-indikator

Vises på steg 1, 2, 3 og 4. Ikke på steg 0.
Fire prikker horisontalt sentrert øverst.

Aktiv prikk:
  width: 24, height: 8, borderRadius: 4
  backgroundColor: '#1B4332'

Inaktiv prikk:
  width: 8, height: 8, borderRadius: 4
  backgroundColor: '#E5E7EB'

Gap mellom prikker: 6px
Margin bottom: 32px

## Navigasjon

Tilbake-pil: vises på steg 1, 2 og 3.
Ionicons "arrow-back-outline", 24px, #374151
Plassert øverst til venstre.
Steg 0: ingen tilbake-pil.
Steg 4: ingen tilbake-pil.

## Animasjon mellom steg

Fade: opacity 0 til 1 over 200ms
Bruk Animated.timing fra react-native
Trigger på hvert steg-bytte

## Steg 0 — Velkomst

Layout: fullskjerm, sentrert, ingen TopBar, ingen tab bar.
Ingen progress-indikator.

Innhold (sentrert vertikalt og horisontalt):
  Logo: "DORG" i DMSerifDisplay, 48px, #1B4332
        eller faktisk logo hvis logoUrl finnes
  Spacing: 32px
  Tittel: "Hei! 👋"
          DMSerifDisplay_400Regular, 36px, #111827
  Spacing: 12px
  Undertittel: "La oss sette opp profilen din
                på 60 sekunder."
               DMSans_400Regular, 17px, #9CA3AF
               textAlign: center
  Spacing: 48px
  Primærknapp: "Kom i gang →"
               Full bredde med 32px horisontalt padding

Lagrer ingenting til Supabase.

## Steg 1 — Fagkategori

Tittel: "Hva jobber du med?"
        DMSerifDisplay_400Regular, 28px, #1B4332
Undertittel: "Vi tilpasser appen etter det."
             DMSans_400Regular, 15px, #9CA3AF

Layout for kategorikort: 2-kolonne grid
Gap: 12px

Hvert kategorikort:
{
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderWidth: 1.5,
  borderColor: '#E5E7EB',
  padding: 16,
  minHeight: 100,
  alignItems: 'flex-start',
  justifyContent: 'space-between',
}

Valgt kategorikort:
{
  backgroundColor: '#F0FDF4',
  borderColor: '#1B4332',
  borderWidth: 2,
}

Innhold i hvert kort:
  Linje 1: Ikon (emoji, fontSize 28) + checkmark hvis valgt
  Spacing: 8px
  Navn: DMSans_700Bold, 15px, #111827
  Beskrivelse: DMSans_400Regular, 12px, #9CA3AF

Checkmark (kun synlig hvis valgt):
  Ionicons "checkmark-circle", 20px, #1B4332
  Plassert øverst til høyre i kortet

Fagkategorier:
  { id: 'snekker',    navn: 'Snekker',    ikon: '🔨', beskrivelse: 'Gulv, kjøkken, bad, innredning' }
  { id: 'maler',      navn: 'Maler',      ikon: '🎨', beskrivelse: 'Innvendig og utvendig maling' }
  { id: 'elektriker', navn: 'Elektriker', ikon: '⚡', beskrivelse: 'Anlegg, sikring, belysning' }
  { id: 'rorlegger',  navn: 'Rørlegger',  ikon: '🔧', beskrivelse: 'VVS, baderom, bereder' }
  { id: 'entreprenor',navn: 'Entreprenør',ikon: '🏗', beskrivelse: 'Renovering og prosjektledelse' }

Femte kort (Entreprenør) spenner full bredde.

Ved valg:
  1. Sett valgtKategori
  2. Forhåndsvelg ALLE tjenester i kategorien
  3. Lagre til Supabase: firma.fagkategori
  4. Vent 300ms
  5. Gå til steg 2

## Steg 2 — Tjenester

Tittel: "Hva tilbyr du?"
Undertittel: "Alle er valgt. Fjern det du ikke driver med."

Vis tjenestene for valgtKategori som pills
i wrap-layout:
  flexDirection: 'row'
  flexWrap: 'wrap'
  gap: 8

Alle tjenester forhåndsvalgt (grønn pill med checkmark).

Aktiv tjeneste-pill:
  backgroundColor: '#1B4332'
  borderRadius: 999
  paddingVertical: 10
  paddingHorizontal: 14
  flexDirection: 'row'
  alignItems: 'center'
  gap: 6
  Checkmark: Ionicons "checkmark", 14px, #fff
  Tekst: DMSans_600SemiBold, 13px, #fff

Inaktiv tjeneste-pill:
  backgroundColor: '#fff'
  borderRadius: 999
  borderWidth: 1.5
  borderColor: '#E5E7EB'
  paddingVertical: 10
  paddingHorizontal: 14
  Tekst: DMSans_400Regular, 13px, #6B7280

Minimum 1 tjeneste må være valgt.
Maks 10 tjenester kan velges.
Hvis bruker prøver å fjerne siste tjeneste:
  Vis inline feilmelding under pill-lista:
  "Velg minst én tjeneste for å fortsette"

Primærknapp: "Neste →"
Disables hvis ingen tjenester er valgt.

Ved Neste:
  Lagre til Supabase: firma.tjenester
  Gå til steg 3

## Steg 3 — Priser

Tittel: "Hva tar du betalt?"
Undertittel: "Du kan alltid endre dette senere."

To seksjoner:

TIMEPRIS-SEKSJON:
  Label: "TIMEPRIS" (caps, muted)
  Stort tall-input: default 950
  Suffix: "kr/t" ved siden av tallet
  Forklaringstekst under:
    "De fleste [fagkategori-navn]e tar 800–1 100 kr/t"

  Timepris-hint per kategori:
    snekker:    "De fleste snekkere tar 800–1 100 kr/t"
    maler:      "De fleste malere tar 750–1 000 kr/t"
    elektriker: "De fleste elektrikere tar 900–1 200 kr/t"
    rorlegger:  "De fleste rørleggere tar 850–1 150 kr/t"
    entreprenor:"De fleste entreprenører tar 900–1 300 kr/t"

MATERIALPÅSLAG-SEKSJON:
  Label: "MATERIALPÅSLAG" (caps, muted)
  Stort tall-input: default 15
  Suffix: "%" ved siden av tallet
  Forklaringstekst under:
    "Påslag på materialer du kjøper inn. 15% er vanlig."

Tastatur åpnes automatisk på timepris-felt.
keyboardType="number-pad" på begge felt.

Primærknapp: "Neste →"

Ved Neste:
  Lagre til Supabase: firma.timepris, firma.material_paslag
  Gå til steg 4

## Steg 4 — Ferdig

Ingen progress-indikator.
Ingen tilbake-pil.

Tittel: "Alt klart! 🎉"
        DMSerifDisplay_400Regular, 32px, sentrert
Undertittel: "Dorg er klar til å lage tilbud for deg."
             DMSans_400Regular, 16px, #9CA3AF, sentrert

Oppsummerings-kort:
{
  backgroundColor: '#F0FDF4',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#BBF7D0',
  padding: 20,
  marginVertical: 32,
}

Innhold i kortet:
  Rad 1: [ikon] [fagkategori-navn]
          DMSans_700Bold, 17px, #1B4332
  Spacing: 12px
  Rad 2: "[antall] tjenester valgt"
          DMSans_400Regular, 14px, #374151
  Rad 3: "[timepris] kr/t · [påslag]% påslag"
          DMSans_400Regular, 14px, #374151

Primærknapp: "Lag mitt første tilbud →"
  Ved trykk:
    Kall onFerdig() med oppdatert firma-objekt
    Naviger til tilbud-fanen:
      router.replace('/(tabs)/tilbud')

## Supabase-lagring per steg

Steg 1 ferdig → oppdaterFirma(userId, { fagkategori })
Steg 2 ferdig → oppdaterFirma(userId, { tjenester })
Steg 3 ferdig → oppdaterFirma(userId, { timepris, material_paslag })

Ikke vent til steg 4 med å lagre.
Hvis appen krasjer etter steg 2, skal
fagkategori og tjenester allerede være lagret.

## Edge cases

Appen krasjer etter steg 1:
  fagkategori er lagret → bruker ser vanlig
  bedriftsside uten tjenester neste gang.
  Håndter: hvis tjenester er tom array og
  fagkategori er satt, send bruker til steg 2.

Bruker prøver å gå forbi steg 2 uten tjenester:
  Vis feilmelding, blokker neste-knapp.

Bruker skriver 0 i timepris eller påslag:
  Tillat det, ingen validering på pris.

Bruker trykker tilbake fra steg 2 til steg 1:
  Behold valgtKategori og valgteTjenester i state.
  Hvis bruker bytter kategori:
    Erstatt valgteTjenester med nye kategoris tjenester.

## Hva lagres IKKE i onboarding

Firmanavn, org.nr, telefon, epost, adresse:
  Disse er allerede satt fra registrering.
  Onboarding berører ikke disse feltene.