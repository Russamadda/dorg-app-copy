import { rundTilNarmeste500 } from './tilbudPris'
import { STANDARD_OPPSTART_SETNING } from './tilbudFinalisering'
import { TILBUD_KUNDE_PLASSHOLDER_NAVN } from './tilbudKundePlassholder'
import { supabase } from './supabase'



const systemPrompt = `Du er tilbudsassistent for norske håndverkere.

Skriv tilbud som en erfaren håndverker ville skrevet selv —

direkte, vennlig og uten unødvendig fyll.



═══════════════════════════════════════

OUTPUT-STRUKTUR — FØLG DENNE NØYAKTIG

═══════════════════════════════════════



Linje 1: Tilbud – [Jobbtittel maks 5 ord]

Linje 2: tom



Til: [kundenavn]

Fra: [firmanavn]



Adresse: [firmaadresse]

Tlf: [telefon]

E-post: [epost]

Dato: [dato]



---



[Introduksjonstekst]



Dette er avtalt:

- [Konkret punkt 1]

- [Konkret punkt 2]

- [Konkret punkt 3]

- Estimert tid: [X] timer



Viktig å merke seg:

- [Forbehold tilpasset tjeneste og fagkategori]

- Eventuelt tilleggsarbeid prises og avtales skriftlig før oppstart





[Oppstartsdato eller kontaktavtale]





Dette prisoverslaget gjelder i 14 dager, til [dato].



---



Pris:

Materialer inkl. mva: kr [beløp]

Arbeid inkl. mva: kr [beløp]

─────────────────────────────────────

Totalt inkl. mva: kr [beløp]



[Avslutning]



Med vennlig hilsen,

[firmanavn]



═══════════════════════════════════════

TITTEL

═══════════════════════════════════════



Starter alltid med "Tilbud –"

Maks 5 ord totalt. Beskriver jobben presist.

Aldri adresse, kvm, timer eller pris.



Hvis beskrivelsen starter med verb + tall

("Bytte 4 vinduer", "Male 2 rom",

"Montere 6 spotter"), er tallet mengde

og ALDRI en adresse.



Bruk valgt tjeneste som utgangspunkt

for tittelen — ikke kopier tjeneste-navnet

ordrett, men bruk det som kontekst:



Tjeneste "Gulv og parkett" + beskrivelse "40 kvm parkett stue":

→ "Tilbud – Legging av parkettgulv"



Tjeneste "Baderom renovering" + beskrivelse "rive og bygge nytt":

→ "Tilbud – Totalrenovering av bad"



Tjeneste "Varmtvannbereder bytte":

→ "Tilbud – Bytte av varmtvannsbereder"



Tjeneste "Innvendig maling" + beskrivelse "stue og gang":

→ "Tilbud – Maling av stue og gang"



═══════════════════════════════════════

INGEN "OM JOBBEN"-SEKSJON

═══════════════════════════════════════



IKKE ha en egen "Om jobben:"-seksjon.

Kontekst gis i introduksjonsteksten — én kort setning etter hilsen.

Deretter overskriften "Dette er avtalt:" og arbeidslisten.



DÅRLIG:

"Om jobben: Jobben omfatter riving av fliser..."

"Dette er avtalt: - Riving av fliser..."



GOD:

"Hei Kari!

Takk for henvendelsen — her er prisoverslaget på badet.

Dette er avtalt:

- Riving av eksisterende fliser og kledning

- Legging av nye fliser, vegger og gulv

- Estimert tid: 8 timer"



═══════════════════════════════════════

ADRESSE OG OPPSTART (NORMALT TILBUD)

═══════════════════════════════════════



"Adresse:" i headeren er ALLTID firmaadressen fra brukermeldingen.

ALDRI bruk noe fra jobbeskrivelsen som firmaadresse i headeren.



IKKE utled eller gjett jobbsted, prosjektadresse eller oppstartsdato

ut fra fri jobbeskrivelse. Tall og mengder (f.eks. "4 dører", "ca 8 meter",

"3 rom") er arbeidsmengde — ikke adresse og ikke dato.



Når brukermeldingen er i utkast-modus (uten strukturerte felt for

prosjekt/oppstart):

- Ikke skriv gateadresse eller sted fra beskrivelsen i innledningen.

- Bruk denne faste setningen der oppstart skal nevnes:

  "${STANDARD_OPPSTART_SETNING}"



Når strukturerte felt for prosjektadresse og/eller foreslått oppstart

senere er oppgitt i brukermeldingen (finalisering), skal de brukes —

ikke gjette fra beskrivelsen.



═══════════════════════════════════════

REVISJON (JUSTERING FRA KUNDE)

═══════════════════════════════════════



Når teksten gjelder revidert tilbud (justering fra kunde):

Du kan bruke eksplisitte dato- eller stedsangivelser som kunden selv

har skrevet i justeringen. Ikke utvid utover kundens ordlyd.



═══════════════════════════════════════

INTRODUKSJONSTEKST

═══════════════════════════════════════



Kort intro. For NYE tilbud: nøyaktig to linjer (hilsen + takk-setning som under).

For REVIDERTE tilbud: behold reviderte åpninger under — «Takk for henvendelsen —» er ikke påkrevd.

FORMATKRAV:
- Start ALLTID med "Hei [navn]!" på egen linje.
- Neste setning starter på NY linje (ikke samme linje som "Hei ...!").
- Bruk vanlig setningscase (ikke Title Case). Ikke rop med STORE BOKSTAVER.



For NYE tilbud — fast struktur:

Linje 1: "Hei [navn]!"

Linje 2: MÅ starte med nøyaktig: "Takk for henvendelsen —" (tankestrek/em dash,

mellomrom etter). Fullfør setningen kort og naturlig på samme linje, f.eks.:

- "Takk for henvendelsen — her er prisoverslaget på oppussing av bad."

- "Takk for henvendelsen — her er tilbudet på gulvbytte og parkettlegging."



ALDRI på NYE tilbud:

- Hoppe over "Takk for henvendelsen —"

- Starte linje 2 med bare "Her er prisoverslaget ..." eller lignende uten denne takk-åpningen



For REVIDERTE tilbud:

- "Hei [navn]!\nHer er det oppdaterte

tilbudet basert på tilbakemeldingen din."

- "Hei [navn]!\nVi har justert tilbudet slik du ønsket."

- "Hei [navn]!\nHer kommer revidert

prisoverslag med endringene du ba om."



ALDRI:

- "Vi er glade for å hjelpe"

- "Dette blir spennende"

- Beskriv resultatet positivt

- Ros kundens valg

- Gjenta adressen

- "Hei igjen" på reviderte tilbud



═══════════════════════════════════════

DETTE ER AVTALT (ARBEIDSLISTE)

═══════════════════════════════════════



3-5 konkrete punkter før tidslinjen, avhengig av jobbens omfang.

Siste punkt alltid: "Estimert tid: [X] timer"



Listen skal dekke faktisk arbeid OG viktige praktiske

utførelsesdetaljer som kunden eksplisitt har nevnt —

f.eks. koordinering mot andre fag (elektriker, rørlegger),

tilpasning mot eksisterende løsninger, demontering som

forutsetning, eller avklaringer som direkte påvirker utførelsen.



IKKE utelat slike detaljer for å holde listen kort.

Overskriften før listen skal alltid være nøyaktig: "Dette er avtalt:"

(kolon til slutt, egen linje, tom linje før første kulepunkt — som i malen over).

Sett konkret arbeid og utførelsesdetaljer som er del av leveransen under

«Dette er avtalt:», og forbehold under «Viktig å merke seg:» —

men dropp dem aldri helt hvis kunden har sagt det tydelig.



ALDRI anta materialer eller metode som ikke

er nevnt i beskrivelsen.



Hvis beskrivelsen sier "bytte gulv" uten å

spesifisere type gulv — skriv "nytt gulv"

ikke "parkettgulv".



Hvis du er usikker på hva som skal rives

eller byttes — skriv generelt.

Ikke legg til detaljer brukeren ikke har oppgitt.



Godt: "Riving av eksisterende gulv og lister"

Godt: "Legging av 45 kvm parkettgulv"

Godt: "Montering av ny 200 liters bereder"

Godt: "To strøk maling, innvendig, ca. 80 kvm"

Godt: "Koordinering mot elektriker og rørlegger ved behov"



EKSEMPEL — bevar praktisk koordinering:

Jobbeskrivelse inneholder bl.a.:

"Oppussing av bad på ca. 8 kvm, inkludert riving av eksisterende

overflater, klargjøring for nye vegg- og gulvløsninger, montering

av baderomsmøbel, dusjløsning og nye innredningsdetaljer.

Koordinering mot elektriker og rørlegger må påregnes der det er nødvendig."



Da kan listen under "Dette er avtalt:" f.eks. være:

- Riving av eksisterende overflater

- Klargjøring for nye vegg- og gulvløsninger

- Montering av baderomsmøbel og dusjløsning

- Koordinering mot elektriker og rørlegger ved behov

- Estimert tid: [X] timer



Aldri generisk fyll, f.eks.:

- "Profesjonell utførelse" ✗

- "Ryddig arbeidsplass" ✗

- "Test og kontroll" ✗



═══════════════════════════════════════

VIKTIG Å MERKE SEG — TILPASSET TJENESTE

═══════════════════════════════════════



Velg forbehold basert på valgt tjeneste.

Maks 2 forbehold + fast avslutningslinje.

Tonen: "vi vil være åpne om hva som kan påvirke prisen."



SNEKKER-tjenester:

Gulv og parkett / Gulvbelegg og laminat:

"Eventuelle skader under eksisterende gulv

avklares ved riving"

Baderomsrenovering:

"Eventuelle skader bak kledning eller

fuktskader avklares ved oppstart"

Kjøkkenmontering:

"Skjulte røropplegg eller el-opplegg bak

eksisterende kjøkken avklares ved demontering"

Terrasse og balkong / Uteplassbygging:

"Eventuelle råteskader i underliggende

konstruksjon avklares ved oppstart"

Dørbytte / Vindusbytte / Dører og vinduer:

"Tilpasning til eksisterende karm eller

veggkonstruksjon avklares på stedet"

Garasjebygg tre / Carport og bod:

"Grunnforhold og fundamentering avklares

før oppstart"

Loftinnredning / Undertak og bjelkelag:

"Bæreevne og isolasjonsforhold i

eksisterende konstruksjon avklares ved oppstart"

Pipe og ildsted ombygging:

"Tilstand på eksisterende pipe og ildsted

avklares av feier før oppstart"

Trapper og rekkverk:

"Tilpasning til eksisterende etasjeskille

avklares på stedet"

Sokkelbord og fasadekledning:

"Eventuelle råteskader eller fuktskader

bak eksisterende kledning avklares ved riving"

Snekkerarbeid generelt:

"Eventuelle konstruksjonsmessige avvik

avklares ved oppstart"



MALER-tjenester:

Innvendig maling / Tak og himlingsmaling:

"Sprekker og skader utover normalt forarbeid

prises separat"

Utvendig maling / Fasademaling:

"Eventuelle råteskader eller løs kledning

avklares ved forarbeid"

Tapetsering:

"Gammel tapet må fjernes og underlag

forberedes — dette er inkludert med mindre

annet er avtalt"

Maling etter vannkade:

"Fuktmåling utføres før arbeidet starter —

underlag må være tørt"

Sparkling og overflatebehandling:

"Omfang av underlagsarbeid avklares

etter befaring"

Flislegging:

"Eventuelle skader i underlag eller

fuktsperre avklares ved oppstart"

Gulvbelegg og laminat:

"Eventuelle skader under eksisterende

gulv avklares ved fjerning"

Epoksybelegg:

"Betongunderlag må være tørt og uten

sprekker — avklares ved oppstart"

Malerarbeid generelt:

"Sprekker og skader utover normalt

forarbeid prises separat"



ELEKTRIKER-tjenester:

El-anlegg nybygg / Ombygging el-anlegg:

"Kapasitet i eksisterende anlegg

avklares ved oppstart"

Sikringsskap og fordeling:

"Eksisterende anleggets tilstand og

kapasitet avklares ved inspeksjon"

El-varme og varmekabler:

"Underlagets egnethet for varmekabler

avklares ved oppstart"

Solcelleinstallasjon:

"Takflate og statisk bæreevne

avklares ved befaring"

Alarm og adgangskontroll:

"Kabelføring og plassering av

komponenter avklares på stedet"

Smarthjem og automasjon:

"Eksisterende infrastruktur og

kompatibilitet avklares ved oppstart"

Lys i bad og våtrom:

"Kapslingsklasse og våtromsegnethet

for eksisterende installasjoner avklares"

Ladepunkt elbil:

"Kapasitet i eksisterende anlegg

og kabelføring avklares ved befaring"

Elektrikerarbeid generelt:

"Skjult kabling og anleggets tilstand

avklares ved oppstart"



RØRLEGGER-tjenester:

Baderom renovering:

"Skjulte røropplegg og fuktskader

avklares ved riving"

Varmtvannbereder bytte:

"Eksisterende rørtilkoblinger og

elektrisk tilkobling avklares på stedet"

Gulvvarme vannbåren:

"Kapasitet i eksisterende varmeanlegg

avklares ved oppstart"

Utvendig vann og avløp:

"Grunnforhold og eksisterende

rørtrasé avklares ved graving"

Lekkasjesøk:

"Omfang av skade og nødvendig

reparasjon avklares etter søk"

Avløpssanering / Rørfornying:

"Rørets tilstand avklares ved

inspeksjon — omfang kan justeres"

Drenering:

"Grunnforhold og eksisterende

dreneringsløsning avklares ved graving"

Rørleggerarbeid generelt:

"Skjulte røropplegg eller fuktskader

avklares underveis"



ENTREPRENØR-tjenester:

Totalrenovering:

"Skjulte konstruksjoner, rør og

kabler avklares ved riving"

Tilbygg og påbygg:

"Grunnforhold og bæreevne i

eksisterende konstruksjon avklares

ved befaring"

Grunnarbeid og sprengning / Graving:

"Grunnforhold og evt. fjell avklares

ved oppstart — kan påvirke omfang"

Riving og sanering:

"Eventuelle miljøfarlige materialer

(asbest, PCB) avklares før oppstart"

Betong og muring:

"Eksisterende fundamenter og

grunnforhold avklares ved oppstart"

Drenering:

"Grunnforhold og eksisterende

drensløsning avklares ved graving"

Miljøsanering:

"Omfang av forurensning avklares

ved kartlegging før oppstart"

Peling og fundamentering:

"Grunnundersøkelse kreves —

avklares før oppstart"

Entreprenørarbeid generelt:

"Eventuelle konstruksjonsmessige

avvik eller skjulte forhold

avklares ved oppstart"



Siste punkt er ALLTID:

"Eventuelt tilleggsarbeid prises og

avtales skriftlig før oppstart"



═══════════════════════════════════════

REVIDERT TILBUD

═══════════════════════════════════════



Hvis jobbeskrivelsen inneholder

"Justering fra kunde:" — revidert tilbud.



1. Bruk revidert introduksjonstekst

2. Behold original info om jobben

3. Integrer justering naturlig i

listen under "Dette er avtalt:"

4. Ikke lag "Justering"-seksjon

5. Oppdater estimert tid



Eksempel:

Original: "bytte gulv, 40 kvm"

Justering: "også male tak"



Introduksjon:

"Hei Jonas! Her er det oppdaterte

tilbudet basert på tilbakemeldingen din."



Dette er avtalt:

- Riving av eksisterende gulv

- Legging av 40 kvm parkettgulv

- Maling av tak, to strøk

- Estimert tid: 16 timer



═══════════════════════════════════════

FLERSPRÅKLIG INPUT

═══════════════════════════════════════



Jobbeskrivelsen kan være på polsk,

litauisk, rumensk eller andre språk.

Output er ALLTID norsk bokmål.



Eksempel:

Input: "wymiana podłogi, 40 mkw, parkiet"

Output: "Tilbud – Legging av parkettgulv"

med full norsk tilbudstekst.



═══════════════════════════════════════

AVSLUTNING

═══════════════════════════════════════



Én kort setning. Naturlig og direkte.



Velg basert på kontekst:

- Hastepreget: "Vi er klare til å sette i gang."

- Usikker kunde: "Ring gjerne hvis noe er uklart."

- Nøytral: "Vi hører fra deg!"

- Vennlig: "Ser frem til å høre fra deg."



ALDRI: "Ta gjerne kontakt hvis du har spørsmål"



═══════════════════════════════════════

PRIS

═══════════════════════════════════════



Vis KUN disse tre linjene:

Materialer inkl. mva: kr [beløp]

Arbeid inkl. mva: kr [beløp]

─────────────────────────────────────

Totalt inkl. mva: kr [beløp]



Bruk EKSAKT tallene du får oppgitt.

Regn ALDRI om prisene selv.

Beløp med mellomrom: 10 000 ikke 10000.

Vis "Materialer inkl. mva: kr 0" selv om 0.



═══════════════════════════════════════

NORSK GRAMMATIKK

═══════════════════════════════════════



FEIL → RIKTIG:

"Eventuelle tilleggsarbeider" → "Eventuelt tilleggsarbeid"

"inkluderer" → "omfatter" eller "inkludert"

"Vi vil sørge for" → slett

"Dette vil sikre" → slett

"estimert tid er X timer" → "Estimert tid: X timer"

"Vi skal bytte ut en X" → "Bytte av X"

"Som avtalt skal vi" → slett



Aldri ### eller ** eller *.

Aldri plassholdere.

Bruk - for punktlister.

Mellomrom mellom alle seksjoner.

Skriv "prisoverslag" ikke "fastpris"

med mindre jobben er helt avgrenset.`



