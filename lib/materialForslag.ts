export type MaterialKatalogItem = {
  id: string
  navn: string
  enhet: string
  aliases?: string[]
}

function material(
  id: string,
  navn: string,
  enhet: string,
  aliases: string[] = []
): MaterialKatalogItem {
  return { id, navn, enhet, aliases }
}

export const MATERIAL_KATALOG: MaterialKatalogItem[] = [

  // ── GULV ──────────────────────────────────────────────────────────────
  material('parkett', 'Parkett', 'm²', ['parkettgulv', 'tregulv', 'gulv', 'parkettbord']),
  material('laminat', 'Laminat', 'm²', ['laminatgulv', 'gulv']),
  material('vinylgulv', 'Vinylgulv', 'm²', ['vinyl', 'gulvbelegg', 'pvc gulv', 'luxury vinyl']),
  material('parkett-gulvbord', 'Parkett / gulvbord', 'm²', ['gulvbord', 'tregulv', 'gulv', 'parkettgulv']),
  material('underlag-gulv', 'Underlag', 'm²', ['gulvunderlag', 'underlagsmatte', 'støydemping']),
  material('trinnlydsdemping', 'Trinnlydsdemping', 'm²', ['trinnlyd', 'lydisolasjon', 'støydemping']),
  material('fuktsperre', 'Fuktsperre', 'm²', ['fukt', 'sperre', 'plastfolie']),
  material('dampsperre', 'Dampsperre', 'm²', ['dampsperre', 'plast', 'sperre']),
  material('avrettingsmasse', 'Avrettingsmasse', 'sekk', ['avretting', 'gulvavretting', 'selvutjevnende']),
  material('gulvsparkel', 'Sparkel / reparasjonsmasse', 'sekk', ['sparkel', 'reparasjonsmasse', 'gulvsparkel']),
  material('gulvlister', 'Gulvlister', 'm', ['lister', 'fotlist', 'fotlister', 'gulvlist']),
  material('terskellister', 'Terskellister', 'stk', ['terskellist', 'terskel', 'dorlister']),
  material('overgangsprofiler', 'Overgangsprofiler', 'stk', ['profiler', 'overgangslist', 'overgang', 'terskellist']),
  material('endelister', 'Endelister', 'stk', ['endelist', 'avslutningslist']),
  material('gulvlim', 'Lim', 'boks', ['gulvlim', 'parkettlim', 'lim']),
  material('gulvfugemasse', 'Fugemasse gulv', 'stk', ['fug', 'akryl', 'silikon gulv']),
  material('gulv-festemateriell', 'Festemateriell gulv', 'pk', ['skruer', 'spiker', 'klips']),

  // ── TERRASSE / UTEPLASS ───────────────────────────────────────────────
  material('terrassebord', 'Terrassebord', 'm', ['bord', 'terrasseplank']),
  material('konstruksjonsvirke', 'Impregnert konstruksjonsvirke', 'm', ['virke', 'bjelke', 'konstruksjon', 'impregnert']),
  material('bjelkelag', 'Bjelkelag', 'm', ['bjelker', 'bjelke']),
  material('lekter', 'Lekter', 'm', ['lekt']),
  material('stolpesko', 'Stolpesko', 'stk', ['sko', 'stolpefeste', 'stolpeholder']),
  material('stolper', 'Stolper', 'stk', ['stolpe', 'rekkverk stolpe']),
  material('fundamentmateriell', 'Fundamentmateriell', 'stk', ['fundament', 'søylerør', 'støperør']),
  material('betong-stolper', 'Betong til stolper', 'sekk', ['betong stolper']),
  material('terrasseskruer', 'Terrasseskruer', 'pk', ['skruer terrasse', 'terrassespiker']),
  material('rekkverksdeler', 'Rekkverksdeler', 'stk', ['rekkverk', 'gelender', 'rekkverksplank']),
  material('duk-terrasse', 'Fiberduk', 'rull', ['duk', 'ugressduk', 'fiberduk']),

  // ── TRE / KONSTRUKSJON ────────────────────────────────────────────────
  material('trevirke', 'Trevirke', 'm', ['tre', 'konstruksjonsvirke', 'treverk']),
  material('kryssfiner', 'Kryssfiner', 'plate', ['finer', 'kryssfinerplate']),
  material('osb-plater', 'OSB-plater', 'plate', ['osb', 'sponplate']),
  material('gipsplater', 'Gipsplater', 'plate', ['gips', 'gipsplate', 'stenderverk']),
  material('isolasjon', 'Isolasjon', 'm²', ['isolasjon', 'steinull', 'glassvatt', 'isopor', 'rockwool']),
  material('dampsperre-vegg', 'Dampsperre', 'm²', ['dampsperre', 'plastfolie', 'sperre']),
  material('vindduk', 'Vindduk', 'm²', ['vindduk', 'vindsperre', 'vindtett']),
  material('kledning', 'Kledning', 'm', ['kledning', 'panel', 'fasadekledning', 'trepanel']),
  material('panel', 'Panel', 'm²', ['panel', 'trepanel', 'innvendig kledning']),
  material('undertaksplater', 'Undertaksplater', 'plate', ['undertak', 'plater', 'takplater']),
  material('sokkelbord', 'Sokkelbord', 'm', ['sokkel', 'sokkelbord']),

  // ── LISTVERK / INNREDNING ─────────────────────────────────────────────
  material('listverk', 'Listverk', 'm', ['lister', 'list', 'profilert list']),
  material('fotlist', 'Fotlist', 'm', ['fotlist', 'gulvlist', 'skirting']),
  material('takfugeliste', 'Takfugeliste', 'm', ['takfuge', 'takfugeliste', 'takliste']),
  material('dor-karm', 'Dørblad / karm', 'stk', ['dør', 'karm', 'dørblad', 'innerdør', 'ytterdør']),
  material('vindu', 'Vindu', 'stk', ['vindu', 'vindusrute', 'karm', 'vinduskarm']),
  material('tetningslist', 'Tetningslister', 'm', ['tetning', 'list', 'tetningslist', 'tettningsbånd']),
  material('hengsler', 'Hengsler', 'pk', ['hengsel', 'hengslene', 'scharnier']),
  material('laskasse', 'Låskasse / beslag', 'stk', ['låskasse', 'låsbeslag', 'las', 'låsesystem']),
  material('beslag', 'Beslag', 'stk', ['beslag', 'beslag']),
  material('dekksider', 'Dekksider', 'stk', ['dekksider', 'endeplater', 'sideplater']),
  material('sokkel-kjokken', 'Sokkel', 'm', ['sokkel', 'kjøkkensokkel', 'underskap sokkel']),
  material('monteringsskinner', 'Monteringsskinner', 'm', ['skinner', 'opphengsskinner']),

  // ── BAD / FLISER ──────────────────────────────────────────────────────
  material('fliser', 'Fliser', 'm²', ['flis', 'fliser', 'veggflis', 'gulvflis', 'baderomsfliser', 'keramiske fliser']),
  material('flislim', 'Flislim', 'sekk', ['lim', 'flis lim', 'flisefestemiddel', 'flisemørtel']),
  material('fugemasse-bad', 'Fugemasse', 'pk', ['fug', 'fuge', 'fugepuss', 'silikonmasse']),
  material('membran', 'Membran', 'm²', ['membran', 'tettsjikt', 'våtromsmembran']),
  material('vatromsplater', 'Våtromsplater', 'plate', ['våtromsplater', 'baderomsplater', 'plater bad']),
  material('sluk', 'Sluk / tilbehør', 'stk', ['sluk', 'gulvsluk', 'dusj sluk']),
  material('silikon', 'Silikon', 'stk', ['silikon', 'silikonfuge', 'silikonmasse']),
  material('kantband', 'Kantbånd', 'rull', ['kantbånd', 'membranband', 'forsterkningsbånd']),
  material('avstandskryss', 'Avstandskryss', 'pk', ['kryss', 'fliskryss', 'fugekryss']),
  material('toalett', 'Toalett', 'stk', ['wc', 'do', 'toalett', 'vegghengt toalett']),
  material('servant', 'Servant', 'stk', ['vask', 'servant', 'håndvask', 'kum']),
  material('blandebatteri', 'Blandebatteri', 'stk', ['kran', 'batteri', 'blandebatteri', 'armatur']),
  material('dusjsett', 'Dusjsett', 'stk', ['dusj', 'dusjkabinett', 'dusjvegg']),
  material('badekar', 'Badekar', 'stk', ['kar', 'badekar']),
  material('avlopsmateriell', 'Avløpsdeler', 'stk', ['avløp', 'slanger', 'avløpsrør']),

  // ── MALING / OVERFLATE ────────────────────────────────────────────────
  material('veggmaling', 'Veggmaling', 'spann', ['maling', 'veggfarge', 'innendørsmaling']),
  material('takmaling', 'Takmaling', 'spann', ['takmaling', 'takfarge', 'hvit maling']),
  material('utv-maling', 'Utvendig maling', 'spann', ['husmaling', 'fasademaling', 'utvendig']),
  material('beis', 'Beis', 'spann', ['beis', 'trebeis', 'oljebeis']),
  material('lakk', 'Lakk', 'spann', ['lakk', 'klarlakk', 'gulvlakk']),
  material('epoksy', 'Epoksy', 'spann', ['epoksy', 'epoksybelegg', 'kjellermaling']),
  material('primer', 'Primer', 'spann', ['primer', 'grunning', 'grunnmaling', 'grunder']),
  material('sparkel', 'Sparkel', 'spann', ['sparkel', 'sparkling', 'finsparkel', 'stucco']),
  material('maskeringstape', 'Maskeringstape', 'pk', ['tape', 'malerteip', 'maskeringsband']),
  material('dekkplast', 'Dekkplast', 'rull', ['dekkplast', 'maleplast', 'beskyttelsesplast']),
  material('slipemateriell', 'Slipemateriell', 'pk', ['sliping', 'slipepapir', 'slipeskive']),
  material('ruller-pensler', 'Ruller og pensler', 'pk', ['ruller', 'pensler', 'maleutstyr', 'malekost']),
  material('tapet', 'Tapet', 'rull', ['tapet', 'veggpaper', 'glassvev']),
  material('tapetlim', 'Tapetlim', 'pk', ['tapetlim', 'tapetpasta', 'lim tapet']),

  // ── EL / KABEL ────────────────────────────────────────────────────────
  material('kabel', 'Kabel', 'm', ['ledning', 'kabler', 'el-kabel', 'installasjonsrør']),
  material('trekkeror', 'Trekkerør', 'm', ['trekkerør', 'k-rør', 'kabelkanal', 'rør el']),
  material('koblingsmateriell', 'Koblingsmateriell', 'stk', ['kobling', 'koblingsboks', 'klemmer']),
  material('stikkontakt', 'Stikkontakt', 'stk', ['stikk', 'uttak', 'stikkontakt', 'veggkontakt']),
  material('bryter', 'Bryter', 'stk', ['lysbryter', 'dimmer', 'lysbryteren', 'bryter']),
  material('rammer', 'Rammer', 'stk', ['ramme', 'deksel', 'frontplate']),
  material('veggboks', 'Veggbokser', 'stk', ['veggboks', 'monteringsboks', 'koblingsboks']),
  material('automatsikring', 'Automatsikring', 'stk', ['sikring', 'automat', 'kursbryter']),
  material('jordfeilbryter', 'Jordfeilbryter', 'stk', ['jordfeil', 'vern', 'personvern']),
  material('fordelingsmat', 'Fordelingsmateriell', 'stk', ['fordeling', 'fordelerskap']),
  material('spotter', 'Spotter', 'stk', ['spot', 'downlight', 'innfelt lampe', 'led spot']),
  material('led-driver', 'LED-driver', 'stk', ['driver', 'strømforsyning', 'trafo']),
  material('ladeboks', 'Ladeboks', 'stk', ['lader', 'elbillader', 'ladepunkt', 'wallbox', 'elbil lader']),
  material('jordfeilvern-ladepunkt', 'Jordfeilvern', 'stk', ['jordfeilvern', 'vern', 'rcd']),
  material('varmekabel', 'Varmekabel', 'm', ['varme kabel', 'gulvvarme kabel', 'el-varme']),
  material('termostat', 'Termostat', 'stk', ['termostat', 'gulvvarmestyring', 'styring']),
  material('nettverkskabel', 'Nettverkskabel', 'm', ['nettverkskabel', 'cat6', 'data', 'ethernet']),

  // ── VVS / RØR ─────────────────────────────────────────────────────────
  material('rordeler', 'Rørdeler', 'stk', ['rør', 'rørdel', 'nipler', 'overganger', 'VVS deler']),
  material('ror-m', 'Rør', 'm', ['rørledning', 'vannrør', 'avløpsrør']),
  material('koblinger-vvs', 'Koblinger', 'stk', ['kobling', 'rørkobling', 'presskobling']),
  material('pakninger', 'Pakninger', 'pk', ['pakning', 'tetningsring', 'o-ring']),
  material('ventiler', 'Ventiler', 'stk', ['ventil', 'stengeventil', 'kugleventil']),
  material('varmtvannsbereder', 'Varmtvannbereder', 'stk', ['bereder', 'varmtvannsbereder', 'varmtvannsbereder bytte']),
  material('sikkerhetsventil', 'Sikkerhetsventil', 'stk', ['sikkerhetsventil', 'ekspansjonsventil']),
  material('koblingssett', 'Koblingssett', 'stk', ['kobling', 'koblingssett', 'anslutningssett']),
  material('vannlas', 'Vannlås', 'stk', ['vannlås', 'sifong', 'luktlås']),
  material('drensror', 'Drensrør', 'm', ['drensrør', 'drenering', 'dren']),
  material('varmeror', 'Varmerør', 'm', ['rør', 'gulvvarmerør', 'varmekrets']),
  material('fordeler-vv', 'Fordeler', 'stk', ['fordeler', 'manifold', 'fordelerboks']),
  material('radiator', 'Radiator', 'stk', ['radiator', 'varmeovn', 'elektrisk radiator']),
  material('dusjsett-vvs', 'Dusjsett', 'stk', ['dusj', 'dusjbatteri', 'dusjarmaturer']),

  // ── BETONG / GRUNNARBEID ──────────────────────────────────────────────
  material('betong', 'Betong', 'sekk', ['betong', 'sement', 'mørtel', 'betongblanding']),
  material('armeringsnett', 'Armeringsnett', 'stk', ['nett', 'armering', 'stålfiberbetong']),
  material('armeringsjern', 'Armeringsjern', 'm', ['armering', 'jernstenger', 'armeringsstål']),
  material('forskaling', 'Forskalingsmateriell', 'm', ['forskal', 'forskalingsplater', 'stikkplater']),
  material('lecablokker', 'Lecablokker', 'stk', ['leca', 'blokker', 'murblokk', 'isoblokk']),
  material('mortel', 'Mørtel', 'sekk', ['mørtel', 'murpuss', 'puss', 'sparkel betong']),
  material('pukk', 'Pukk', 'm³', ['pukk', 'singel', 'grus', 'knust stein']),
  material('jordmasser', 'Jordmasser', 'm³', ['masse', 'jord', 'toppmasse', 'oppfyllingsmasser']),
  material('belegningsstein', 'Belegningsstein', 'm²', ['stein', 'belegning', 'heller', 'brostein']),
  material('kantstein', 'Kantstein', 'm', ['kant', 'kantstein', 'fortauskant']),
  material('asfalt', 'Asfaltmasser', 'm²', ['asfalt', 'bitumen', 'asfaltdekke']),
  material('stoettemur', 'Støttemur-elementer', 'stk', ['støttemur', 'mur', 'murgavl']),
  material('duk-grunn', 'Fiberduk', 'm²', ['duk', 'fiberduk', 'ugressduk', 'separasjonsduk']),

  // ── FESTEMATERIELL / GENERISK ─────────────────────────────────────────
  material('skruer-beslag', 'Skruer og beslag', 'pk', ['skruer', 'beslag', 'bolter', 'muttere']),
  material('karmskruer', 'Karmskruer', 'pk', ['karmskrue', 'vinduskarmskruer', 'skruer karm']),
  material('festemateriell', 'Festemateriell', 'pk', ['feste', 'plugger', 'spiker', 'stifter']),
  material('forbruksmateriell', 'Forbruksmateriell', 'pk', ['forbruk', 'materiell', 'div forbruk']),
  material('smadeler', 'Smådeler', 'pk', ['smådeler', 'deler', 'diverse deler']),
  material('tilpasningsmateriell', 'Tilpasningsmateriell', 'pk', ['tilpasning', 'tilpasningsdeler']),
  material('diverse-materialer', 'Diverse materialer', 'pk', ['diverse', 'annet', 'div']),
  material('lim', 'Lim', 'boks', ['lim', 'monteringslim', 'polyuretanlim']),
  material('fugemasse', 'Fugemasse', 'stk', ['fug', 'akryl', 'fugakryl', 'silikon', 'tetningsmasse']),
]

