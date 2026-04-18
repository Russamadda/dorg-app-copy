export type MaterialSpesifiseringRad = {
  id: string
  materialId: string | null
  navn: string
  enhet: string
  antall: number
  prisPerEnhet: number
  linjeTotal: number
}

type MaterialSpesifiseringMetadataRad = {
  id?: unknown
  materialId?: unknown
  navn?: unknown
  enhet?: unknown
  antall?: unknown
  prisPerEnhet?: unknown
}

export type MaterialSpesifiseringAvvikTone = 'naer' | 'under' | 'over'

type MaterialSpesifiseringRadInput = {
  id?: string
  materialId?: string | null
  navn?: string
  enhet?: string
  antall?: number
  prisPerEnhet?: number
}

const MATERIALOVERSIKT_TITTEL = 'Materialoversikt:'

function normaliserTall(verdi: number): number {
  return Number.isFinite(verdi) ? verdi : 0
}

function byggId(): string {
  return `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function formaterKr(verdi: number): string {
  return `${Math.round(verdi).toLocaleString('nb-NO')} kr`
}

export function formaterBelopInput(verdi: string | number): string {
  const digits = String(verdi).replace(/[^\d]/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function parseBelopInput(verdi: string): number {
  const digits = verdi.replace(/[^\d]/g, '')
  if (!digits) return 0
  const parsed = parseInt(digits, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formaterAntall(verdi: number): string {
  const normalisert = normaliserTall(verdi)
  if (Math.abs(normalisert - Math.round(normalisert)) < 0.001) {
    return Math.round(normalisert).toString()
  }
  return normalisert.toLocaleString('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formaterAntallInput(verdi: number | string): string {
  if (typeof verdi === 'number') return formaterAntall(verdi)
  const normalisert = verdi.replace(/[^0-9,.\s]/g, '').replace(/\./g, ',')
  return normalisert
}

export function parseAntallInput(verdi: string): number {
  const normalisert = verdi.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalisert) return 0
  const parsed = Number.parseFloat(normalisert)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function beregnMaterialLinjeTotal(antall: number, prisPerEnhet: number): number {
  return Math.max(0, Math.round(normaliserTall(antall) * normaliserTall(prisPerEnhet)))
}

export function byggMaterialSpesifiseringRad(
  input: MaterialSpesifiseringRadInput = {}
): MaterialSpesifiseringRad {
  const antall = Math.max(0, normaliserTall(input.antall ?? 0))
  const prisPerEnhet = Math.max(0, Math.round(normaliserTall(input.prisPerEnhet ?? 0)))

  return {
    id: input.id ?? byggId(),
    materialId: input.materialId ?? null,
    navn: input.navn?.trim() ?? '',
    enhet: input.enhet?.trim() || 'stk',
    antall,
    prisPerEnhet,
    linjeTotal: beregnMaterialLinjeTotal(antall, prisPerEnhet),
  }
}

export function summerMaterialSpesifisering(rader: MaterialSpesifiseringRad[]): number {
  return rader.reduce(
    (sum, rad) => sum + beregnMaterialLinjeTotal(rad.antall, rad.prisPerEnhet),
    0
  )
}

export function byggMaterialSpesifiseringSignatur(
  rader: MaterialSpesifiseringRad[]
): string {
  return rader
    .map(rad =>
      [
        rad.id,
        rad.materialId ?? '',
        rad.navn.trim(),
        rad.enhet.trim(),
        String(rad.antall),
        String(rad.prisPerEnhet),
        String(rad.linjeTotal),
      ].join('|')
    )
    .join('||')
}

export function avvikFraMaterialkostnad(
  valgtMaterialkostnad: number,
  spesifisertSum: number
): number {
  return spesifisertSum - valgtMaterialkostnad
}

export function vurderMaterialAvvik(
  valgtMaterialkostnad: number,
  spesifisertSum: number
): MaterialSpesifiseringAvvikTone {
  const delta = avvikFraMaterialkostnad(valgtMaterialkostnad, spesifisertSum)
  const referanse = Math.max(1, valgtMaterialkostnad)
  const relativtAvvik = Math.abs(delta) / referanse

  if (relativtAvvik <= 0.05) return 'naer'
  if (delta < 0) return 'under'
  return 'over'
}

export function harBrukbareMaterialrader(rader: MaterialSpesifiseringRad[]): boolean {
  return rader.some(
    rad =>
      rad.navn.trim().length > 0 &&
      rad.antall > 0 &&
      rad.prisPerEnhet > 0 &&
      rad.linjeTotal > 0
  )
}

export function harMaterialraderForTekst(rader: MaterialSpesifiseringRad[]): boolean {
  return rader.some(rad => rad.navn.trim().length > 0 && rad.linjeTotal > 0)
}

function materialoversiktLinje(rad: MaterialSpesifiseringRad): string | null {
  const navn = rad.navn.trim()
  if (!navn) return null
  if (rad.antall > 0 && rad.enhet.trim()) {
    return `- ${formaterAntall(rad.antall)} ${rad.enhet} ${navn}`
  }
  return `- ${navn}`
}

function byggMaterialoversiktSeksjon(rader: MaterialSpesifiseringRad[]): string | null {
  const punkter = rader.map(materialoversiktLinje).filter(Boolean)

  if (punkter.length === 0) return null
  return `${MATERIALOVERSIKT_TITTEL}\n${punkter.join('\n')}`
}

export function fjernMaterialoversiktFraTilbudTekst(tekst: string): string {
  const linjer = tekst.split('\n')
  const ut: string[] = []
  let hopperOver = false

  for (let i = 0; i < linjer.length; i += 1) {
    const trimmet = linjer[i].trim()

    if (!hopperOver && trimmet === MATERIALOVERSIKT_TITTEL) {
      hopperOver = true
      continue
    }

    if (hopperOver) {
      const erBullet = trimmet.startsWith('- ')
      const erTom = trimmet.length === 0
      const erNySeksjon =
        trimmet === 'Pris:' ||
        trimmet === 'Dette er avtalt:' ||
        trimmet === 'Dette er inkludert:' ||
        trimmet === 'Viktig å merke seg:' ||
        trimmet === 'Oppstart:' ||
        trimmet === 'Gyldighet:'

      if (erBullet || erTom) {
        continue
      }

      if (erNySeksjon) {
        hopperOver = false
        ut.push(linjer[i])
        continue
      }

      hopperOver = false
    }

    ut.push(linjer[i])
  }

  return ut
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function composeOfferTextWithMaterialOverview(
  baseText: string,
  rader: MaterialSpesifiseringRad[]
): string {
  const seksjon = byggMaterialoversiktSeksjon(rader)
  const rensetBase = fjernMaterialoversiktFraTilbudTekst(baseText).trim()

  if (!seksjon) return rensetBase

  const prisMatch = /^Pris:\s*$/m.exec(rensetBase)
  if (prisMatch?.index !== undefined) {
    const førPris = rensetBase.slice(0, prisMatch.index).trimEnd()
    const prisOgEtter = rensetBase.slice(prisMatch.index).trimStart()
    return `${førPris}\n\n${seksjon}\n\n${prisOgEtter}`.trim()
  }

  return `${rensetBase}\n\n${seksjon}`.trim()
}

export function serialiserMaterialSpesifiseringRader(
  rader: MaterialSpesifiseringRad[]
): Array<{
  id: string
  materialId: string | null
  navn: string
  enhet: string
  antall: number
  prisPerEnhet: number
}> {
  return rader.map(rad => ({
    id: rad.id,
    materialId: rad.materialId,
    navn: rad.navn,
    enhet: rad.enhet,
    antall: rad.antall,
    prisPerEnhet: rad.prisPerEnhet,
  }))
}

function lesMaterialSpesifiseringFraUkjent(input: unknown): MaterialSpesifiseringRad[] {
  if (!Array.isArray(input)) return []

  return input
    .map(rad => {
      const kandidat = (rad ?? {}) as MaterialSpesifiseringMetadataRad
      return byggMaterialSpesifiseringRad({
        id: typeof kandidat.id === 'string' ? kandidat.id : undefined,
        materialId:
          typeof kandidat.materialId === 'string' || kandidat.materialId === null
            ? kandidat.materialId
            : undefined,
        navn: typeof kandidat.navn === 'string' ? kandidat.navn : '',
        enhet: typeof kandidat.enhet === 'string' ? kandidat.enhet : 'stk',
        antall: typeof kandidat.antall === 'number' ? kandidat.antall : 0,
        prisPerEnhet: typeof kandidat.prisPerEnhet === 'number' ? kandidat.prisPerEnhet : 0,
      })
    })
    .filter(rad => rad.navn.trim().length > 0 || rad.linjeTotal > 0)
}

export function parseMaterialSpesifiseringFraMetadata(
  metadata?: Record<string, unknown> | null
): MaterialSpesifiseringRad[] {
  if (!metadata) return []

  const kandidater = [
    lesMaterialSpesifiseringFraUkjent(metadata.materialSpesifiseringRader),
    lesMaterialSpesifiseringFraUkjent(metadata.material_spesifisering_rader),
    lesMaterialSpesifiseringFraUkjent(metadata.materialSpesifisering),
  ]

  return kandidater.find(kandidat => kandidat.length > 0) ?? []
}