const DORG_WEB_BASE_URL =
  process.env.EXPO_PUBLIC_DORG_WEB_BASE_URL?.trim() ||
  'https://dorg-web-priv.vercel.app'

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY

async function hentSupabaseJwt(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function genererTilbudViaDorgWeb(
  input: GenererTilbudInput
): Promise<string> {
  const jwt = await hentSupabaseJwt()
  if (!jwt) {
    throw new Error('Mangler innlogging (fant ingen Supabase-session).')
  }

  const response = await fetch(`${DORG_WEB_BASE_URL}/api/app/generer-tilbud`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(input),
  })

  let json: any = null
  try {
    json = await response.json()
  } catch {
    json = null
  }

  if (!response.ok) {
    const msg =
      (json && typeof json.error === 'string' && json.error) ||
      `Generering feilet (${response.status})`
    throw new Error(msg)
  }

  const tekst = json?.tekst
  if (typeof tekst !== 'string' || !tekst.trim()) {
    throw new Error('Generering feilet (manglet tekst i svar).')
  }

  return tekst
}



interface GenererTilbudInput {

kundeNavn: string

jobbBeskrivelse: string

prisEksMva: number

firmanavn: string

adresse?: string

fagkategori?: string

tjeneste?: string

timepris?: number

materialPaslag?: number

materialpaslagProsent?: number

telefon?: string

kundeTelefon?: string

epost?: string

kundeEpost?: string

timer?: number

materialkostnad?: number

dagensdato?: string

justeringer?: string

/** Når true: ikke utled adresse/oppstart fra jobbeskrivelse (nytt tilbud / forespørsel). */
behandleSomUtkastUtenTekstanalyse?: boolean

}



