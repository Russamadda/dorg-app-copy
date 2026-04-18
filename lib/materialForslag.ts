import { TJENESTER_PER_KATEGORI } from '../constants/tjenester'

type KategoriKey = keyof typeof TJENESTERSKART

export type MaterialKatalogItem = {
  id: string
  navn: string
  enhet: string
  aliases?: string[]
}

const TJENESTERSKART = TJENESTER_PER_KATEGORI

function material(
  id: string,
  navn: string,
  enhet: string,
  aliases: string[] = []
): MaterialKatalogItem {
  return { id, navn, enhet, aliases }
}

const GENERISKE_FORSLAG = [
  material('festemateriell', 'Festemateriell', 'pk', ['skruer', 'spiker', 'plugger']),
  material('forbruksmateriell', 'Forbruksmateriell', 'pk', ['forbruk', 'materiell']),
  material('smadeler', 'Smådeler', 'pk', ['smådeler', 'deler']),
  material('tilpasningsmateriell', 'Tilpasningsmateriell', 'pk', ['tilpasning']),
  material('diverse-materialer', 'Diverse materialer', 'pk', ['diverse']),
] as const

const KATEGORI_STANDARDER: Record<KategoriKey, MaterialKatalogItem[]> = {
  snekker: [
    material('trevirke', 'Trevirke', 'm', ['tre', 'bord']),
    material('skruer-beslag', 'Skruer og beslag', 'pk', ['beslag']),
    material('listverk', 'Listverk', 'm', ['lister']),
    material('fugemasse', 'Fugemasse', 'stk', ['fug']),
    material('monteringsmateriell', 'Monteringsmateriell', 'pk', ['montering']),
  ],
  maler: [
    material('maling', 'Maling', 'spann', ['malespann']),
    material('primer', 'Primer', 'spann', ['grunning']),
    material('sparkel', 'Sparkel', 'spann', ['sparkling']),
    material('tape-dekkplast', 'Tape og dekkplast', 'pk', ['tape', 'dekkplast']),
    material('ruller-pensler', 'Ruller og pensler', 'pk', ['pensler', 'ruller']),
  ],
  elektriker: [
    material('kabel', 'Kabel', 'm', ['ledning']),
    material('koblingsmateriell', 'Koblingsmateriell', 'stk', ['kobling']),
    material('brytere-stikk', 'Brytere og stikk', 'stk', ['stikkontakt', 'bryter']),
    material('sikringer', 'Sikringsmateriell', 'stk', ['sikring']),
    material('smarthus-deler', 'Smådeler el', 'pk', ['klammer', 'smådeler']),
  ],
  rorlegger: [
    material('rordeler', 'Rørdeler', 'stk', ['rør', 'rørdel']),
    material('koblinger', 'Koblinger', 'stk', ['kobling']),
    material('pakninger', 'Pakninger', 'pk', ['pakning']),
    material('vvs-festemateriell', 'Festemateriell', 'pk', ['feste']),
    material('vvs-forbruk', 'Forbruksmateriell', 'pk', ['forbruk']),
  ],
  entreprenor: [
    material('masser', 'Masser', 'm³', ['masse', 'pukk']),
    material('drensmateriell', 'Drensmateriell', 'm', ['drensrør', 'drenering']),
    material('fiberduk', 'Fiberduk', 'm²', ['duk']),
    material('isolasjon', 'Isolasjonsplater', 'm²', ['isolasjon']),
    material('betongvarer', 'Betongvarer', 'stk', ['betong']),
  ],
}

