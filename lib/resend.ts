const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY
const RESEND_FROM_EMAIL =
  process.env.EXPO_PUBLIC_RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev'
const RESEND_TEST_EMAIL = process.env.EXPO_PUBLIC_RESEND_TEST_EMAIL?.trim().toLowerCase()
const TILBUD_BASE_URL = 'https://dorg-web-priv.vercel.app'

interface SendTilbudEpostInput {
  tilEpost: string
  kundeNavn: string
  firmanavn: string
  generertTekst: string
  prisEksMva: number
  tilbudId: string
  /** Valgfritt — brukes i hjelpe-/kontaktseksjon i e-postskallet (ikke i AI-teksten). */
  firmaTelefon?: string | null
  firmaEpost?: string | null
}

function escapeHtmlTekst(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Bevarer ordlyd; kun `**` → `<strong>` og HTML-escape ellers. */
function formatInlineMarkdownOgEscape(text: string): string {
  const parts = text.split(/(\*\*.+?\*\*)/g)
  return parts
    .map(part => {
      const bold = part.match(/^\*\*(.+)\*\*$/)
      if (bold) return `<strong>${escapeHtmlTekst(bold[1])}</strong>`
      return escapeHtmlTekst(part)
    })
    .join('')
}

const META_LINJE =
  /^\s*(Til|Fra|Adresse|Tlf|E-post|Dato):\s*(.*)$/

function erTilbudTittellinje(line: string): boolean {
  return /^(\*\*)?Tilbud\s*[–—\-]\s*.+/.test(line.trimEnd())
}

/** Horisontal skillelinje i tilbudstekst (markdown eller tegnet strek). */
function erSkilleLinjeITekst(t: string): boolean {
  return /^-{3,}$/.test(t) || (/^[─━_\u2500\u2501\s]{5,}$/.test(t) && /[─━_\u2500\u2501]/.test(t))
}

const PRIS_EPOST_RAMME = '#e4e4e7'

/**
 * Pakker «Pris:» … «Totalt inkl. mva:» i én e-postblokk med ramme over/under,
 * så total ikke havner visuelt nær avslutning/hilsen (som tidligere egen `<p>` med stor margin etter dekorlinje).
 */
function prøvParsePrisSeksjonEpost(
  lines: string[],
  startIndex: number
): { html: string; nextIndex: number } | null {
  const n = lines.length
  if (startIndex >= n || !/^Pris:\s*$/i.test(lines[startIndex].trim())) {
    return null
  }

  let j = startIndex + 1
  let totaltIdx = -1
  while (j < n) {
    const raw = lines[j]
    const t = raw.trim()
    if (t === '') {
      j++
      continue
    }
    if (erSkilleLinjeITekst(t)) {
      j++
      continue
    }
    if (/Totalt\s+inkl\.\s*mva\s*:/i.test(raw.trimEnd())) {
      totaltIdx = j
      break
    }
    if (/^(Dette er inkludert|Dette er avtalt|Viktig å merke seg)\s*:/i.test(t)) {
      return null
    }
    if (/^(Med vennlig hilsen|Vi hører|Dette prisoverslaget)/i.test(t)) {
      return null
    }
    j++
  }
  if (totaltIdx < 0) return null

  const mids: string[] = []
  j = startIndex + 1
  while (j < totaltIdx) {
    const t = lines[j].trim()
    if (t === '' || erSkilleLinjeITekst(t)) {
      j++
      continue
    }
    mids.push(lines[j].trimEnd())
    j++
  }
  const totaltLine = lines[totaltIdx].trimEnd()

  const radHtml = mids
    .map(
      line =>
        `<p style="margin:0 0 3px 0;font-size:14px;line-height:1.45;color:#52525b;">${formatInlineMarkdownOgEscape(line)}</p>`
    )
    .join('')

  const inner =
    `<p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#18181b;line-height:1.35;">Pris:</p>` +
    radHtml +
    `<p style="margin:8px 0 0 0;font-size:17px;font-weight:700;color:#18181b;line-height:1.4;letter-spacing:-0.01em;">${formatInlineMarkdownOgEscape(totaltLine)}</p>`

  const html = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 18px 0;border-top:1px solid ${PRIS_EPOST_RAMME};border-bottom:1px solid ${PRIS_EPOST_RAMME};padding:14px 0 14px 0;"><tr><td style="padding:0;">${inner}</td></tr></table>`

  return { html, nextIndex: totaltIdx + 1 }
}

function byggEpostKontaktHjelpSeksjon(telefon: string | null | undefined, epost: string | null | undefined): string {
  const tel = telefon?.trim() ?? ''
  const mail = epost?.trim() ?? ''
  const telHref = tel.replace(/\s/g, '')
  const link = 'color:#166534;text-decoration:underline;'
  const tittel = 'margin:0 0 8px 0;font-size:14px;font-weight:600;color:#374151;'
  const brød = 'margin:0;font-size:14px;line-height:1.55;color:#52525b;'
  const hjelpeLedetekst = 'Lurer du på noe annet?'
  if (tel && mail) {
    return `<p style="${tittel}">${hjelpeLedetekst}</p>
<p style="${brød}">Ring oss på <a href="tel:${escapeHtmlTekst(telHref)}" style="${link}">${escapeHtmlTekst(tel)}</a> eller send e-post til <a href="mailto:${escapeHtmlTekst(mail)}" style="${link}">${escapeHtmlTekst(mail)}</a>.</p>`
  }
  if (tel) {
    return `<p style="${tittel}">${hjelpeLedetekst}</p>
<p style="${brød}">Ring oss på <a href="tel:${escapeHtmlTekst(telHref)}" style="${link}">${escapeHtmlTekst(tel)}</a>.</p>`
  }
  if (mail) {
    return `<p style="${tittel}">${hjelpeLedetekst}</p>
<p style="${brød}">Send e-post til <a href="mailto:${escapeHtmlTekst(mail)}" style="${link}">${escapeHtmlTekst(mail)}</a>.</p>`
  }
  return `<p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${hjelpeLedetekst}</p>`
}

/**
 * Deterministisk HTML for tilbudstekst: linjebasert struktur (tittel, metadata-tabell, --- som luft,
 * seksjonstitler, lister, avsnitt). «Pris:»–«Totalt inkl. mva:» pakkes i én rammet e-postblokk.
 * Endrer ikke AI-tekstens ordlyd — samme tegnrekkefølge per linje bortsett fra `---` som luft der det ikke er del av prisblokken.
 */
function generertTekstTilVisningsHtml(generertTekst: string): string {
  const lines = generertTekst.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  const n = lines.length
  const buf: string[] = []

  const flushParagraph = () => {
    if (buf.length === 0) return
    const inner = buf.map(l => formatInlineMarkdownOgEscape(l)).join('<br/>')
    out.push(`<p style="margin:0 0 12px 0;line-height:1.6;color:#27272a;">${inner}</p>`)
    buf.length = 0
  }

  const skipBlanks = () => {
    while (i < n && lines[i].trim() === '') i++
  }

  skipBlanks()
  if (i < n && erTilbudTittellinje(lines[i])) {
    out.push(
      `<h1 style="margin:0 0 20px 0;padding:0;font-size:20px;font-weight:700;color:#18181b;line-height:1.3;font-family:inherit;">${formatInlineMarkdownOgEscape(lines[i].trimEnd())}</h1>`
    )
    i++
  }
  skipBlanks()

  while (i < n) {
    const trimmed = lines[i].trim()
    const lineEnd = lines[i].trimEnd()

    if (trimmed === '') {
      flushParagraph()
      i++
      continue
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph()
      out.push('<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>')
      i++
      continue
    }

    if (/^[─━_\u2500\u2501\s]{5,}$/.test(trimmed) && /[─━_\u2500\u2501]/.test(trimmed)) {
      flushParagraph()
      out.push('<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>')
      i++
      continue
    }

    if (META_LINJE.test(lineEnd)) {
      flushParagraph()
      const rows: string[] = []
      while (i < n && META_LINJE.test(lines[i].trimEnd())) {
        rows.push(lines[i].trimEnd())
        i++
      }
      out.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;font-size:13px;line-height:1.45;color:#52525b;">${rows
          .map(
            r =>
              `<tr><td style="padding:2px 0;">${formatInlineMarkdownOgEscape(r)}</td></tr>`
          )
          .join('')}</table>`
      )
      continue
    }

    const prisBlokk = prøvParsePrisSeksjonEpost(lines, i)
    if (prisBlokk) {
      flushParagraph()
      out.push(prisBlokk.html)
      i = prisBlokk.nextIndex
      continue
    }

    if (/^Pris:/i.test(trimmed)) {
      flushParagraph()
      out.push(
        `<p style="margin:20px 0 6px 0;font-size:14px;font-weight:600;color:#18181b;line-height:1.35;">${formatInlineMarkdownOgEscape(lineEnd)}</p>`
      )
      i++
      continue
    }

    if (/^(Dette er inkludert|Dette er avtalt|Viktig å merke seg):/.test(trimmed)) {
      flushParagraph()
      out.push(
        `<p style="margin:20px 0 6px 0;font-size:14px;font-weight:600;color:#18181b;line-height:1.35;">${formatInlineMarkdownOgEscape(lineEnd)}</p>`
      )
      i++
      continue
    }

    if (/Totalt\s+inkl\.\s*mva\s*:/i.test(lineEnd)) {
      flushParagraph()
      out.push(
        `<p style="margin:18px 0 0 0;font-size:17px;font-weight:700;color:#18181b;line-height:1.4;">${formatInlineMarkdownOgEscape(lineEnd)}</p>`
      )
      i++
      continue
    }

    if (/^##\s+/.test(trimmed)) {
      flushParagraph()
      const rest = lines[i].replace(/^##\s+/, '').trimEnd()
      out.push(
        `<h2 style="margin:18px 0 6px 0;font-size:15px;font-weight:600;color:#27272a;line-height:1.35;">${formatInlineMarkdownOgEscape(rest)}</h2>`
      )
      i++
      continue
    }

    if (/^#\s+/.test(trimmed) && !/^##/.test(trimmed)) {
      flushParagraph()
      const rest = lines[i].replace(/^#\s+/, '').trimEnd()
      out.push(
        `<h1 style="margin:18px 0 6px 0;font-size:17px;font-weight:700;color:#18181b;line-height:1.3;">${formatInlineMarkdownOgEscape(rest)}</h1>`
      )
      i++
      continue
    }

    if (/^\s*-\s+/.test(lines[i])) {
      flushParagraph()
      const items: string[] = []
      while (i < n && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].trimEnd().replace(/^\s*-\s+/, ''))
        i++
      }
      out.push(
        `<ul style="margin:4px 0 14px 0;padding:0 0 0 20px;color:#27272a;">${items
          .map(
            it =>
              `<li style="margin:0 0 6px 0;line-height:1.55;">${formatInlineMarkdownOgEscape(it)}</li>`
          )
          .join('')}</ul>`
      )
      continue
    }

    buf.push(lines[i])
    i++
  }
  flushParagraph()
  return out.join('')
}

/**
 * Delt HTML-skjell for tilbud / påminnelse — én lys kolonne, minimalt krom, tabellayout for klienter.
 * Lenker og knappetekster er uendret i innhold. `tekstHtml` kommer fra {@link generertTekstTilVisningsHtml}.
 */
function byggTilbudEpostDokumentHtml(input: {
  kundeNavn: string
  introEtterHeiHtml: string
  tekstHtml: string
  firmanavn: string
  tilbudId: string
  firmaTelefon?: string | null
  firmaEpost?: string | null
}): string {
  const godkjennUrl = `${TILBUD_BASE_URL}/t/${input.tilbudId}?action=godkjenn`
  const justeringUrl = `${TILBUD_BASE_URL}/t/${input.tilbudId}`
  const kontaktHtml = byggEpostKontaktHjelpSeksjon(input.firmaTelefon, input.firmaEpost)

  const fontStack = 'Arial,Helvetica,sans-serif'
  const pageBg = '#f4f4f5'
  const ink = '#18181b'
  const link = '#166534'
  const ctaBg = '#166534'
  const offerRamme = '#e4e4e7'
  const offerInnholdBg = '#ffffff'

  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="x-ua-compatible" content="ie=edge" />
<title>Tilbud</title>
</head>
<body style="margin:0;padding:0;background-color:${pageBg};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${pageBg};">
<tr>
<td align="center" style="padding:28px 20px 36px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;">
<tr>
<td style="font-family:${fontStack};font-size:16px;line-height:1.55;color:${ink};">
<p style="margin:0 0 28px 0;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Dorg · Håndverkerportal</p>
<p style="margin:0 0 6px 0;font-size:16px;font-weight:600;color:${ink};">Hei ${input.kundeNavn},</p>
${input.introEtterHeiHtml}
<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;">
<tr><td style="height:1px;background-color:${offerRamme};line-height:1px;font-size:0;">&nbsp;</td></tr>
</table>
<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;">
<tr>
<td style="background-color:${offerInnholdBg};border:1px solid ${offerRamme};border-radius:8px;padding:20px 18px;">
${input.tekstHtml}
</td>
</tr>
</table>
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td align="left">
<a href="${godkjennUrl}" style="display:inline-block;padding:14px 24px;background-color:${ctaBg};color:#ffffff;font-family:${fontStack};font-size:16px;font-weight:600;text-decoration:none;border-radius:4px;">Godkjenn tilbud</a>
</td>
</tr>
<tr>
<td style="padding:16px 0 0 0;text-align:left;">
<a href="${justeringUrl}" style="font-family:${fontStack};font-size:15px;color:${link};text-decoration:underline;">Spørsmål eller endringer? Gi oss beskjed →</a>
</td>
</tr>
</table>
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
${kontaktHtml}
<p style="margin:22px 0 0 0;font-size:12px;line-height:1.5;color:#71717a;">Fungerer ikke knappene? Åpne denne lenken: <a href="${justeringUrl}" style="color:${link};text-decoration:underline;word-break:break-all;">${justeringUrl}</a></p>
<p style="margin:28px 0 0 0;font-size:11px;line-height:1.45;color:#a1a1aa;">Sendt via DORG Håndverkerportal</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
}

function byggHtmlBody(input: SendTilbudEpostInput): string {
  const tekstHtml = generertTekstTilVisningsHtml(input.generertTekst)
  const introEtterHeiHtml = `<p style="margin:8px 0 0 0;font-size:15px;line-height:1.55;color:#52525b;">Du har mottatt et tilbud fra <strong style="color:#18181b;">${input.firmanavn}</strong>.</p>`

  return byggTilbudEpostDokumentHtml({
    introEtterHeiHtml,
    tekstHtml,
    firmanavn: input.firmanavn,
    tilbudId: input.tilbudId,
    kundeNavn: input.kundeNavn,
    firmaTelefon: input.firmaTelefon,
    firmaEpost: input.firmaEpost,
  })
}

function byggResendConfigFeil(): string | null {
  if (!RESEND_API_KEY) {
    return 'Mangler `EXPO_PUBLIC_RESEND_API_KEY` for e-postsending.'
  }

  if (!RESEND_FROM_EMAIL) {
    return 'Mangler `EXPO_PUBLIC_RESEND_FROM_EMAIL` for e-postsending.'
  }

  return null
}

function byggResendApiFeil(status: number, err: string): string {
  if (status === 403 && err.includes('verify a domain')) {
    return [
      'Resend avviste e-posten fordi avsenderen kjører i testmodus.',
      `Sett \`EXPO_PUBLIC_RESEND_FROM_EMAIL\` til en verifisert adresse på ditt eget domene i Resend, i stedet for \`${RESEND_FROM_EMAIL}\`.`,
      RESEND_TEST_EMAIL
        ? `Så lenge du bruker testavsender kan du bare sende til \`${RESEND_TEST_EMAIL}\`.`
        : 'Hvis du vil teste med `resend.dev`, legg også inn `EXPO_PUBLIC_RESEND_TEST_EMAIL` med din egen e-postadresse.',
    ].join(' ')
  }

  return `Resend feil: ${err}`
}

