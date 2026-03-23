const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!
const systemPrompt = `Du er en vennlig og profesjonell 
tilbudsassistent for norske håndverkere. 
Skriv tilbud som høres menneskelige og varme ut — 
ikke robotaktig eller corporate. Tenk: en flink håndverker 
som skriver til en nabo.

VIKTIG FORMATERING:
Bruk ALLTID denne eksakte strukturen uten ### eller **:

[Tittel på én linje, f.eks: Tilbud – Bytte av gulv]

Til: [kundenavn]
Fra: [firmanavn]
Dato: [dato]
Adresse: [adresse]
Tlf: [telefon]
E-post: [epost]

---

[2-3 setninger som introduserer tilbudet på en varm, 
menneskelig måte. F.eks: Takk for at du tok kontakt! 
Vi har sett på jobben og sender deg gjerne et tilbud.]

Om jobben:
- Jobbtype: [type]
- Omfang: [detaljer]
- Estimert tid: [timer] timer
- Materialer: kr [beløp]

Oppstart:
Vi foreslår oppstart [dato], ca. 5 virkedager fra i dag.

Gyldighet:
Tilbudet gjelder i 14 dager, til [dato].

---

Pris:
Arbeid eks. mva:    kr [beløp]
MVA 25%:            kr [mva]
Totalt inkl. mva:   kr [total]

[Avslutt med én varm setning. F.eks: 
Ikke nøl med å ta kontakt om du lurer på noe!]

Med vennlig hilsen,
[firmanavn]

REGLER FOR AI-OUTPUT:
- ALDRI bruk ### for overskrifter
- ALDRI bruk ** for bold
- ALDRI bruk * for bullet points — bruk - i stedet
- Tittelen skal stå på første linje, alene
- Mellomrom mellom alle seksjoner
- Priser formateres med mellomrom: 10 000 ikke 10000
- Lyder menneskelig og direkte, ikke formelt`

interface GenererTilbudInput {
  kundeNavn: string
  jobbBeskrivelse: string
  prisEksMva: number
  firmanavn: string
  adresse?: string
  timepris?: number
  telefon?: string
  epost?: string
  timer?: number
  materialkostnad?: number
  dagensdato?: string
  justeringer?: string
}

function formatKr(verdi: number): string {
  return verdi.toLocaleString('nb-NO')
}

function byggPrompt(input: GenererTilbudInput): string {
  const mva = Math.round(input.prisEksMva * 0.25)
  const total = input.prisEksMva + mva
  const dato = input.dagensdato ?? new Date().toLocaleDateString('nb-NO')
  const oppstart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('nb-NO')
  const gyldigTil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('nb-NO')

  return `Bruk disse faktiske opplysningene når du skriver tilbudet:

Kundenavn: ${input.kundeNavn}
Firmanavn: ${input.firmanavn}
Dato: ${dato}
Adresse: ${input.adresse ?? 'Ikke oppgitt'}
Tlf: ${input.telefon ?? 'Ikke oppgitt'}
E-post: ${input.epost ?? 'Ikke oppgitt'}
Om jobben: ${input.jobbBeskrivelse}
Jobbtype: Utled naturlig jobbtype fra beskrivelsen
Estimert tid: ${input.timer ?? 0} timer
Materialer: kr ${formatKr(input.materialkostnad ?? 0)}
Arbeid eks. mva: kr ${formatKr(input.prisEksMva)}
MVA 25%: kr ${formatKr(mva)}
Totalt inkl. mva: kr ${formatKr(total)}
Oppstart: ${oppstart}
Gyldighet: ${gyldigTil}
${input.timepris ? `Timepris: ${input.timepris} kr/t` : ''}
${input.justeringer ? `Justeringer som må innarbeides: ${input.justeringer}` : ''}

Viktig:
- Bruk de eksakte tallene og datoene over
- Ikke bruk markdownsyntaks
- Ikke bruk plassholdere
- Følg strukturen i systeminstruksen nøyaktig`
}

export async function genererTilbud(input: GenererTilbudInput): Promise<string> {
  console.log('[openai] genererTilbud input:', { kundeNavn: input.kundeNavn, prisEksMva: input.prisEksMva })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: byggPrompt(input),
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[openai] API error:', err)
    throw new Error(`OpenAI feil: ${err}`)
  }

  const json = await response.json()
  const tekst = json.choices?.[0]?.message?.content?.trim() ?? 'Det oppsto en feil under generering av tilbudsteksten.'
  console.log('[openai] genererTilbud OK, lengde:', tekst.length)
  return tekst
}
