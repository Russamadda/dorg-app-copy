import { tilbudTekstMedKundenavn } from './tilbudKundePlassholder'

/** Må samsvare med det modellen bruker i utkast (se openai system/brukermelding). */
export const STANDARD_OPPSTART_SETNING = 'Vi tar kontakt for å avtale oppstartsdato.'

const META_SEP = '\n---\n'

/**
 * Finner hvor brødteksten etter `---` skal deles før «Dette er inkludert:».
 * Tolerant for \r\n, ekstra mellomrom og kolon-variant — slik at vi ikke feiler og
 * erstatter modellens intro med tom streng / standardtekst.
 */
function finnDelingFørDetteErInkludert(body: string): { introSliceEnd: number; tailSliceStart: number } | null {
  const reMedNl = /\r?\n[\t ]*Dette[\t ]+er[\t ]+inkludert[\t ]*:[\t ]*/i
  const m = reMedNl.exec(body)
  if (m && m.index !== undefined) {
    return { introSliceEnd: m.index, tailSliceStart: m.index + m[0].length }
  }
  const reStart = /^[\t ]*Dette[\t ]+er[\t ]+inkludert[\t ]*:[\t ]*/im
  const m2 = reStart.exec(body)
  if (m2 && m2.index === 0) {
    return { introSliceEnd: 0, tailSliceStart: m2[0].length }
  }
  return null
}

/** Hele linjer som skal byttes ut med én korrekt oppstartssetning (aldri delvis replace). */
function erOppstartLinje(linje: string): boolean {
  const t = linje.trim()
  if (!t) return false
  if (/^Vi foreslår oppstart\b/i.test(t)) return true
  if (/^Vi tar kontakt for å avtale oppstartsdato\.?$/i.test(t)) return true
  if (/^Vi kontakter deg for å avtale oppstart\.?$/i.test(t)) return true
  const std = STANDARD_OPPSTART_SETNING
  if (t === std || t === std.replace(/\.$/, '')) return true
  return false
}

/**
 * Bytter ut alle oppstart-relaterte linjer med nøyaktig én målsetning.
 * Viktig: norske datoer som «19. april 2026» inneholder punktum i datoen — regex som `[^.]+`
 * klippet da etter «19.» og ga duplikat («…19.» + resten av linjen).
 */
function erstattOppstartSetninger(
  kropp: string,
  foreslattOppstartTekst?: string
): string {
  const harDato = Boolean(foreslattOppstartTekst?.trim())
  const målLinje = harDato
    ? `Vi foreslår oppstart ${foreslattOppstartTekst!.trim()}.`
    : STANDARD_OPPSTART_SETNING

  const linjer = kropp.split(/\r?\n/)
  let sattInn = false
  const ut: string[] = []

  for (const linje of linjer) {
    if (erOppstartLinje(linje)) {
      if (!sattInn) {
        ut.push(målLinje)
        sattInn = true
      }
    } else {
      ut.push(linje)
    }
  }

  if (!sattInn) {
    return `${målLinje}\n\n${kropp.replace(/^\s+/, '')}`
  }

  return ut.join('\n')
}

/**
 * Oppdaterer meta (Til:-linje), bevarer modellens introduksjon mellom `---` og «Dette er inkludert:».
 * Ved kontaktfinalisering endres kun: `Til:`-linje, «Hei Kunde» → ekte fornavn, og oppstartssetning
 * i brødteksten (under «Dette er inkludert») når dato er valgt. Ingen ekstra takk-/prisoverslag-linjer.
 */
export function finaliserTilbudTekstSync(input: {
  tilbudTekst: string
  kundeNavn: string
  foreslattOppstartTekst?: string
}): string {
  const navn = input.kundeNavn.trim()
  if (!navn) return input.tilbudTekst

  const tekst = input.tilbudTekst
  const idx = tekst.indexOf(META_SEP)
  if (idx === -1) {
    return tilbudTekstMedKundenavn(tekst, navn)
  }

  const headRaw = tekst.slice(0, idx)
  const head = headRaw.replace(/^Til:\s*.+$/m, `Til: ${navn}`)

  const body = tekst.slice(idx + META_SEP.length)
  const deling = finnDelingFørDetteErInkludert(body)
  if (!deling) {
    return `${head}${META_SEP}${tilbudTekstMedKundenavn(body, navn)}`
  }

  const introRaw = body.slice(0, deling.introSliceEnd).trim()
  const tail = body.slice(deling.tailSliceStart).trimStart()
  const nyIntro = introRaw ? tilbudTekstMedKundenavn(introRaw, navn) : ''
  const tailMedOppstart = erstattOppstartSetninger(tail, input.foreslattOppstartTekst)
  const midt = nyIntro ? `${nyIntro}\n\n` : ''

  return `${head}${META_SEP}${midt}${tailMedOppstart}`
}

export function formaterOppstartDatoNb(d: Date): string {
  return d.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
