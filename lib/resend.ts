const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY!

interface SendTilbudInput {
  tilEpost: string
  kundeNavn: string
  firmanavn: string
  generertTekst: string
  prisEksMva: number
}

function byggHtmlBody(input: SendTilbudInput): string {
  const tekstHtml = input.generertTekst
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/## (.*?)(\n|$)/g, '<h2 style="color:#1B4332;margin-top:20px">$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1 style="color:#1B4332">$1</h1>')
    .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

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

export async function sendTilbudEpost(input: SendTilbudInput): Promise<void> {
  console.log('[resend] sendTilbudEpost til:', input.tilEpost, 'fra:', input.firmanavn)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: input.tilEpost,
      subject: `Tilbud fra ${input.firmanavn}`,
      html: byggHtmlBody(input),
    }),
  })

  console.log('[resend] response status:', response.status)

  if (!response.ok) {
    const err = await response.text()
    console.error('[resend] API error:', err)
    throw new Error(`Resend feil: ${err}`)
  }

  const json = await response.json()
  console.log('[resend] success, id:', json.id)

  if (json.error) {
    throw new Error(json.error.message ?? 'Ukjent feil ved e-postsending')
  }
}