const TJENESTE_OVERRIDES: Record<string, MaterialKatalogItem[]> = {
  'Gulv og parkett': [
    material('parkett-gulvbord', 'Parkett / gulvbord', 'm²', ['parkett', 'gulvbord']),
    material('underlag-gulv', 'Underlag', 'm²'),
    material('fuktsperre', 'Fuktsperre', 'm²'),
    material('overgangsprofiler', 'Overgangsprofiler', 'stk', ['profiler']),
    material('lydisolasjon', 'Lydisolasjon', 'm²', ['trinnlyd']),
  ],
  'Terrasse og balkong': [
    material('terrassebord', 'Terrassebord', 'm', ['bord']),
    material('bjelkelag', 'Bjelkelag', 'm', ['bjelker']),
    material('terrasseskruer', 'Terrasseskruer', 'pk', ['skruer']),
    material('fundamentmateriell', 'Fundamentmateriell', 'stk', ['fundament']),
  ],
  Baderomsrenovering: [
    material('membran', 'Membran', 'm²'),
    material('fliser', 'Fliser', 'm²', ['flis']),
    material('flislim', 'Flislim', 'pk', ['lim']),
    material('vatromsplater', 'Våtromsplater', 'stk', ['våtromsplater']),
    material('sluk-tilbehor', 'Sluk / tilbehør', 'stk', ['sluk']),
  ],
  'Innvendig maling': [
    material('maling-innvendig', 'Maling', 'spann', ['veg maling']),
    material('sparkel-innvendig', 'Sparkel', 'spann'),
    material('primer-innvendig', 'Primer', 'spann', ['grunning']),
    material('maskeringstape', 'Maskeringstape', 'pk', ['tape']),
    material('slipemateriell', 'Slipemateriell', 'pk', ['sliping']),
  ],
  'Varmtvannbereder bytte': [
    material('varmtvannsbereder', 'Varmtvannbereder', 'stk', ['bereder']),
    material('ror-bereder', 'Rørdeler', 'stk'),
    material('sikkerhetsventil', 'Sikkerhetsventil', 'stk', ['ventil']),
    material('koblingssett-bereder', 'Koblingssett', 'stk', ['kobling']),
  ],
  'Ladepunkt elbil': [
    material('ladeboks', 'Ladeboks', 'stk', ['elbillader']),
    material('kabel-ladepunkt', 'Kabel', 'm'),
    material('jordfeilvern', 'Jordfeilvern', 'stk'),
    material('kursmateriell', 'Kursmateriell', 'stk', ['sikring']),
  ],
  Drenering: [
    material('drensror', 'Drensrør', 'm', ['drensrør']),
    material('pukk', 'Pukk', 'm³'),
    material('fiberduk-drenering', 'Fiberduk', 'm²'),
    material('drenskum', 'Kum / tilbehør', 'stk', ['kum']),
  ],
  Vindusbytte: [
    material('vindu', 'Vindu', 'stk'),
    material('karmskruer-vindu', 'Karmskruer', 'pk', ['karmskrue']),
    material('isolasjon-vindu', 'Isolasjon', 'm²'),
    material('fugemasse-vindu', 'Fugemasse', 'stk'),
    material('listverk-vindu', 'Listverk', 'm'),
  ],
  Dørbytte: [
    material('dor-karm', 'Dørblad / karm', 'stk', ['dør', 'karm']),
    material('karmskruer-dor', 'Karmskruer', 'pk'),
    material('laskasse-beslag', 'Låskasse / beslag', 'stk', ['låskasse']),
    material('listverk-dor', 'Listverk', 'm'),
  ],
  Flislegging: [
    material('fliser-flislegging', 'Fliser', 'm²'),
    material('flislim-flislegging', 'Flislim', 'pk'),
    material('fugemasse-flislegging', 'Fugemasse', 'pk'),
    material('primer-flislegging', 'Primer', 'spann'),
    material('membran-flislegging', 'Membran', 'm²'),
  ],
  Kjøkkenmontering: [
    material('beslag-kjokken', 'Beslag', 'stk'),
    material('monteringsskinner', 'Monteringsskinner', 'm', ['skinner']),
    material('skruer-kjokken', 'Skruer og festemateriell', 'pk', ['skruer']),
    material('fugemasse-kjokken', 'Fugemasse', 'stk'),
    material('tilpasningsmateriell-kjokken', 'Tilpasningsmateriell', 'pk'),
  ],
}

function unikListe(verdier: MaterialKatalogItem[]): MaterialKatalogItem[] {
  const map = new Map<string, MaterialKatalogItem>()
  verdier.forEach(verdi => {
    if (!map.has(verdi.id)) {
      map.set(verdi.id, verdi)
    }
  })
  return [...map.values()]
}

function kategoriForTjeneste(tjeneste: string): KategoriKey | null {
  const match = (Object.keys(TJENESTERSKART) as KategoriKey[]).find(key =>
    TJENESTERSKART[key].includes(tjeneste)
  )
  return match ?? null
}

export function hentMaterialKatalogForTjeneste(tjeneste: string): MaterialKatalogItem[] {
  const kategori = kategoriForTjeneste(tjeneste)
  const kategoriForslag = kategori ? KATEGORI_STANDARDER[kategori] : []
  const override = TJENESTE_OVERRIDES[tjeneste] ?? []
  return unikListe([...override, ...kategoriForslag, ...GENERISKE_FORSLAG])
}

function rangerTreff(query: string, kandidat: MaterialKatalogItem): number {
  const q = query.toLowerCase()
  const felter = [kandidat.navn, ...(kandidat.aliases ?? [])].map(verdi =>
    verdi.toLowerCase()
  )

  if (felter.some(verdi => verdi === q)) return 0
  if (felter.some(verdi => verdi.startsWith(q))) return 1
  if (felter.some(verdi => verdi.includes(` ${q}`))) return 2
  if (felter.some(verdi => verdi.includes(q))) return 3
  return 99
}

export function sokMaterialKatalog(
  tjeneste: string,
  query: string,
  limit = 6
): MaterialKatalogItem[] {
  const normalisert = query.trim().toLowerCase()
  if (!normalisert) return []

  return hentMaterialKatalogForTjeneste(tjeneste)
    .filter(item => {
      const felter = [item.navn, ...(item.aliases ?? [])]
      return felter.some(verdi => verdi.toLowerCase().includes(normalisert))
    })
    .sort((a, b) => {
      const rankDiff = rangerTreff(normalisert, a) - rangerTreff(normalisert, b)
      if (rankDiff !== 0) return rankDiff
      return a.navn.localeCompare(b.navn, 'nb-NO')
    })
    .slice(0, limit)
}
