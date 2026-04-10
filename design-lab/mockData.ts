/**
 * DESIGN LAB — Statisk mockdata
 * Dekker alle datatyper appen bruker (Forespørsel, Firma, Prishistorikk).
 * Ingen API-kall, ingen auth. Kun for visuell redesign.
 */

import type { Forespørsel, Firma, Prishistorikk } from '../types'

export const mockFirma: Firma = {
  id: 'mock-firma-1',
  userId: 'mock-user-1',
  firmanavn: 'AAEN Eiendom & Snekker',
  orgNummer: '852634958',
  telefon: '91234567',
  epost: 'post@aaen-eiendom.no',
  adresse: 'Storgata 45',
  poststed: 'Bodø',
  logoUrl: undefined,
  timepris: 1500,
  materialPaslag: 20,
  fagkategori: 'snekker',
  tjenester: [
    'Dører og vinduer',
    'Baderomsrenovering',
    'Terrasse og balkong',
    'Kjøkkenmontering',
    'Garderobe og innredning',
    'Gulv og parkett',
    'Innvendig panel og kledning',
    'Trapper og rekkverk',
  ],
  aktiveTjenester: [
    'Dører og vinduer',
    'Terrasse og balkong',
    'Kjøkkenmontering',
    'Garderobe og innredning',
    'Gulv og parkett',
    'Baderomsrenovering',
  ],
}

export const mockForespørsler: Forespørsel[] = [
  {
    id: 'mock-f-1',
    kundeNavn: 'Ola Nordmann',
    kundeEpost: 'ola@example.com',
    kundeTelefon: '98765432',
    jobbBeskrivelse: 'Installasjon av tre nye vinduer på soverom og stue. Gammel karm må fjernes og det kan hende det trengs noe kledning etterpå.',
    kortBeskrivelse: 'Vindusinstallasjon x3',
    adresse: 'Storgata 12, Bodø',
    prisEksMva: 38000,
    timer: 16,
    materialkostnad: 18000,
    status: 'avventer',
    opprettetDato: '2026-03-28T10:30:00.000Z',
    generertTekst: undefined,
    kundeJustering: null,
    aiOppsummering: null,
    firmaId: 'mock-firma-1',
    jobbType: 'Dører og vinduer',
    antallPaminnelser: 0,
  },
  {
    id: 'mock-f-2',
    kundeNavn: 'Kari Hansen',
    kundeEpost: 'kari@example.com',
    kundeTelefon: '90123456',
    jobbBeskrivelse: 'Montering av komplett Ikea-kjøkken, ca 15 skap. Inkluderer demontering av gammelt kjøkken og rørleggerarbeid for oppvaskmaskin.',
    kortBeskrivelse: 'Kjøkkenmontasje Ikea',
    adresse: 'Parkveien 4, Bodø',
    prisEksMva: 18200,
    timer: 8,
    materialkostnad: 4000,
    status: 'avventer',
    opprettetDato: '2026-03-27T14:15:00.000Z',
    generertTekst: `**Tilbud — Kjøkkenmontasje**

Kjære Kari Hansen,

Vi takker for henvendelsen og sender herved vårt tilbud for montering av nytt kjøkken i Parkveien 4.

**Omfang av arbeidet:**
- Demontering og bortkjøring av eksisterende kjøkken
- Montering av 15 Ikea-skap etter kundens plantegning
- Tilpasning av benkeplate og sokkel
- Tilkobling av oppvaskmaskin (rørlegger medfølger)
- Rydding og rengjøring etter ferdigstillelse

**Pris eks. mva:** kr 18 200
**MVA (25%):** kr 4 550
**Totalpris inkl. mva:** kr 22 750

Arbeidet estimeres til 8 timer. Oppstart etter avtale.

Med vennlig hilsen,
AAEN Eiendom & Snekker`,
    kundeJustering: null,
    aiOppsummering: 'Kjøkkenmontasje Ikea, 15 skap, inkl. oppvaskmaskin',
    firmaId: 'mock-firma-1',
    jobbType: 'Kjøkkenmontering',
    antallPaminnelser: 0,
  },
  {
    id: 'mock-f-3',
    kundeNavn: 'Lars Bakken',
    kundeEpost: 'lars@example.com',
    jobbBeskrivelse: 'Bygging av terrasse på 30 kvm med rekkverk rundt. Ønsker trykkimpregnert materiale og skjulte festemidler.',
    kortBeskrivelse: 'Terrasse 30 kvm',
    adresse: 'Fjordgata 22, Bodø',
    prisEksMva: 62000,
    timer: 32,
    materialkostnad: 28000,
    status: 'avventer',
    opprettetDato: '2026-03-26T09:00:00.000Z',
    generertTekst: undefined,
    kundeJustering: null,
    aiOppsummering: null,
    firmaId: 'mock-firma-1',
    jobbType: 'Terrasse og balkong',
    antallPaminnelser: 0,
  },
]

