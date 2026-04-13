/**
 * Placeholdertekst for jobbbeskrivelse i NyttTilbudModal.
 * Nøkler for tjenester må matche eksakt strenger i `constants/tjenester.ts` (TJENESTER_PER_KATEGORI).
 */

import { ALLE_TJENESTER_FLAT } from './tjenester'

/** Når verken tjeneste- eller fagkategori-placeholder finnes. */
export const JOB_BESKRIVELSE_PLACEHOLDER_GENERIC =
  'F.eks: beskriv jobben kort, hva som skal gjøres og omtrent omfang.'

/** Nøkler matcher `FAGKATEGORIER[].id` / firma.fagkategori (normalisert). */
export const PLACEHOLDERS_PER_FAGKATEGORI = {
  snekker:
    'F.eks: Legge parkett i stue og gang (ca 40 kvm), rive gammelt gulv og montere nye lister.',

  maler:
    'F.eks: Male stue og kjøkken, sparkle hull og ujevnheter, to strøk på vegger og tak.',

  elektriker:
    'F.eks: Legge opp nye stikkontakter i stue, bytte downlights og oppgradere sikringsskap.',

  rorlegger:
    'F.eks: Bytte kjøkkenkran, koble opp oppvaskmaskin og legge nye vannrør under vask.',

  entreprenor:
    'F.eks: Grave ut til garasje, klargjøre tomt og støpe såle.',
} as const

type FagkategoriPlaceholderNøkkel = keyof typeof PLACEHOLDERS_PER_FAGKATEGORI