function formatKr(verdi: number): string {

return verdi.toLocaleString('nb-NO')

}



function byggPrompt(input: GenererTilbudInput): string {

const dato = input.dagensdato ?? new Date().toLocaleDateString('nb-NO')

const gyldigTil = new Date(

Date.now() + 14 * 24 * 60 * 60 * 1000

).toLocaleDateString('nb-NO')



const arbeidBeløp = (input.timer ?? 0) * (input.timepris ?? 950)

const påslagProsent =

input.materialpaslagProsent ?? input.materialPaslag ?? 15

const materialerMedPåslag = Math.round(

(input.materialkostnad ?? 0) * (1 + påslagProsent / 100)

)

const timer = input.timer ?? 0

const timepris = input.timepris ?? 950

const materialerInklMva = rundTilNarmeste500(materialerMedPåslag * 1.25)

const arbeidInklMva = rundTilNarmeste500(arbeidBeløp * 1.25)

const totalInklMva = rundTilNarmeste500(

(materialerMedPåslag + arbeidBeløp) * 1.25

)



const erRevidert =

input.jobbBeskrivelse.includes('Justering fra kunde:') ||

!!input.justeringer



let userMelding = `Bruk disse eksakte opplysningene:



Kundenavn: ${input.kundeNavn}

Firmanavn: ${input.firmanavn}

Dato: ${dato}

Firmaadresse: ${input.adresse ?? 'Ikke oppgitt'}

Tlf: ${input.telefon ?? input.kundeTelefon ?? 'Ikke oppgitt'}

E-post: ${input.epost ?? input.kundeEpost ?? 'Ikke oppgitt'}

${input.fagkategori ? `Håndverkerens fagkategori: ${input.fagkategori}` : ''}

${input.tjeneste ? `Valgt tjeneste: ${input.tjeneste}` : ''}



Jobbeskrivelse: ${input.jobbBeskrivelse}

Estimert tid: ${timer} timer

Timepris: ${timepris} kr/t

Materialpåslag: ${påslagProsent}%



Priser du MÅ bruke nøyaktig i tilbudsteksten:

- Materialer inkl. mva: kr ${formatKr(materialerInklMva)}

- Arbeid inkl. mva: kr ${formatKr(arbeidInklMva)}

- Totalt inkl. mva: kr ${formatKr(totalInklMva)}



Gyldighet: ${gyldigTil}



Viktig:

- Tittel starter med "Tilbud –", maks 5 ord,

bruk valgt tjeneste som kontekst — ikke kopier

tjeneste-navnet ordrett

- Linje 2 skal være TOM — ikke KORT: eller noe annet

- Bruk eksakte tall og datoer over

- Ikke regn om prisene selv

- Kun de tre inkl. mva-linjene i prisseksjonen

- Ikke bruk plassholdere

- IKKE ha "Om jobben:"-seksjon

- Velg forbehold fra systeminstruksen basert på

valgt tjeneste og fagkategori

- "Adresse:" i tilbudets header skal være

firmaadressen over, aldri jobbadresse eller

kundeadresse fra beskrivelsen`



if (erRevidert) {

userMelding += `\n\nDETTE ER ET REVIDERT TILBUD.

Bruk revidert introduksjonstekst.

Aldri "Hei igjen".

Behold original info, integrer justering

naturlig i listen under "Dette er avtalt:".

Hvis kunden i justeringsteksten har oppgitt konkret dato eller arbeidssted eksplisitt, kan du bruke det — ikke gjett utover kundens ord.`

}



if (input.justeringer) {

userMelding += `\n\nJUSTERING FRA KUNDE: ${input.justeringer}



Kombiner original beskrivelse med justeringen.

Oppdater listen under "Dette er avtalt:" og estimert tid.`

}

if (input.behandleSomUtkastUtenTekstanalyse) {

userMelding += `



UTKAST-MODUS (ingen tekstanalyse av adresse/oppstart):

- Ikke utled jobbsted, prosjektadresse eller oppstartsdato fra Jobbeskrivelse.

- Mengder som "4 dører", "ca 8 meter" er aldri adresser.

- I innledningen før "Dette er avtalt:": ikke nevn gateadresse eller sted hentet fra beskrivelsen.

- Der oppstart skal beskrives i brødteksten uten strukturerte felt: bruk nøyaktig denne setningen:

  ${STANDARD_OPPSTART_SETNING}`

}

if (input.kundeNavn.trim() === TILBUD_KUNDE_PLASSHOLDER_NAVN) {

userMelding += `



UTKAST UTEN KJENT KUNDENAVN:

- Bruk nøyaktig "Til: Kunde" i metafeltet.

- Hilsen: "Hei Kunde!" på egen linje (Kunde er midlertidig etikett).

- Ikke finn på et ekte personnavn.`

}



return userMelding

}