function normaliserSokeTekst(verdi: string): string {
  return verdi
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lagSokefelt(kandidat: MaterialKatalogItem): string[] {
  return [kandidat.navn, ...(kandidat.aliases ?? [])]
    .map(normaliserSokeTekst)
    .filter(Boolean)
}

function lagSoketokens(verdi: string): string[] {
  return normaliserSokeTekst(verdi).split(' ').filter(Boolean)
}

function rangerTreff(query: string, kandidat: MaterialKatalogItem): number {
  const q = normaliserSokeTekst(query)
  const tokens = lagSoketokens(query)
  const felter = lagSokefelt(kandidat)
  const samlet = felter.join(' ')

  if (felter.some(f => f === q)) return 0
  if (felter.some(f => f.startsWith(q))) return 1
  if (felter.some(f => f.includes(q))) return 2
  if (tokens.length > 1 && felter.some(f => tokens.every(t => f.includes(t)))) return 3
  if (tokens.every(t => samlet.includes(t))) return 4
  return 99
}

export function sokMaterialKatalog(
  query: string,
  limit = 7
): MaterialKatalogItem[] {
  const normalisert = normaliserSokeTekst(query)
  const tokens = lagSoketokens(query)
  if (!normalisert || tokens.length === 0) return []

  return MATERIAL_KATALOG
    .filter(item => {
      const felter = lagSokefelt(item)
      const samlet = felter.join(' ')
      return tokens.every(token => samlet.includes(token))
    })
    .sort((a, b) => {
      const rankDiff = rangerTreff(normalisert, a) - rangerTreff(normalisert, b)
      if (rankDiff !== 0) return rankDiff
      return a.navn.localeCompare(b.navn, 'nb-NO')
    })
    .slice(0, limit)
}

// Beholdes for bakoverkompatibilitet hvis noe fortsatt importerer denne
export function hentMaterialKatalogForTjeneste(_tjeneste: string): MaterialKatalogItem[] {
  return MATERIAL_KATALOG
}
