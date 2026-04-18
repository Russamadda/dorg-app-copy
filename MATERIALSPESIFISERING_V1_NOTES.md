# Materialspesifisering V1

## Hvor funksjonen ble lagt til

- Post-generering i `components/NyttTilbudModal.tsx`
- Modulen vises under oppsummeringskortet og over forhåndsvisningen
- Den er valgfri og påvirker ikke eksisterende flyt hvis brukeren ignorerer den

## Endrede komponenter / hjelpere

- `components/NyttTilbudModal.tsx`
  - Lokal state for materialspesifisering
  - CTA under sammendragskortet
  - Integrasjon med forhåndsvisning og sending
- `components/MaterialSpesifiseringCard.tsx`
  - UI for totals, søk, hurtigforslag, rader og footer actions
- `lib/materialForslag.ts`
  - Statisk forslagssystem per tjeneste med kategori-fallbacks og utvalgte service-overrides
- `lib/materialSpesifisering.ts`
  - Radmodell, summering, avvikslogikk, beløpsformattering og deterministisk tekstkomponering

## State / persistens

- V1 bruker kun app-lokal state i `NyttTilbudModal`
- Materialspesifisering lagres ikke i backend og påvirker ikke utkastpersistens
- State resettes ved ny generering, ved reset/lukk og ved hydrering av nytt utkast

## Slik fungerer tekstkomponeringen

- Grunnteksten fra AI beholdes som base
- Ingen endringer er gjort i `systemPrompt`, `byggPrompt` eller genereringskallet
- Forhåndsvisning og sending bruker en deterministisk komponeringshjelper:
  - `composeOfferTextWithMaterialOverview(baseText, materialRows)`
- Materialseksjonen legges inn som:
  - `Materialoversikt:`
  - punktliste med materialnavn
- Seksjonen forsøkes satt inn før `Pris:`-seksjonen
- Hvis `Pris:` ikke finnes, legges seksjonen trygt til på slutten
- `fjernMaterialoversiktFraTilbudTekst(...)` brukes for å holde base-teksten ren og unngå duplisering

## Gjenbrukt søkelogikk

- Søkeopplegget følger samme enkle app-lokale mønster som i `app/bedrift.tsx` via `LeggTilTjenesterModal`
- Reused ideas:
  - trimmet søkestreng
  - lokal filtrering
  - contains-/prefix-basert treffsortering
  - liten og fokusert resultatliste
  - clear-knapp i input
  - rask add-interaksjon

## Forslagsstruktur

- Kategori-fallbacks for:
  - snekker
  - maler
  - elektriker
  - rørlegger
  - entreprenør
- Tjeneste-overrides for høy-signal tjenester som:
  - `Gulv og parkett`
  - `Terrasse og balkong`
  - `Baderomsrenovering`
  - `Innvendig maling`
  - `Varmtvannbereder bytte`
  - `Ladepunkt elbil`
  - `Drenering`
  - `Vindusbytte`
  - `Dørbytte`
  - `Flislegging`
  - `Kjøkkenmontering`

## V2-anbefalinger

- Vurdere persistering i draft dersom brukere forventer å komme tilbake til spesifikasjonen
- Vurdere fokusstyring til nyopprettet rad ved "Legg til egendefinert rad"
- Eventuelt legge til valgfri kundevennlig summeringslinje for materialseksjonen, fortsatt uten linjepriser
