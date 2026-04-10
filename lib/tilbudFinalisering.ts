import { tilbudTekstMedKundenavn } from './tilbudKundePlassholder'

/** Må samsvare med det modellen bruker i utkast (se openai system/brukermelding). */
export const STANDARD_OPPSTART_SETNING = 'Vi tar kontakt for å avtale oppstartsdato.'

const META_SEP = '\n---\n'

function fornavnFra(fullt: string): string {
  const t = fullt.trim()
  return t ? t.split(/\s+/)[0] ?? t : t
}

function byggNyIntro({
  kundeNavn,
  prosjektAdresse,
}: {
  kundeNavn: string
  prosjektAdresse: string
}): string {
  const fn = fornavnFra(kundeNavn)
  let s = `Hei ${fn}!\n`
  s += 'Takk for henvendelsen — her er prisoverslaget.'
  if (prosjektAdresse.trim()) {
    s += `\nOppdraget gjelder: ${prosjektAdresse.trim()}.`
  }
  return s
}

function erstattOppstartSetninger(
  kropp: string,
  foreslattOppstartTekst?: string
): string {
  const medDato = foreslattOppstartTekst?.trim()
    ? `Vi foreslår oppstart ${foreslattOppstartTekst.trim()}.`
    : null

  let ut = kropp

  const esc = STANDARD_OPPSTART_SETNING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (medDato) {
    ut = ut.replace(new RegExp(esc, 'g'), medDato)
    ut = ut.replace(
      /Vi foreslår oppstart [^.]+\./g,
      medDato
    )
    ut = ut.replace(
      /Vi kontakter deg for å avtale oppstart\./g,
      medDato
    )
  }

  return ut
}

/**
 * Oppdaterer kun topp (meta + skille + intro) og justerer oppstartssetninger i brødteksten.
 * Bevarer «Dette er inkludert:» og alt under.
 */
export function finaliserTilbudTekstSync(input: {
  tilbudTekst: string
  kundeNavn: string
  prosjektAdresse: string
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
  const di = body.search(/\nDette er inkludert:\s*/i)
  if (di === -1) {
    return `${head}${META_SEP}${body}`
  }

  const tail = body.slice(di + 1).trimStart()
  const nyIntro = byggNyIntro({
    kundeNavn: navn,
    prosjektAdresse: input.prosjektAdresse,
  })

  const tailMedOppstart = erstattOppstartSetninger(
    tail,
    input.foreslattOppstartTekst
  )

  return `${head}${META_SEP}${nyIntro}\n\n${tailMedOppstart}`
}

export function formaterOppstartDatoNb(d: Date): string {
  return d.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
