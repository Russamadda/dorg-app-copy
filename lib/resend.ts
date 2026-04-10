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
}

function byggHtmlBody(input: SendTilbudEpostInput): string {
  const tekstHtml = input.generertTekst
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/## (.*?)(\n|$)/g, '<h2 style="color:#1B4332;margin-top:20px">$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1 style="color:#1B4332">$1</h1>')
    .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
  const godkjennUrl = `${TILBUD_BASE_URL}/t/${input.tilbudId}?action=godkjenn`
  const justeringUrl = `${TILBUD_BASE_URL}/t/${input.tilbudId}`

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1B4332;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="color:#fff;margin:0;letter-spacing:4px;font-size:24px">DORG</h1>
        <p style="color:#4CAF82;margin:4px 0 0;font-size:13px">Håndverkerportal</p>
      </div>
      <div style="border:1px solid #E2E8E4;border-top:none;padding:32px;border-radius:0 0 8px 8px">
        <p>Hei ${input.kundeNavn},</p>
        <p>Du har mottatt et tilbud fra <strong>${input.firmanavn}</strong>.</p>
        <hr style="border:none;border-top:1px solid #E2E8E4;margin:24px 0"/>
        <div style="background:#F5F4F0;padding:20px;border-radius:8px">
          <p>${tekstHtml}</p>
        </div>
        <div style="margin: 32px 0; display: flex;
          flex-direction: column; gap: 12px;">

          <a href="${godkjennUrl}"
            style="display: block; background: #1B4332;
            color: #ffffff; text-decoration: none;
            text-align: center; padding: 16px 24px;
            border-radius: 12px; font-size: 16px;
            font-weight: 700;">
            ✓ Godkjenn tilbud
          </a>

          <a href="${justeringUrl}"
            style="display: block; background: #ffffff;
            color: #374151; text-decoration: none;
            text-align: center; padding: 14px 24px;
            border-radius: 12px; font-size: 14px;
            font-weight: 500; border: 1.5px solid #E5E7EB;">
            Spørsmål eller endringer? Gi oss beskjed →
          </a>

        </div>

        <div style="font-size: 12px; color: #9CA3AF;
          margin-top: 16px;">
          Fungerer ikke knappene? Kopier denne lenken:
          ${justeringUrl}
        </div>
        <hr style="border:none;border-top:1px solid #E2E8E4;margin:24px 0"/>
        <p style="color:#6B7280;font-size:13px">
          Hvis du har spørsmål kan du svare direkte på denne e-posten.
        </p>
        <p>Med vennlig hilsen,<br/><strong>${input.firmanavn}</strong></p>
      </div>
      <p style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:16px">
        Sendt via DORG Håndverkerportal
      </p>
    </div>
  `
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

  const tekstHtml = input.generertTekst
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/## (.*?)(\n|$)/g, '<h2 style="color:#1B4332;margin-top:20px">$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1 style="color:#1B4332">$1</h1>')
    .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
  const godkjennUrl = `${TILBUD_BASE_URL}/t/${input.tilbudId}?action=godkjenn`
  const justeringUrl = `${TILBUD_BASE_URL}/t/${input.tilbudId}`

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1B4332;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="color:#fff;margin:0;letter-spacing:4px;font-size:24px">DORG</h1>
        <p style="color:#4CAF82;margin:4px 0 0;font-size:13px">Håndverkerportal</p>
      </div>
      <div style="border:1px solid #E2E8E4;border-top:none;padding:32px;border-radius:0 0 8px 8px">
        <p>Hei ${input.kundeNavn},</p>
        <p>${innledning}</p>
        <hr style="border:none;border-top:1px solid #E2E8E4;margin:24px 0"/>
        <div style="background:#F5F4F0;padding:20px;border-radius:8px">
          <p>${tekstHtml}</p>
        </div>
        <div style="margin: 32px 0; display: flex; flex-direction: column; gap: 12px;">
          <a href="${godkjennUrl}"
            style="display: block; background: #1B4332;
            color: #ffffff; text-decoration: none;
            text-align: center; padding: 16px 24px;
            border-radius: 12px; font-size: 16px;
            font-weight: 700;">
            ✓ Godkjenn tilbud
          </a>
          <a href="${justeringUrl}"
            style="display: block; background: #ffffff;
            color: #374151; text-decoration: none;
            text-align: center; padding: 14px 24px;
            border-radius: 12px; font-size: 14px;
            font-weight: 500; border: 1.5px solid #E5E7EB;">
            Spørsmål eller endringer? Gi oss beskjed →
          </a>
        </div>
        <div style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">
          Fungerer ikke knappene? Kopier denne lenken: ${justeringUrl}
        </div>
        <hr style="border:none;border-top:1px solid #E2E8E4;margin:24px 0"/>
        <p style="color:#6B7280;font-size:13px">
          Hvis du har spørsmål kan du svare direkte på denne e-posten.
        </p>
        <p>Med vennlig hilsen,<br/><strong>${input.firmanavn}</strong></p>
      </div>
      <p style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:16px">
        Sendt via DORG Håndverkerportal
      </p>
    </div>
  `
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
