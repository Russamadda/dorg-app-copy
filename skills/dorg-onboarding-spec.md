# Dorg UX-prinsipper

Du bygger en React Native iOS-app for norske håndverkere. Følg alltid disse prinsippene. De overstyrer generelle konvensjoner når de er i konflikt.

## Hvem er brukeren?

Solo-håndverker, 25-55 år.
Bruker appen stående på en befaring eller i bilen.
Har kanskje skitne hender og liten tid.
Er ikke spesielt teknisk avansert.
Snakker norsk — ofte dialekt.
Mange er østeuropeere med norsk som andrespråk.

Konsekvens:
- Alt skal gå på maks 3 trykk
- Ingen lange skjemaer
- Stor tekst, store tap-targets
- Norsk og direkte språk alltid

## Én handling per skjerm

Hver skjerm og hvert steg har ett tydelig mål og én primær handling.

ALDRI:
- To primærknapper på samme skjerm
- Modal inni modal
- Mer enn 3 steg for en enkel handling
- Skjema med mer enn 4 felt synlig samtidig
- Dropdown der piller fungerer bedre

## Norsk språktone

Direkte, uformell og vennlig.
Snakk til brukeren som en kollega.

ALDRI:
- "Vennligst fyll ut skjemaet"
- "Du må huske å..."
- "Viktig! ..."
- "Vi i Dorg ønsker at du..."
- Corporate-speak eller markedsføringsspråk

GOD TONE:
- "Hva tar du betalt?"
- "Hvilke jobber tar du på deg?"
- "Kom i gang →"
- "Hei! La oss sette opp profilen din."

## Automatisk videre

Når brukeren gjør et tydelig valg med kun ett alternativ
(f.eks. velger fagkategori blant 5), gå automatisk videre
etter 300ms. Ikke krev en "Neste"-knapp.

Bruk "Neste"-knapp kun når:
- Flervalg er mulig (tjenester, etc)
- Handling krever bekreftelsesfasen

## Feilmeldinger

Alltid inline, under det aktuelle elementet.
Aldri alert() eller popup for valideringsfeil.
Alltid forklarende — aldri bare "Feil" eller "Ugyldig".

GOD: "Velg minst én tjeneste for å fortsette"
GOD: "Timepris må være et tall"
DÅRLIG: "Ugyldig input"
DÅRLIG: "Feil! Prøv igjen."

## Feedback på handlinger

Alltid gi umiddelbar visuell respons:
- Valgt state endres øyeblikkelig ved trykk
- Loading-indikator innen 100ms ved API-kall
- Toast-melding ved vellykket lagring
- Knapp disables og viser spinner under lagring

## Modaler

Bruk modal kun for:
- Redigering av eksisterende data (f.eks. bedriftsprofil)
- Bekreftelse på destruktive handlinger (slett, avvis)
- Detaljvisning som ikke er primær navigasjon

IKKE bruk modal for:
- Primær navigasjon
- Lange skjemaer (bruk egen skjerm eller wizard)
- Valg med mer enn 7 alternativer
- Noe brukeren skal gjøre mer enn 10 sekunder

## Progress og loading

Spinner: kun for korte operasjoner under 2 sekunder
Skeleton: for innhold med kjent struktur (kortliste)
Aldri blank skjerm under lasting

## Destruktive handlinger

Alltid bekreftelsesdialog.
Rød tekst/knapp for destruktive valg.
"Avbryt" alltid tilgjengelig og lett å nå.
Standard mønster:
  "Er du sikker?"
  [Avbryt]  [Slett / Avvis / Fjern]

## Onboarding-regler

Maksimalt 5 steg.
Hvert steg har én ting å gjøre.
Alltid mulighet for å gå tilbake (steg 1-3).
Lagre til Supabase underveis — ikke bare på slutten.
Ingen obligatoriske felt som ikke er absolutt nødvendig
for at appen skal fungere.

## Tilbudsflyt — spesifikt

Målet er under 60 sekunder fra åpning til sendt tilbud.
Ingen unødvendige bekreftelsesdialog i tilbudsflyten.
Forhåndsvis alltid generert tekst før sending.
Tillat manuell redigering av generert tekst.
Send-knapp er aldri grået ut med uforklarlig grunn.

## Swipe-interaksjoner

Swipe venstre på tilbudskort = slett (rød bakgrunn + søppel-ikon)
Ingen andre swipe-gester implementert ennå
Swipe-logikk må aldri berøres ved design-oppdateringer