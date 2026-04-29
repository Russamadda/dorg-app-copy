# Materialspesifisering Compact Redesign

## Hva som ble endret

- `components/MaterialSpesifiseringCard.tsx` ble bygget om til en enklere flyt:
  1. søk materiale
  2. velg materiale
  3. rediger i ett aktivt panel
  4. legg til / oppdater i listen
- `lib/materialForslag.ts` ble utvidet fra rene navneforslag til en enkel materialkatalog med `id`, `navn`, `enhet` og søkealias.
- `lib/materialSpesifisering.ts` ble oppdatert til en linjebasert modell med `antall`, `prisPerEnhet` og `linjeTotal`.
- `components/NyttTilbudModal.tsx` lagrer nå hele materiallinjer i stedet for feltvis redigering per rad.

## Summary-visning

- Summary er fortsatt kompakt og samlet i én lett container.
- Den viser:
  - `Valgt materialkostnad`
  - `Spesifisert sum`
  - `Avvik`
- Avvik beholder tydelig, men dempet tone for nær / under / over.

## Ny add/edit-flyt

- Kun ett aktivt add/edit-panel er synlig om gangen.
- Panelet brukes både når brukeren:
  - velger et søkeresultat
  - oppretter et egendefinert materiale
  - trykker på en eksisterende rad i listen
- Panelet inneholder:
  - materialnavn
  - antall
  - pris pr enhet
  - linjetotal
  - legg til / oppdater
  - slett ved redigering av eksisterende rad
  - avbryt / lukk

## Beløps- og antallsinteraksjon

- Antall og pris pr enhet bruker stepper-kontroller som standard.
- Manuell input finnes fortsatt som fallback, men er skjult til brukeren eksplisitt åpner den.
- Enhet kommer fra materialkatalogen, for eksempel `stk`, `m`, `pk`, `m²`, `spann`.

## Søkemønstre som ble gjenbrukt

- Samme grunnmønster som i `LeggTilTjenesterModal` ble videreført:
  - lokal filtrering
  - trimmet søk
  - clear-knapp i søkefeltet
  - begrenset resultatliste
  - enkel custom-add fallback når det ikke finnes eksakt treff

## Preview-sikkerhet

- Tilbudsforhåndsvisningen bruker fortsatt eksisterende deterministiske komposisjonshjelpere.
- `systemPrompt`, `byggPrompt` og AI-generering ble ikke endret.
- Base-teksten beholdes ren internt.
- Materialoversikten settes fortsatt inn uten AI, og uten å mutere originalteksten irreversibelt.

## UI-forenkling

- Fjernet store, alltid-redigerbare radkort.
- Fjernet forslagchips som lå synlige hele tiden i hovedlayouten.
- Fjernet mange samtidige kontroller i hver rad.
- Materiallisten er nå flat og lett, med kompakte rader og enkel trykk-for-å-redigere-interaksjon.