export const mockSendteTilbud: Forespørsel[] = [
  {
    id: 'mock-t-1',
    kundeNavn: 'Ola Nordmann',
    kundeEpost: 'ola@example.com',
    kundeTelefon: '98765432',
    jobbBeskrivelse: 'Installasjon av tre nye vinduer på soverom og stue.',
    kortBeskrivelse: 'Vindusinstallasjon x3',
    adresse: 'Storgata 12, Bodø',
    prisEksMva: 38500,
    timer: 16,
    materialkostnad: 18000,
    status: 'sendt',
    opprettetDato: '2026-03-25T10:30:00.000Z',
    generertTekst: '**Tilbud — Vindusinstallasjon**\n\nVi sender herved tilbud på installasjon av 3 nye vinduer...',
    kundeJustering: null,
    aiOppsummering: 'Vindusinstallasjon x3, inkl. kledning',
    firmaId: 'mock-firma-1',
    jobbType: 'Dører og vinduer',
    antallPaminnelser: 1,
  },
  {
    id: 'mock-t-2',
    kundeNavn: 'Kari Hansen',
    kundeEpost: 'kari@example.com',
    jobbBeskrivelse: 'Montering av Ikea-kjøkken, 15 skap.',
    kortBeskrivelse: 'Kjøkkenmontasje Ikea',
    adresse: 'Parkveien 4, Bodø',
    prisEksMva: 22800,
    timer: 8,
    materialkostnad: 4000,
    status: 'godkjent',
    opprettetDato: '2026-03-20T14:15:00.000Z',
    generertTekst: '**Tilbud — Kjøkkenmontasje**\n\nVi takker for henvendelsen...',
    kundeJustering: null,
    aiOppsummering: 'Kjøkkenmontasje Ikea, godkjent',
    firmaId: 'mock-firma-1',
    jobbType: 'Kjøkkenmontering',
    antallPaminnelser: 0,
  },
  {
    id: 'mock-t-3',
    kundeNavn: 'Per Olsen',
    kundeEpost: 'per@example.com',
    jobbBeskrivelse: 'Gulvlegging i stue og gang, ca 45 kvm parkett.',
    kortBeskrivelse: 'Gulvlegging stue + gang',
    adresse: 'Kongensgata 8, Bodø',
    prisEksMva: 24960,
    timer: 12,
    materialkostnad: 14000,
    status: 'justering',
    opprettetDato: '2026-03-18T11:00:00.000Z',
    generertTekst: '**Tilbud — Gulvlegging**\n\nVi sender herved revidert tilbud...',
    kundeJustering: 'Kan dere inkludere lister langs veggene? Og er prisen forhandlingsbar?',
    aiOppsummering: 'Gulvlegging 45 kvm, inkl. lister',
    firmaId: 'mock-firma-1',
    jobbType: 'Gulv og parkett',
    antallPaminnelser: 0,
  },
  {
    id: 'mock-t-4',
    kundeNavn: 'Silje Moen',
    kundeEpost: 'silje@example.com',
    jobbBeskrivelse: 'Bygging av terrasse 30 kvm med rekkverk.',
    kortBeskrivelse: 'Terrasse 30 kvm',
    adresse: 'Fjordveien 6, Bodø',
    prisEksMva: 64000,
    timer: 32,
    materialkostnad: 28000,
    status: 'sendt',
    opprettetDato: '2026-03-15T08:45:00.000Z',
    generertTekst: '**Tilbud — Terrasse**\n\nVi sender herved tilbud på bygging av terrasse...',
    kundeJustering: null,
    aiOppsummering: 'Terrasse 30 kvm m/rekkverk',
    firmaId: 'mock-firma-1',
    jobbType: 'Terrasse og balkong',
    antallPaminnelser: 2,
  },
  {
    id: 'mock-t-5',
    kundeNavn: 'Thomas Berg',
    kundeEpost: 'thomas@example.com',
    jobbBeskrivelse: 'Garderobe innredning i gang, ca 2m bred.',
    kortBeskrivelse: 'Garderobe innredning',
    adresse: 'Salten Allé 3, Bodø',
    prisEksMva: 12400,
    timer: 5,
    materialkostnad: 4900,
    status: 'godkjent',
    opprettetDato: '2026-03-10T13:30:00.000Z',
    generertTekst: '**Tilbud — Garderobe**\n\nVi sender herved tilbud på garderobe...',
    kundeJustering: null,
    aiOppsummering: 'Garderobe innredning 2m',
    firmaId: 'mock-firma-1',
    jobbType: 'Garderobe og innredning',
    antallPaminnelser: 0,
  },
]

export const mockPrishistorikk: Prishistorikk[] = [
  {
    id: 'mock-p-1',
    firmaId: 'mock-firma-1',
    oppdrag: 'Vindusinstallasjon',
    timepris: 1500,
    materialer: 18000,
    total: 48125,
    dato: '2026-03-25',
  },
  {
    id: 'mock-p-2',
    firmaId: 'mock-firma-1',
    oppdrag: 'Kjøkkenmontasje',
    timepris: 1500,
    materialer: 4000,
    total: 28500,
    dato: '2026-03-20',
  },
  {
    id: 'mock-p-3',
    firmaId: 'mock-firma-1',
    oppdrag: 'Gulvlegging',
    timepris: 1500,
    materialer: 14000,
    total: 31200,
    dato: '2026-03-18',
  },
]

export const mockGenerertTekst = `**Tilbud — Vindusinstallasjon**

Kjære Ola Nordmann,

Vi takker for henvendelsen og sender herved tilbud for installasjon av nye vinduer i Storgata 12.

**Omfang av arbeidet:**
- Demontering av 3 eksisterende vinduskarmer
- Installasjon av 3 nye vinduer (soverom og stue)
- Tetting og isolering rundt nye karmer
- Kledning og finish innvendig etter behov
- Bortkjøring av gammel karm

**Pris eks. mva:** kr 38 000
**MVA (25%):** kr 9 500
**Totalpris inkl. mva:** kr 47 500

Arbeidet estimeres til 16 timer. Vi benytter kvalitetsmateriale og kan tilby oppstart innen 2 uker.

Ta gjerne kontakt ved spørsmål.

Med vennlig hilsen,
AAEN Eiendom & Snekker
Tlf: 912 34 567`