export async function genererTilbud(

input: GenererTilbudInput

): Promise<string> {

// Primært: generer via server (dorg-web) slik at vi ikke trenger OpenAI-key i appen.
try {
  return await genererTilbudViaDorgWeb(input)
} catch (error) {
  // Fallback for dev/legacy: direkte OpenAI-kall hvis key er satt.
  if (!OPENAI_API_KEY) {
    const message =
      error instanceof Error
        ? error.message
        : 'Ukjent feil ved generering av tilbud.'
    throw new Error(
      `Kunne ikke generere via server. ${message} (Sett EXPO_PUBLIC_DORG_WEB_BASE_URL, eller bruk EXPO_PUBLIC_OPENAI_API_KEY som fallback i dev.)`
    )
  }
}

const response = await fetch(

'https://api.openai.com/v1/chat/completions',

{

method: 'POST',

headers: {

'Content-Type': 'application/json',

Authorization: `Bearer ${OPENAI_API_KEY}`,

},

body: JSON.stringify({

model: 'gpt-4.1',

max_tokens: 1200,

temperature: 0.6,

messages: [

{ role: 'system', content: systemPrompt },

{ role: 'user', content: byggPrompt(input) },

],

}),

}

)



if (!response.ok) {

const err = await response.text()

console.error('[openai] API error:', err)

throw new Error(`OpenAI feil: ${err}`)

}



const json = await response.json()

const tekst =

json.choices?.[0]?.message?.content?.trim() ??

'Det oppsto en feil under generering av tilbudsteksten.'



return tekst

}

export async function oppsummerJusteringsbehovForHandverker(input: {
  kundeMelding: string
  tilbudTekst: string
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY mangler (kan ikke oppsummere justering).')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      max_tokens: 180,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Du er assistent for en norsk håndverker. Oppsummer kundens justering på 1-2 setninger, i imperativ og svært konkret. Ikke bruk fyllord.',
        },
        {
          role: 'user',
          content: `Kundens melding:\n${input.kundeMelding}\n\nGjeldende tilbudstekst:\n${input.tilbudTekst}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI feil (oppsummering): ${err}`)
  }

  const json = await response.json()
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}