const TJENESTE_TIL_PLACEHOLDER: Record<string, string> = {
  'Gulv og parkett':
    'F.eks: legge parkett i stue og gang (ca 40 kvm), rive gammelt gulv og montere nye lister.',
  Kjøkkenmontering:
    'F.eks: montere nytt kjøkken med 8 skap, tilpasse benkeplate og montere hvitevarer.',
  Baderomsrenovering:
    'F.eks: totalrenovere bad (ca 6 kvm), rive eksisterende innredning og bygge opp nytt våtrom.',
  'Garderobe og innredning':
    'F.eks: bygge garderobeløsning i soverom, montere skap og tilpasse hyller.',
  'Dører og vinduer':
    'F.eks: montere 2 nye ytterdører og justere eksisterende karmer.',
  'Terrasse og balkong':
    'F.eks: bygge terrasse på 30 kvm, legge terrassebord og montere rekkverk.',
  'Riving og demontering':
    'F.eks: rive lettvegg mellom stue og kjøkken, fjerne panel og klargjøre for nytt.',
  'Trapper og rekkverk':
    'F.eks: bygge ny trapp mellom etasjer, montere rekkverk og håndløper.',
  'Panel og listverk':
    'F.eks: montere panel på vegger i stue, sette opp tak- og gulvlister.',
  'Taktekking tre':
    'F.eks: legge nytt tretak på hytte, bytte lekter og undertak.',
  Loftinnredning:
    'F.eks: innrede loft til soverom, isolere og sette opp vegger.',
  'Undertak og bjelkelag':
    'F.eks: utbedre bjelkelag i eldre bolig, rette opp gulv og forsterke konstruksjon.',
  'Garasjebygg tre':
    'F.eks: bygge enkeltgarasje i tre, inkludert reisverk og tak.',
  'Carport og bod':
    'F.eks: sette opp carport med bod, montere tak og kledning.',
  Uteplassbygging:
    'F.eks: bygge platting i hage, legge terrassebord og tilpasse trapp.',
  Vindusbytte:
    'F.eks: bytte 5 vinduer i bolig, tilpasse åpninger og montere nye karmer.',
  Dørbytte:
    'F.eks: bytte ytterdør, tilpasse karm og montere lås.',
  'Sokkelbord og fasadekledning':
    'F.eks: bytte kledning på en vegg, montere nye bord og lekter.',
  'Pipe og ildsted ombygging':
    'F.eks: tilpasse område rundt peis, bygge inn pipe og montere ny peisovn.',
  'Snekkerarbeid generelt':
    'F.eks: diverse snekkerarbeid i bolig, tilpasse løsninger og gjøre mindre utbedringer.',

  'Innvendig maling':
    'F.eks: male stue og gang (ca 60 kvm), sparkle og grunne før maling.',
  'Utvendig maling':
    'F.eks: male enebolig utvendig, vaske vegger og påføre 2 strøk.',
  Tapetsering:
    'F.eks: legge tapet på én vegg i stue, klargjøre underlag og tilpasse mønster.',
  'Beising og lakkering':
    'F.eks: beise terrasse og rekkverk, rense treverk og påføre nytt strøk.',
  Fasademaling:
    'F.eks: male fasade på bolig, skrape løs maling og grunne før maling.',
  Betongmaling:
    'F.eks: male betonggulv i garasje, rengjøre og legge slitesterkt belegg.',
  'Sparkling og overflatebehandling':
    'F.eks: sparkle vegger i stue, slipe og klargjøre for maling.',
  Sprøytemaling:
    'F.eks: sprøytemale tak og vegger, dekke til rom og påføre jevnt strøk.',
  'Gulvbelegg og laminat':
    'F.eks: legge laminatgulv i soverom, fjerne gammelt belegg og tilpasse nytt.',
  Flislegging:
    'F.eks: legge fliser på bad, forberede underlag og fuge flisene.',
  'Maling etter vannkadse':
    'F.eks: utbedre og male vegger etter vannskade, tørke og sparkle før maling.',
  'Garasje og kjellermaling':
    'F.eks: male kjellervegger, rense overflater og påføre fuktsperre.',
  'Maling av møbler og skap':
    'F.eks: male kjøkkenskap, slipe ned overflater og påføre ny farge.',
  'Tak og himlingsmaling':
    'F.eks: male tak i stue, sparkle skjøter og male 2 strøk.',
  'Kalkpuss og spesialpuss':
    'F.eks: legge kalkpuss på vegg, forberede underlag og påføre struktur.',
  'Maling av gjerder og stakitt':
    'F.eks: male hagegjerde, vaske og påføre ny maling.',
  Vindusmaling:
    'F.eks: male vinduskarmer utvendig, skrape og grunne før maling.',
  'Markering og trafikkmaling':
    'F.eks: male opp parkeringslinjer, merke opp område og bruke slitesterk maling.',
  Epoksybelegg:
    'F.eks: legge epoksy på garasjegulv, rengjøre og prime før belegg.',
  'Malerarbeid generelt':
    'F.eks: male ulike rom i bolig, sparkle og påføre flere strøk.',

  'El-anlegg nybygg':
    'F.eks: installere komplett el-anlegg i ny bolig, trekke kabler og montere sikringsskap.',
  'Ombygging el-anlegg':
    'F.eks: oppgradere el-anlegg i bolig, bytte gamle kurser og trekke nye kabler.',
  'Sikringsskap og fordeling':
    'F.eks: bytte sikringsskap, montere nye automatsikringer og fordele kurser.',
  'Stikkontakter og brytere':
    'F.eks: montere nye stikkontakter i stue, trekke kabler og koble til.',
  'Innvendig belysning':
    'F.eks: installere spotter i tak, trekke kabler og montere dimmer.',
  Utebelysning:
    'F.eks: sette opp utelys langs inngang, trekke strøm og montere lamper.',
  'El-varme og varmekabler':
    'F.eks: legge varmekabler i bad, koble til termostat og teste anlegg.',
  'Ladepunkt elbil':
    'F.eks: installere elbillader i garasje, trekke kurs og montere ladeboks.',
  Solcelleinstallasjon:
    'F.eks: montere solcelleanlegg på tak, koble inverter og tilknytte strømnett.',
  'Varmepumpe el-tilkobling':
    'F.eks: koble til varmepumpe, trekke strøm og sikre riktig kurs.',
  'Alarm og adgangskontroll':
    'F.eks: installere alarmsystem, montere sensorer og koble til styring.',
  'Smarthjem og automasjon':
    'F.eks: installere smarthjemløsning, koble lys og styring via app.',
  'Nettverkskabler og data':
    'F.eks: trekke nettverkskabler i bolig, montere datapunkter og switch.',
  'TV og antenne':
    'F.eks: sette opp TV-punkt, trekke antennekabel og koble til signal.',
  Jordfeilbryter:
    'F.eks: installere jordfeilbryter i sikringsskap, teste og sikre anlegg.',
  'Ly lynavleder':
    'F.eks: montere lynavleder på bygg, jorde system og sikre installasjon.',
  'Aggregat og nødstrøm':
    'F.eks: installere nødstrømsløsning, koble aggregat og sikre strømtilførsel.',
  'Industri el-installasjon':
    'F.eks: installere el-anlegg i næringslokale, trekke kabler og koble maskiner.',
  'Lys i bad og våtrom':
    'F.eks: installere belysning på bad, montere spotter og speillys.',
  'Elektrikerarbeid generelt':
    'F.eks: utføre diverse elektrikerarbeid, feilsøke og utbedre anlegg.',

  'Baderom renovering':
    'F.eks: totalrenovere bad, legge nye rør og montere sanitærutstyr.',
  'Varmtvannbereder bytte':
    'F.eks: bytte varmtvannsbereder, koble til rør og teste anlegg.',
  'Rørlegger kjøkken':
    'F.eks: koble opp kjøkken, montere vask og koble til oppvaskmaskin.',
  'Gulvvarme vannbåren':
    'F.eks: installere vannbåren gulvvarme, legge rør og koble til system.',
  'Utvendig vann og avløp':
    'F.eks: legge nye vann- og avløpsrør utvendig, grave og koble til nett.',
  'Frostsikring rør':
    'F.eks: isolere rør i krypkjeller, sikre mot frost og kulde.',
  'Toalett og servant':
    'F.eks: montere nytt toalett og servant, koble til vann og avløp.',
  'Dusj og badekar':
    'F.eks: installere dusj eller badekar, koble rør og montere armatur.',
  'Servant og blandebatteri':
    'F.eks: bytte servant og blandebatteri, koble til rør og teste.',
  'Vaskemaskin tilkobling':
    'F.eks: koble opp vaskemaskin, installere vanninntak og avløp.',
  'Oppvaskmaskin tilkobling':
    'F.eks: koble opp oppvaskmaskin, tilpasse rør og sikre avløp.',
  'Varmepumpe VVS':
    'F.eks: installere varmepumpe, koble til vannsystem og teste.',
  'Radiator og varmeanlegg':
    'F.eks: montere radiatorer, koble til varmeanlegg og justere system.',
  Sprinkleranlegg:
    'F.eks: installere sprinkleranlegg, trekke rør og koble til system.',
  'Pumpe og trykkregulering':
    'F.eks: installere pumpe, justere trykk og sikre vannforsyning.',
  Avløpssanering:
    'F.eks: sanere gamle avløpsrør, legge nye og koble til system.',
  Rørfornying:
    'F.eks: fornye rør uten graving, rehabilitere eksisterende system.',
  Lekkasjesøk:
    'F.eks: finne lekkasje i rør, bruke måleutstyr og utbedre feil.',
  Brannslukningsanlegg:
    'F.eks: installere slukningsanlegg, koble til rør og teste system.',
  'Rørleggerarbeid generelt':
    'F.eks: utføre diverse rørleggerarbeid, reparere og vedlikeholde rør.',

  Totalrenovering:
    'F.eks: totalrenovere bolig, rive eksisterende og bygge opp nytt.',
  'Tilbygg og påbygg':
    'F.eks: bygge tilbygg på bolig, sette opp grunnmur og reisverk.',
  'Garasje og carport':
    'F.eks: bygge garasje, støpe plate og sette opp konstruksjon.',
  'Grunnarbeid og sprengning':
    'F.eks: klargjøre tomt, sprenge fjell og planere område.',
  'Riving og sanering':
    'F.eks: rive bygg, sortere avfall og klargjøre tomt.',
  Prosjektledelse:
    'F.eks: lede byggeprosjekt, koordinere håndverkere og fremdrift.',
  'Betong og muring':
    'F.eks: støpe betongplate, forskale og armere før støp.',
  'Graving og masseflytting':
    'F.eks: grave ut tomt, flytte masser og planere terreng.',
  Drenering:
    'F.eks: grave rundt grunnmur, legge drenering og montere isolasjon.',
  Støttemurer:
    'F.eks: bygge støttemur i hage, sette stein og sikre fundament.',
  Tomtearbeid:
    'F.eks: klargjøre tomt for bygging, planere og drenere område.',
  'Veiarbeid og parkering':
    'F.eks: etablere gårdsplass, legge grus og komprimere underlag.',
  'Støyskjerm og gjerde':
    'F.eks: sette opp støyskjerm, montere stolper og feste plater.',
  'Peling og fundamentering':
    'F.eks: pele grunn, sikre fundament for bygg.',
  'Isolering kjeller og grunn':
    'F.eks: isolere kjellervegger, legge fuktsikring og drenering.',
  Miljøsanering:
    'F.eks: fjerne miljøfarlige materialer, sanere og klargjøre bygg.',
  Asfaltarbeid:
    'F.eks: legge asfalt på gårdsplass, klargjøre underlag og legge dekke.',
  'Brøyting og strøing':
    'F.eks: brøyte gårdsplass om vinter, strø for bedre fremkommelighet.',
  'Hagearbeid og anlegg':
    'F.eks: opparbeide hage, legge plen og sette kantstein.',
  'Entreprenørarbeid generelt':
    'F.eks: utføre variert anleggsarbeid, tilpasse løsninger etter behov.',
}