function byggPaminnelseHtmlBody(input: SendTilbudEpostInput, erSiste: boolean): string {
  const innledning = erSiste
    ? `Dette er en siste påminnelse om tilbudet du mottok fra <strong>${input.firmanavn}</strong>. Vi vil gjerne høre fra deg.`
    : `Vi vil minne deg på tilbudet du mottok fra <strong>${input.firmanavn}</strong>.`

  const tekstHtml = generertTekstTilVisningsHtml(input.generertTekst)
  const introEtterHeiHtml = `<p style="margin:8px 0 0 0;font-size:15px;line-height:1.55;color:#52525b;">${innledning}</p>`

  return byggTilbudEpostDokumentHtml({
    kundeNavn: input.kundeNavn,
    introEtterHeiHtml,
    tekstHtml,
    firmanavn: input.firmanavn,
    tilbudId: input.tilbudId,
    firmaTelefon: input.firmaTelefon,
    firmaEpost: input.firmaEpost,
  })
}

// Sends a reminder email for an existing offer. Uses a different subject line
// and intro text compared to the initial sendTilbudEpost.
export async function sendPaminnelseEpost(
  input: SendTilbudEpostInput,
  erSiste = false
): Promise<void> {
  const configFeil = byggResendConfigFeil()
  if (configFeil) {
    throw new Error(configFeil)
  }

  const tilEpost = input.tilEpost.trim().toLowerCase()

  if (
    RESEND_FROM_EMAIL.toLowerCase().endsWith('@resend.dev') &&
    RESEND_TEST_EMAIL &&
    tilEpost !== RESEND_TEST_EMAIL
  ) {
    throw new Error(
      `Resend er satt opp i testmodus. Med \`${RESEND_FROM_EMAIL}\` kan du bare sende til \`${RESEND_TEST_EMAIL}\`.`
    )
  }

  const subject = erSiste
    ? `Siste påminnelse: Tilbud fra ${input.firmanavn}`
    : `Påminnelse: Tilbud fra ${input.firmanavn}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: tilEpost,
      subject,
      html: byggPaminnelseHtmlBody(input, erSiste),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[resend] API error:', err)
    throw new Error(byggResendApiFeil(response.status, err))
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(json.error.message ?? 'Ukjent feil ved e-postsending')
  }
}

export async function sendTilbudEpost(input: SendTilbudEpostInput): Promise<void> {
  const configFeil = byggResendConfigFeil()
  if (configFeil) {
    throw new Error(configFeil)
  }

  const tilEpost = input.tilEpost.trim().toLowerCase()

  if (
    RESEND_FROM_EMAIL.toLowerCase().endsWith('@resend.dev') &&
    RESEND_TEST_EMAIL &&
    tilEpost !== RESEND_TEST_EMAIL
  ) {
    throw new Error(
      `Resend er satt opp i testmodus. Med \`${RESEND_FROM_EMAIL}\` kan du bare sende til \`${RESEND_TEST_EMAIL}\`.`
    )
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: tilEpost,
      subject: `Tilbud fra ${input.firmanavn}`,
      html: byggHtmlBody(input),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[resend] API error:', err)
    throw new Error(byggResendApiFeil(response.status, err))
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(json.error.message ?? 'Ukjent feil ved e-postsending')
  }
}
