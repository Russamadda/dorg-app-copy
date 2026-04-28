import { tilbudTekstMedKundenavn } from './tilbudKundePlassholder'

/** Må samsvare med det modellen bruker i utkast (se openai system/brukermelding). */
export const STANDARD_OPPSTART_SETNING = 'Vi tar kontakt for avtale oppstart.'

const META_SEP = '\n---\n'

/** Overskriftslinjen ligger inni regex-treffet; plukkes ut så den kan settes inn igjen ved sammenslåing. */
function ekstraherArbeidslisteOverskrift(fradelingsMatch: string): string {
  const linje = fradelingsMatch.trim().split(/\r?\n/)[0]?.trim() ?? ''
  return linje.length > 0 ? linje : 'Dette er avtalt:'
}

/**
 * Finner hvor brødteksten etter `---` skal deles før arbeidslisten («Dette er avtalt:» eller eldre «Dette er inkludert:»).
 * Tolerant for \r\n, ekstra mellomrom og kolon-variant — slik at vi ikke feiler og
 * erstatter modellens intro med tom streng / standardtekst.
 */
function finnDelingFørDetteErInkludert(body: string): {
  introSliceEnd: number
  tailSliceStart: number
  arbeidslisteOverskrift: string
} | null {
  const etterNl = [
    /\r?\n[\t ]*Dette[\t ]+er[\t ]+inkludert[\t ]*:[\t ]*/i,
    /\r?\n[\t ]*Dette[\t ]+er[\t ]+avtalt[\t ]*:[\t ]*/i,
  ]
  const vedStart = [
    /^[\t ]*Dette[\t ]+er[\t ]+inkludert[\t ]*:[\t ]*/im,
    /^[\t ]*Dette[\t ]+er[\t ]+avtalt[\t ]*:[\t ]*/im,
  ]

  let best: { introSliceEnd: number; tailSliceStart: number; matchText: string } | null = null
  for (const re of etterNl) {
    const m = re.exec(body)
    if (m && m.index !== undefined) {
      const cand = {
        introSliceEnd: m.index,
        tailSliceStart: m.index + m[0].length,
        matchText: m[0],
      }
      if (!best || cand.introSliceEnd < best.introSliceEnd) best = cand
    }
  }
  if (best) {
    return {
      introSliceEnd: best.introSliceEnd,
      tailSliceStart: best.tailSliceStart,
      arbeidslisteOverskrift: ekstraherArbeidslisteOverskrift(best.matchText),
    }
  }

  for (const re of vedStart) {
    const m = re.exec(body)
    if (m && m.index === 0) {
      return {
        introSliceEnd: 0,
        tailSliceStart: m[0].length,
        arbeidslisteOverskrift: ekstraherArbeidslisteOverskrift(m[0]),
      }
    }
  }
  return null
}

/** Hele linjer som skal byttes ut med én korrekt oppstartssetning (aldri delvis replace). */
function erOppstartLinje(linje: string): boolean {
  const t = linje.trim()
  if (!t) return false
  if (/^Vi foreslår oppstart\b/i.test(t)) return true
  if (/^Vi tar kontakt for avtale oppstart\.?$/i.test(t)) return true
  if (/^Vi tar kontakt for å avtale oppstartsdato\.?$/i.test(t)) return true
  if (/^Vi tar kontakt for å avtale tidspunkt som passer for begge\.?$/i.test(t)) return true
  if (/^Vi kontakter deg for å avtale oppstart\.?$/i.test(t)) return true
  const std = STANDARD_OPPSTART_SETNING
  if (t === std || t === std.replace(/\.$/, '')) return true
  return false
}

function byggOppstartMaalLinje(foreslattOppstartTekst?: string): string {
  const harDato = Boolean(foreslattOppstartTekst?.trim())
  return harDato
    ? `Vi foreslår oppstart ${foreslattOppstartTekst!.trim()}.`
    : STANDARD_OPPSTART_SETNING
}

/**
 * Bytter ut alle oppstart-relaterte linjer med nøyaktig én målsetning.
 * Viktig: norske datoer som «19. april 2026» inneholder punktum i datoen — regex som `[^.]+`
 * klippet da etter «19.» og ga duplikat («…19.» + resten av linjen).
 */
function erstattOppstartSetninger(
  kropp: string,
  foreslattOppstartTekst?: string
): { tekst: string; fantOppstartslinje: boolean } {
  const målLinje = byggOppstartMaalLinje(foreslattOppstartTekst)

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
    return { tekst: kropp, fantOppstartslinje: false }
  }

  return { tekst: ut.join('\n'), fantOppstartslinje: true }
}

/**
 * Oppdaterer meta (Til:-linje), bevarer modellens introduksjon mellom `---` og arbeidslisten («Dette er avtalt:» / «Dette er inkludert:»).
 * Ved kontaktfinalisering endres kun: `Til:`-linje, «Hei Kunde» → ekte fornavn, og oppstartssetning
 * der den allerede finnes i brødteksten. Hvis den mangler helt, legges den inn før arbeidslisten.
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
  const introMedOppstart = erstattOppstartSetninger(nyIntro, input.foreslattOppstartTekst)
  const tailMedOppstartResultat = introMedOppstart.fantOppstartslinje
    ? { tekst: tail, fantOppstartslinje: false }
    : erstattOppstartSetninger(tail, input.foreslattOppstartTekst)
  const overskrift = deling.arbeidslisteOverskrift
  const maalLinje = byggOppstartMaalLinje(input.foreslattOppstartTekst)
  const endeligIntro =
    !introMedOppstart.fantOppstartslinje && !tailMedOppstartResultat.fantOppstartslinje
      ? (introMedOppstart.tekst.trim()
          ? `${introMedOppstart.tekst.trimEnd()}\n\n${maalLinje}`
          : maalLinje)
      : introMedOppstart.tekst
  const kroppEtterIntro = `${overskrift}\n\n${tailMedOppstartResultat.tekst}`
  const midt = endeligIntro ? `${endeligIntro}\n\n${kroppEtterIntro}` : kroppEtterIntro

  return `${head}${META_SEP}${midt}`
}

export function formaterOppstartDatoNb(d: Date): string {
  return d.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