function normaliserFagkategoriTilPlaceholderNøkkel(
  fagkategori: string
): FagkategoriPlaceholderNøkkel | null {
  const k = fagkategori.trim().toLowerCase()
  if (k === 'rørlegger') return 'rorlegger'
  if (k === 'entreprenør') return 'entreprenor'
  if (k in PLACEHOLDERS_PER_FAGKATEGORI) return k as FagkategoriPlaceholderNøkkel
  return null
}

function placeholderForFagkategori(fagkategori: string | null | undefined): string {
  const raw = fagkategori?.trim()
  if (!raw) return JOB_BESKRIVELSE_PLACEHOLDER_GENERIC
  const key = normaliserFagkategoriTilPlaceholderNøkkel(raw)
  return key ? PLACEHOLDERS_PER_FAGKATEGORI[key] : JOB_BESKRIVELSE_PLACEHOLDER_GENERIC
}

/**
 * A) Tjeneste med kjent eksempeltekst (eksakt treff på valgt tjeneste-streng).
 * B) Ellers fagkategori-basert fallback.
 * C) Ellers generisk fallback.
 */
export function resolveJobbBeskrivelsePlaceholder(
  valgtTjeneste: string | null | undefined,
  fagkategori: string | null | undefined
): string {
  const t = valgtTjeneste?.trim()
  if (t && !/^annet$/i.test(t)) {
    const perTjeneste = TJENESTE_TIL_PLACEHOLDER[t]
    if (perTjeneste) {
      return perTjeneste
    }
  }
  return placeholderForFagkategori(fagkategori)
}

/** Utviklingshjelp: sikrer at alle tjenester i katalogen har placeholder. */
export function tjenesterUtenPlaceholder(): string[] {
  return ALLE_TJENESTER_FLAT.filter(s => !TJENESTE_TIL_PLACEHOLDER[s])
}
