export const FAGKATEGORIER = [
  {
    id: 'snekker',
    navn: 'Snekker',
    ikon: '🔨',
    beskrivelse: 'Gulv, kjøkken, bad, innredning',
    timeprisHint: 'De fleste snekkere tar 800–1 100 kr/t',
  },
  {
    id: 'maler',
    navn: 'Maler',
    ikon: '🎨',
    beskrivelse: 'Innvendig og utvendig maling',
    timeprisHint: 'De fleste malere tar 750–1 000 kr/t',
  },
  {
    id: 'elektriker',
    navn: 'Elektriker',
    ikon: '⚡',
    beskrivelse: 'Anlegg, sikring, belysning',
    timeprisHint: 'De fleste elektrikere tar 900–1 200 kr/t',
  },
  {
    id: 'rorlegger',
    navn: 'Rørlegger',
    ikon: '🔧',
    beskrivelse: 'VVS, baderom, bereder',
    timeprisHint: 'De fleste rørleggere tar 850–1 150 kr/t',
  },
  {
    id: 'entreprenor',
    navn: 'Entreprenør',
    ikon: '🏗',
    beskrivelse: 'Renovering og prosjektledelse',
    timeprisHint: 'De fleste entreprenører tar 900–1 300 kr/t',
  },
]

export const TJENESTER_PER_KATEGORI: Record<string, string[]> = {
  snekker: [
    'Gulvbytte og parkettlegging',
    'Kjøkkenmontering',
    'Baderomsrenovering',
    'Garderobe og innredning',
    'Dører og vinduer',
    'Terrasse og balkong',
  ],
  maler: [
    'Innvendig maling',
    'Utvendig maling og fasade',
    'Tapetsering og sparkling',
    'Beising og beis',
    'Garasje og bod',
  ],
  elektriker: [
    'Ny sikringstavle',
    'Stikkontakter og brytere',
    'Utebelysning',
    'El-varme',
    'Ladepunkt elbil',
  ],
  rorlegger: [
    'Varmtvannsbereder',
    'Baderom VVS',
    'Oppvaskmaskin og vaskemaskin',
    'Lekkasje og rørskifte',
    'Frostskade',
  ],
  entreprenor: [
    'Totalrenovering',
    'Tilbygg og påbygg',
    'Garasje og carport',
    'Grunnarbeid',
    'Riving og sanering',
  ],
}
