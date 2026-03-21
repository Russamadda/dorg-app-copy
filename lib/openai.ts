const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!

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

function byggPrompt(input: GenererTilbudInput): string {
  const mva = Math.round(input.prisEksMva * 0.25)
  const total = input.prisEksMva + mva
  const dato = input.dagensdato ?? new Date().toLocaleDateString('nb-NO')

  return `Lag en komplett tilbudstekst basert på disse opplysningene:

Dato i dag: ${dato}
Firmanavn: ${input.firmanavn}
${input.adresse ? `Firmaadresse: ${input.adresse}` : ''}
${input.telefon ? `Telefon: ${input.telefon}` : ''}
${input.epost ? `E-post: ${input.epost}` : ''}
Kundenavn: ${input.kundeNavn}
Fritekst om jobben: ${input.jobbBeskrivelse}
${input.timer ? `Estimert timer: ${input.timer} t` : ''}
${input.materialkostnad ? `Materialkostnad: ${input.materialkostnad} NOK` : ''}
${input.timepris ? `Timepris: ${input.timepris} kr/t` : ''}
Pris eks. MVA: ${input.prisEksMva} NOK
MVA (25%): ${mva} NOK
Totalsum inkl. MVA: ${total} NOK
${input.justeringer ? `Justeringer: ${input.justeringer}` : ''}

Krav:
- Les fritekstbeskrivelsen og forstå hva slags jobb det er.
- Utled selv jobbtype, adresse hvis nevnt, og realistisk omfang av arbeidet.
- Bruk dato "${dato}" — IKKE skriv [Dagens dato] eller plassholdere.
- Foreslå oppstart om 5 virkedager fra ${dato}.
- Sett tilbudets gyldighet til 14 dager fra ${dato}.
- Svar i markdown med tydelige overskrifter, punktlister og en egen prisseksjon.
- Vaer konkret, profesjonell og tillitsvekkende på norsk bokmaal.`
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
          content:
            'Du er en tilbudsassistent for norske håndverkere. Generer et profesjonelt tilbud på norsk bokmål. ' +
            'VIKTIG: Bruk ALLTID de eksakte tallene fra input for pris — ikke endre dem. ' +
            'Bruk dagens faktiske dato som er oppgitt i input — IKKE skriv [Dagens dato] eller lignende plassholdere. ' +
            'Ikke bruk plassholdere som [Telefonnummer], [E-post] eller [Firmanavn] — bruk de faktiske verdiene fra input. ' +
            'Formater prisseksjonen ALLTID eksakt slik:\n' +
            'Pris eks. MVA: X NOK\nMVA (25%): Y NOK\nTotalsum inkl. MVA: Z NOK\n' +
            'Ikke bruk ** rundt tall i prisseksjonen. ' +
            'Formater svaret med markdown: overskrifter (##), punktlister (-) og en tydelig prisseksjon.',
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
