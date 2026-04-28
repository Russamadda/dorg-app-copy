import { type MaterialSpesifiseringRad } from './materialSpesifisering'

export const MATERIAL_START = '<!-- MATERIAL_START -->'
export const MATERIAL_END = '<!-- MATERIAL_END -->'

const MATERIAL_RAD_BREDDE = 54

export function harGyldigeMarkorer(tekst: string): boolean {
  const start = tekst.indexOf(MATERIAL_START)
  const end = tekst.indexOf(MATERIAL_END)
  return start !== -1 && end !== -1 && start < end
}

function formaterMengde(antall: number, enhet: string): string {
  const erDesimal = enhet === 'm' || enhet === 'm²' || enhet === 'm³'
  const tall = erDesimal
    ? Number(antall.toFixed(1)).toLocaleString('nb-NO')
    : String(Math.round(antall))
  return `${tall} ${enhet}`
}

function byggMaterialRad(navn: string, verdi: string): string {
  const prikkBredde = Math.max(4, MATERIAL_RAD_BREDDE - navn.length - verdi.length)
  return `- ${navn} ${'.'.repeat(prikkBredde)} ${verdi}`
}

export function byggMaterialSeksjon(rader: MaterialSpesifiseringRad[]): string {
  const brukbare = rader.filter(
    r => r.navn.trim() && r.antall > 0 && r.prisPerEnhet > 0
  )
  if (!brukbare.length) return ''

  const linjer: string[] = ['Materialer inkludert:']

  for (const r of brukbare) {
    const navn = r.navn.trim()
    const mengde = formaterMengde(r.antall, r.enhet)
    linjer.push(byggMaterialRad(navn, mengde))
  }

  return linjer.join('\n')
}

function ryddOrphanedeMarkorer(tekst: string): string {
  return tekst
    .replace(MATERIAL_START, '')
    .replace(MATERIAL_END, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function leggInnMaterialSeksjon(tekst: string, seksjon: string): string {
  const kilde = harGyldigeMarkorer(tekst) ? tekst : ryddOrphanedeMarkorer(tekst)

  if (harGyldigeMarkorer(kilde)) {
    const startIdx = kilde.indexOf(MATERIAL_START)
    const endIdx = kilde.indexOf(MATERIAL_END) + MATERIAL_END.length
    const before = kilde.slice(0, startIdx).replace(/\n+$/, '')
    const after = kilde.slice(endIdx).replace(/^\n+/, '')
    const blokk = `${MATERIAL_START}\n${seksjon}\n${MATERIAL_END}`
    return [before, blokk, after].filter(Boolean).join('\n\n').trim()
  }

  const prisMatch = /^Pris:\s*$/m.exec(kilde)
  if (prisMatch?.index !== undefined) {
    const before = kilde.slice(0, prisMatch.index).trimEnd()
    const after = kilde.slice(prisMatch.index).trimStart()
    return `${before}\n\n${MATERIAL_START}\n${seksjon}\n${MATERIAL_END}\n\n${after}`.trim()
  }

  return `${kilde.trimEnd()}\n\n${MATERIAL_START}\n${seksjon}\n${MATERIAL_END}`.trim()
}

export function fjernMaterialSeksjon(tekst: string): string {
  if (!harGyldigeMarkorer(tekst)) {
    return ryddOrphanedeMarkorer(tekst)
  }

  const startIdx = tekst.indexOf(MATERIAL_START)
  const endIdx = tekst.indexOf(MATERIAL_END) + MATERIAL_END.length
  const before = tekst.slice(0, startIdx).replace(/\n+$/, '')
  const after = tekst.slice(endIdx).replace(/^\n+/, '')

  if (!before && !after) return ''
  if (!before) return after.trim()
  if (!after) return before.trim()
  return `${before}\n\n${after}`.trim()
}

export function fjernMaterialMarkorerForVisning(tekst: string): string {
  return tekst
    .split('\n')
    .filter(linje => {
      const trimmet = linje.trim()
      return trimmet !== MATERIAL_START && trimmet !== MATERIAL_END
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
