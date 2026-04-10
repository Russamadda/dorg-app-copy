import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Animated,
  Easing,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { genererTilbud } from '../lib/openai'
import { sendPaminnelseEpost, sendTilbudEpost } from '../lib/resend'
import {
  hentFirma,
  hentTilbudHendelser,
  oppdaterTilbudSnapshotUtenHendelse,
  registrerForstePaminnelseSendt,
  registrerSistePaminnelseSendt,
  registrerTilbudUtfort,
  registrerNyttTilbudSendt,
  supabase,
} from '../lib/supabase'
import { fjernKortLinje } from '../lib/tekstUtils'
import { beregnTilbudPrisLinjer } from '../lib/tilbudPris'
import { hentAutoPaminnelserEnabled } from '../lib/paminnelseInnstillinger'
import { getCachedTilbudHendelser, setCachedTilbudHendelser } from '../lib/tilbudHendelserCache'
import { TilbudsForhåndsvisning } from './TilbudsForhåndsvisning'
import type { Forespørsel, Firma, TilbudHendelse, TilbudHendelseType } from '../types'
import { getTilbudKortStatus } from '../utils/tilbudStatus'

// Simplified details layout: restore the previous revision of this file from git history if the richer summary-based version is preferred again.
// Timeline now prefers tilbud_hendelser and only falls back to snapshot-derived rows for legacy data or before the migration is applied.

const KUNDE_JUSTERING_METADATA_NØKLER = [
  'kundeJustering',
  'kunde_justering',
  'meldingFraKunde',
  'melding_fra_kunde',
  'melding',
  'message',
  'customerMessage',
  'customer_message',
  'justeringTekst',
  'justering_tekst',
  'text',
  'body',
] as const

type TimelineEvent = {
  key: string
  title: string
  dateLabel?: string
  dotColor: string
  description?: string
}

type StatusPresentation = {
  currentStatus: string
  currentStatusColor: string
  timelineEvents: TimelineEvent[]
}

interface Props {
  tilbud: Forespørsel | null
  visible: boolean
  onClose: () => void
  onOppdatert: (kundeNavn: string) => void
  onUtfort?: (kundeNavn: string) => void
}

const HENDELSE_META: Record<TilbudHendelseType, { title: string; dotColor: string }> = {
  tilbud_sendt: { title: 'Tilbud sendt', dotColor: '#48C774' },
  nytt_tilbud_sendt: { title: 'Nytt tilbud sendt', dotColor: '#48C774' },
  justering_forespurt: { title: 'Kunde ber om justering', dotColor: '#4B7BFF' },
  paminnelse_sendt: { title: 'Påminnelse sendt', dotColor: '#D7872F' },
  siste_paminnelse_sendt: { title: 'Siste påminnelse sendt', dotColor: '#E45858' },
  godkjent: { title: 'Godkjent', dotColor: '#48C774' },
  utfort: { title: 'Utført', dotColor: '#48C774' },
  avslatt: { title: 'Avslått', dotColor: '#AEB6C2' },
}

function formaterAbsoluttDato(datoString?: string) {
  if (!datoString) return undefined

  return new Date(datoString).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
  })
}

function dagerSiden(datoString?: string) {
  if (!datoString) return null
  const dato = new Date(datoString)
  if (Number.isNaN(dato.getTime())) return null
  const now = new Date()
  const startA = new Date(dato)
  startA.setHours(0, 0, 0, 0)
  const startB = new Date(now)
  startB.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((startB.getTime() - startA.getTime()) / (24 * 60 * 60 * 1000)))
}

function hentLegacyForsteSendtDato(tilbud: Forespørsel) {
  return (
    tilbud.forsteSendtDato ??
    (tilbud.status !== 'avventer' ? tilbud.opprettetDato : undefined)
  )
}

function hentLegacySisteSendtDato(tilbud: Forespørsel) {
  return tilbud.sistSendtDato ?? tilbud.sendtDato ?? hentLegacyForsteSendtDato(tilbud)
}

function hentLegacyPaminnelser(tilbud: Forespørsel) {
  const fraStatus =
    tilbud.status === 'siste_paminnelse_sendt'
      ? 2
      : tilbud.status === 'paminnelse_sendt'
        ? 1
        : 0

  const fraDatoer =
    (tilbud.forstePaminnelseSendtDato || tilbud.forstePaminnelseDato ? 1 : 0) +
    (tilbud.sistePaminnelseSendtDato || tilbud.sistePaminnelseDato ? 1 : 0)

  return Math.max(tilbud.antallPaminnelser ?? 0, fraStatus, fraDatoer)
}

function hentLegacyJusteringDato(tilbud: Forespørsel) {
  return (
    tilbud.justeringOnsketDato ??
    tilbud.sistePaminnelseSendtDato ??
    tilbud.sistePaminnelseDato ??
    tilbud.forstePaminnelseSendtDato ??
    tilbud.forstePaminnelseDato ??
    hentLegacySisteSendtDato(tilbud) ??
    hentLegacyForsteSendtDato(tilbud) ??
    tilbud.opprettetDato
  )
}

function hentLegacyAvslutningsDato(tilbud: Forespørsel) {
  return (
    tilbud.godkjentDato ??
    tilbud.avslattDato ??
    hentLegacySisteSendtDato(tilbud) ??
    tilbud.sistePaminnelseSendtDato ??
    tilbud.sistePaminnelseDato ??
    tilbud.forstePaminnelseSendtDato ??
    tilbud.forstePaminnelseDato ??
    hentLegacyForsteSendtDato(tilbud) ??
    tilbud.opprettetDato
  )
}

function hentStatusMeta(tilbud: Forespørsel) {
  const meta = getTilbudKortStatus(tilbud)
  return { label: meta.label, color: meta.dotColor }
}

function hentHeaderStatus(tilbud: Forespørsel): { label: string; color: string } {
  if (tilbud.status === 'justering') {
    return { label: 'Justering', color: '#6FA4FF' }
  }

  if (tilbud.status === 'godkjent' || tilbud.status === 'utfort') {
    return { label: 'Godkjent', color: '#72C791' }
  }

  return { label: 'Sendt', color: '#F5F7FA' }
}

function hentTekstFraMetadata(
  metadata: Record<string, unknown> | undefined,
  nøkler: string[]
) {
  if (!metadata) return undefined

  for (const nøkkel of nøkler) {
    const verdi = metadata[nøkkel]
    if (typeof verdi === 'string' && verdi.trim().length > 0) {
      return verdi.trim()
    }
    if (typeof verdi === 'number' && Number.isFinite(verdi)) {
      return String(verdi)
    }
  }

  return undefined
}

/**
 * Full kundemelding for justering: rad først, deretter nyeste relevante hendelse(r),
 * til slutt AI-oppsummering som siste reserve (noen eldre flyter lagret kun der).
 */
function utledKundeJusteringsTekst(tilbud: Forespørsel, hendelser: TilbudHendelse[]) {
  const fraRad = tilbud.kundeJustering?.trim()
  if (fraRad) return fraRad

  for (let index = hendelser.length - 1; index >= 0; index -= 1) {
    const h = hendelser[index]
    if (h.hendelseType !== 'justering_forespurt') continue
    const fraMeta = hentTekstFraMetadata(h.metadata, [...KUNDE_JUSTERING_METADATA_NØKLER])
    if (fraMeta) return fraMeta
    const bes = h.beskrivelse?.trim()
    if (bes) return bes
  }

  return tilbud.aiOppsummering?.trim() || undefined
}

function formatTimerOversikt(timer: number): string {
  if (timer <= 0) return '0 timer'
  if (timer % 1 === 0) return `${timer} timer`
  return `${timer.toLocaleString('nb-NO')} timer`
}

function parseTimerFraTekst(raw: string, fallback: number): number {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

function parseMaterialFraTekst(raw: string, fallback: number): number {
  const cleaned = String(raw).replace(/\s/g, '').replace(/[^\d]/g, '')
  const n = parseInt(cleaned, 10)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

function parseTimeprisFraTekst(raw: string, fallback: number): number {
  const cleaned = String(raw).replace(/\s/g, '')
  const n = parseInt(cleaned, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

function parsePaslagFraTekst(raw: string, fallback: number): number {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(100, n)
}

function hentVersjonFraHendelse(hendelse: TilbudHendelse) {
  const versjon = hendelse.metadata?.versjon

  if (typeof versjon === 'number' && Number.isFinite(versjon)) {
    return versjon
  }

  if (typeof versjon === 'string') {
    const parsed = Number(versjon)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function finnInsertIndexForSnapshotJustering(
  tilbud: Forespørsel,
  hendelser: TilbudHendelse[],
  justeringDato?: string
) {
  const aktivVersjon = tilbud.versjon ?? 1

  if (aktivVersjon > 1) {
    const versjonsTreff = hendelser.findIndex(
      hendelse =>
        hendelse.hendelseType === 'nytt_tilbud_sendt' &&
        hentVersjonFraHendelse(hendelse) === aktivVersjon
    )

    if (versjonsTreff !== -1) {
      return versjonsTreff
    }

    for (let index = hendelser.length - 1; index >= 0; index -= 1) {
      if (hendelser[index].hendelseType === 'nytt_tilbud_sendt') {
        return index
      }
    }
  }

  if (justeringDato) {
    const insertIndex = hendelser.findIndex(
      hendelse => hendelse.opprettetDato && hendelse.opprettetDato > justeringDato
    )

    return insertIndex === -1 ? hendelser.length : insertIndex
  }

  return hendelser.length
}

function byggLegacyTidslinje(tilbud: Forespørsel): TimelineEvent[] {
  const hendelser: Array<{ key: string; title: string; date?: string; dotColor: string }> = []

  const opprinneligSendtDato = hentLegacyForsteSendtDato(tilbud)
  if (opprinneligSendtDato) {
    hendelser.push({
      key: 'sendt',
      title: 'Tilbud sendt',
      date: opprinneligSendtDato,
      dotColor: '#48C774',
    })
  }

  const forstePaminnelseDato =
    tilbud.forstePaminnelseSendtDato ?? tilbud.forstePaminnelseDato
  if (forstePaminnelseDato || hentLegacyPaminnelser(tilbud) >= 1) {
    hendelser.push({
      key: 'forste-paminnelse',
      title: 'Påminnelse sendt',
      date: forstePaminnelseDato,
      dotColor: '#D7872F',
    })
  }

  const sistePaminnelseDato =
    tilbud.sistePaminnelseSendtDato ?? tilbud.sistePaminnelseDato
  if (sistePaminnelseDato || hentLegacyPaminnelser(tilbud) >= 2) {
    hendelser.push({
      key: 'siste-paminnelse',
      title: 'Siste påminnelse sendt',
      date: sistePaminnelseDato,
      dotColor: '#E45858',
    })
  }

  if (tilbud.status === 'justering' || tilbud.kundeJustering) {
    hendelser.push({
      key: 'justering',
      title: 'Kunde ber om justering',
      date: hentLegacyJusteringDato(tilbud),
      dotColor: '#4B7BFF',
    })
  }

  const nyttTilbudSendtDato = hentLegacySisteSendtDato(tilbud)
  if (nyttTilbudSendtDato && nyttTilbudSendtDato !== opprinneligSendtDato) {
    hendelser.push({
      key: 'nytt-tilbud-sendt',
      title: 'Nytt tilbud sendt',
      date: nyttTilbudSendtDato,
      dotColor: '#48C774',
    })
  }

  if (tilbud.status === 'godkjent') {
    hendelser.push({
      key: 'godkjent',
      title: 'Godkjent',
      date: tilbud.godkjentDato ?? hentLegacyAvslutningsDato(tilbud),
      dotColor: '#48C774',
    })
  }

  if (tilbud.status === 'avslatt') {
    hendelser.push({
      key: 'avslatt',
      title: 'Avslått',
      date: tilbud.avslattDato ?? hentLegacyAvslutningsDato(tilbud),
      dotColor: '#AEB6C2',
    })
  }

  return hendelser.map(hendelse => ({
    key: hendelse.key,
    title: hendelse.title,
    dateLabel: formaterAbsoluttDato(hendelse.date),
    dotColor: hendelse.dotColor,
  }))
}

function byggEventTidslinje(tilbud: Forespørsel, hendelser: TilbudHendelse[]): TimelineEvent[] {
  return hendelser.map(hendelse => {
    const meta = HENDELSE_META[hendelse.hendelseType]

    return {
      key: hendelse.id,
      title: hendelse.tittel || meta.title,
      dateLabel: formaterAbsoluttDato(hendelse.opprettetDato),
      dotColor: meta.dotColor,
      // Ikke vis kundens melding i tidslinjen (vises i egen boble i UI).
      description: hendelse.hendelseType === 'justering_forespurt' ? undefined : hendelse.beskrivelse ?? undefined,
    }
  })
}

function byggStatusPresentasjon(
  tilbud: Forespørsel,
  hendelser: TilbudHendelse[]
): StatusPresentation {
  const statusMeta = hentStatusMeta(tilbud)

  let timelineEvents: TimelineEvent[]

  if (hendelser.length === 0) {
    timelineEvents = byggLegacyTidslinje(tilbud)
  } else {
    timelineEvents = byggEventTidslinje(tilbud, hendelser)

    // Supplement: inject justering from snapshot when no event was logged.
    // This happens when the customer requested adjustment before tilbud_hendelser
    // was introduced (old web portal did a direct status update without inserting an event).
    const harJustering = hendelser.some(h => h.hendelseType === 'justering_forespurt')
    if (
      !harJustering &&
      (tilbud.status === 'justering' || tilbud.kundeJustering)
    ) {
      const justeringDato = hentLegacyJusteringDato(tilbud)
      const snapshotEntry: TimelineEvent = {
        key: 'snapshot-justering',
        title: 'Kunde ber om justering',
        dateLabel: formaterAbsoluttDato(justeringDato),
        dotColor: '#4B7BFF',
        description: undefined,
      }
      // When historical justering events are missing, anchor the synthetic row to the
      // resend cycle for the current versjon instead of the first resend in the list.
      const insertIndex = finnInsertIndexForSnapshotJustering(
        tilbud,
        hendelser,
        justeringDato
      )
      if (insertIndex === -1) {
        timelineEvents = [...timelineEvents, snapshotEntry]
      } else {
        timelineEvents = [
          ...timelineEvents.slice(0, insertIndex),
          snapshotEntry,
          ...timelineEvents.slice(insertIndex),
        ]
      }
    }

    // Preserve terminal states from the snapshot when older flows updated tilbud
    // without inserting the corresponding event row.
    const harGodkjent = hendelser.some(h => h.hendelseType === 'godkjent')
    if (!harGodkjent && tilbud.status === 'godkjent') {
      timelineEvents = [
        ...timelineEvents,
        {
          key: 'snapshot-godkjent',
          title: 'Godkjent',
          dateLabel: formaterAbsoluttDato(tilbud.godkjentDato ?? hentLegacyAvslutningsDato(tilbud)),
          dotColor: '#48C774',
        },
      ]
    }

    const harAvslatt = hendelser.some(h => h.hendelseType === 'avslatt')
    if (!harAvslatt && tilbud.status === 'avslatt') {
      timelineEvents = [
        ...timelineEvents,
        {
          key: 'snapshot-avslatt',
          title: 'Avslått',
          dateLabel: formaterAbsoluttDato(tilbud.avslattDato ?? hentLegacyAvslutningsDato(tilbud)),
          dotColor: '#AEB6C2',
        },
      ]
    }
  }

  return {
    currentStatus: statusMeta.label,
    currentStatusColor: statusMeta.color,
    timelineEvents,
  }
}

function rensTelefonnummer(telefon?: string) {
  if (!telefon) return ''
  return telefon.replace(/[^\d+]/g, '')
}

const oppdaterPrisITekst = (
  originalTekst: string,
  materialerInklMva: number,
  arbeidInklMva: number,
  totalInklMva: number
): string => {
  const nyPrisseksjon =
    `Pris:\n` +
    `Materialer inkl. mva:    kr ${materialerInklMva.toLocaleString('nb-NO')}  \n` +
    `Arbeid inkl. mva:        kr ${arbeidInklMva.toLocaleString('nb-NO')}  \n` +
    `─────────────────────────────────────  \n` +
    `Totalt inkl. mva:        kr ${totalInklMva.toLocaleString('nb-NO')}`

  const prisStart = originalTekst.indexOf('Pris:')
  if (prisStart === -1) return originalTekst

  const etterPris = originalTekst.indexOf('\nVi ser frem', prisStart)
  const etterPris2 = originalTekst.indexOf('\nMed vennlig', prisStart)
  const slutt =
    etterPris !== -1
      ? etterPris
      : etterPris2 !== -1
        ? etterPris2
        : originalTekst.length

  return (
    originalTekst.slice(0, prisStart) +
    nyPrisseksjon +
    originalTekst.slice(slutt)
  )
}

export default function TilbudDetaljerModal({
  tilbud,
  visible,
  onClose,
  onOppdatert,
  onUtfort,
}: Props) {
  const bekreftAnimasjon = useRef(new Animated.Value(0)).current
  const totalPopScale = useRef(new Animated.Value(1)).current
  const forrigeTotalInklRef = useRef<number | null>(null)
  const [firma, setFirma] = useState<Firma | null>(null)
  const [hendelser, setHendelser] = useState<TilbudHendelse[] | null>(null)
  const [timerTekst, setTimerTekst] = useState(String(tilbud?.timer ?? 8))
  const [materialTekst, setMaterialTekst] = useState(String(tilbud?.materialkostnad ?? 0))
  const [timeprisTekst, setTimeprisTekst] = useState('')
  const [matPaslagTekst, setMatPaslagTekst] = useState('')
  const [visAvansertePriser, setVisAvansertePriser] = useState(false)
  const [bekreftet, setBekreftet] = useState(false)
  const [viserOppdatertPris, setViserOppdatertPris] = useState(false)
  const [oppdatertTekst, setOppdatertTekst] = useState('')
  const [oppdatererPris, setOppdatererPris] = useState(false)
  const [sender, setSender] = useState(false)
  const [justeringFase, setJusteringFase] = useState<'klar' | 'genererer' | 'klar_til_sending'>('klar')
  const [senderPaminnelse, setSenderPaminnelse] = useState(false)
  const [autoPaminnelserEnabled, setAutoPaminnelserEnabledState] = useState(false)

  useEffect(() => {
    if (!visible) return
    let avbrutt = false
    hentAutoPaminnelserEnabled().then(enabled => {
      if (!avbrutt) setAutoPaminnelserEnabledState(enabled)
    })
    return () => {
      avbrutt = true
    }
  }, [visible])

  useEffect(() => {
    let avbrutt = false

    async function lastData() {
      try {
        const hendelserData = tilbud
          ? await hentTilbudHendelser(tilbud.id)
          : []

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!avbrutt) {
          setHendelser(hendelserData)
          if (tilbud) {
            setCachedTilbudHendelser(tilbud.id, hendelserData)
          }
        }

        if (!user) {
          if (!avbrutt) {
            setFirma(null)
          }
          return
        }

        const firmaData = await hentFirma(user.id)
        if (!avbrutt) {
          setFirma(firmaData)
        }
      } catch (error) {
        console.error('Feil ved lasting av firma:', error)
      }
    }

    void lastData()

    return () => {
      avbrutt = true
    }
  }, [tilbud?.id])

  useEffect(() => {
    if (tilbud) {
      setTimerTekst(String(tilbud.timer ?? 8))
      setMaterialTekst(String(tilbud.materialkostnad ?? 0))
      setTimeprisTekst('')
      setMatPaslagTekst('')
      setVisAvansertePriser(false)
      setBekreftet(false)
      setViserOppdatertPris(false)
      setOppdatertTekst('')
      setOppdatererPris(false)
      setSender(false)
      setSenderPaminnelse(false)
      setHendelser(getCachedTilbudHendelser(tilbud.id) ?? null)
      setJusteringFase('klar')
      bekreftAnimasjon.setValue(0)
      forrigeTotalInklRef.current = null
    }
  }, [tilbud?.id, bekreftAnimasjon])

  useEffect(() => {
    if (!firma || !tilbud) return
    setTimeprisTekst(prev => (prev.trim() === '' ? String(firma.timepris ?? 950) : prev))
    setMatPaslagTekst(prev => (prev.trim() === '' ? String(firma.materialPaslag ?? 15) : prev))
  }, [firma?.id, tilbud?.id])

  const harPrisEndring = useMemo(() => {
    if (!tilbud || !firma) return false
    const ot = tilbud.timer ?? 8
    const om = tilbud.materialkostnad ?? 0
    const fTp = firma.timepris ?? 950
    const fPs = firma.materialPaslag ?? 15
    const t = parseTimerFraTekst(timerTekst, ot)
    const m = parseMaterialFraTekst(materialTekst, om)
    const tp = parseTimeprisFraTekst(timeprisTekst, fTp)
    const ps = parsePaslagFraTekst(matPaslagTekst, fPs)
    return t !== ot || m !== om || tp !== fTp || ps !== fPs
  }, [
    tilbud?.id,
    tilbud?.timer,
    tilbud?.materialkostnad,
    firma?.id,
    firma?.timepris,
    firma?.materialPaslag,
    timerTekst,
    materialTekst,
    timeprisTekst,
    matPaslagTekst,
  ])

  useEffect(() => {
    if (!tilbud || !firma) return
    const ot = tilbud.timer ?? 8
    const om = tilbud.materialkostnad ?? 0
    const fTp = firma.timepris ?? 950
    const fPs = firma.materialPaslag ?? 15
    const t = parseTimerFraTekst(timerTekst, ot)
    const m = parseMaterialFraTekst(materialTekst, om)
    const tp = parseTimeprisFraTekst(timeprisTekst, fTp)
    const ps = parsePaslagFraTekst(matPaslagTekst, fPs)
    const total = beregnTilbudPrisLinjer({
      timer: t,
      materialkostnad: m,
      timepris: tp,
      materialPaslag: ps,
    }).totalInklMva

    if (forrigeTotalInklRef.current === null) {
      forrigeTotalInklRef.current = total
      return
    }
    if (forrigeTotalInklRef.current === total) return
    forrigeTotalInklRef.current = total

    totalPopScale.setValue(1)
    Animated.sequence([
      Animated.timing(totalPopScale, {
        toValue: 1.035,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(totalPopScale, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()
  }, [tilbud?.id, timerTekst, materialTekst, timeprisTekst, matPaslagTekst, firma?.id])

  if (!tilbud) return null

  const aktivtTilbud = tilbud
  const erGodkjentTilbud = aktivtTilbud.status.toLowerCase() === 'godkjent'
  const erUtfortTilbud = aktivtTilbud.status.toLowerCase() === 'utfort'
  const erAvslattTilbud = aktivtTilbud.status.toLowerCase() === 'avslatt'
  const erJusteringsTilbud = aktivtTilbud.status.toLowerCase() === 'justering'
  const statusMeta = hentStatusMeta(aktivtTilbud)
  const hendelserForVisning = hendelser ?? []
  const kundeJusteringsTekst = utledKundeJusteringsTekst(aktivtTilbud, hendelserForVisning)
  const presentasjon =
    hendelser === null
      ? {
          currentStatus: statusMeta.label,
          currentStatusColor: statusMeta.color,
          timelineEvents: byggLegacyTidslinje(aktivtTilbud),
        }
      : byggStatusPresentasjon(aktivtTilbud, hendelserForVisning)
  const headerStatus = hentHeaderStatus(aktivtTilbud)
  const visPrisjusteringKort = !erGodkjentTilbud && !erUtfortTilbud && !erAvslattTilbud
  const originalTimer = aktivtTilbud.timer ?? 8
  const originalMaterialkostnad = aktivtTilbud.materialkostnad ?? 0
  const sisteSendtDato =
    aktivtTilbud.sistSendtDato ??
    aktivtTilbud.sendtDato ??
    aktivtTilbud.forsteSendtDato ??
    undefined
  const dagerSidenSistSendt = dagerSiden(sisteSendtDato) ?? 0
  const antallPaminnelser = aktivtTilbud.antallPaminnelser ?? 0

  const fallbackTimepris = firma?.timepris ?? 950
  const fallbackPaslag = firma?.materialPaslag ?? 15
  const timer = parseTimerFraTekst(timerTekst, originalTimer)
  const materialkostnad = parseMaterialFraTekst(materialTekst, originalMaterialkostnad)
  const timepris = parseTimeprisFraTekst(timeprisTekst, fallbackTimepris)
  const matPaslag = parsePaslagFraTekst(matPaslagTekst, fallbackPaslag)
  const prisLinjer = beregnTilbudPrisLinjer({
    timer,
    materialkostnad,
    timepris,
    materialPaslag: matPaslag,
  })
  const sumEksMva = prisLinjer.totalEksMva
  const totalInklMva = prisLinjer.totalInklMva
  const materialerInklMva = prisLinjer.materialerInklMva
  const arbeidInklMva = prisLinjer.arbeidInklMva
  const grunntekst = fjernKortLinje(aktivtTilbud.generertTekst ?? '')

  const visningsTekst = viserOppdatertPris
    ? erJusteringsTilbud
      ? (oppdatertTekst || grunntekst)
      : oppdaterPrisITekst(
          grunntekst,
          materialerInklMva,
          arbeidInklMva,
          totalInklMva
        )
    : grunntekst

  const kanBekrefte = erJusteringsTilbud ? true : harPrisEndring

  const kanSendePaminnelse =
    !erGodkjentTilbud &&
    !erUtfortTilbud &&
    !erAvslattTilbud &&
    aktivtTilbud.status === 'sendt' &&
    Boolean(aktivtTilbud.kundeEpost) &&
    Boolean(aktivtTilbud.generertTekst) &&
    antallPaminnelser < 2 &&
    dagerSidenSistSendt >= (antallPaminnelser === 0 ? 3 : 7) &&
    !senderPaminnelse &&
    !autoPaminnelserEnabled

  const nullstillEtterPrisRedigering = () => {
    setBekreftet(false)
    setViserOppdatertPris(false)
    setOppdatertTekst('')
    if (erJusteringsTilbud) {
      setJusteringFase('klar')
    }
    bekreftAnimasjon.setValue(0)
  }

  const bekreftIkonSkala = bekreftAnimasjon.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.7, 1.12, 1],
  })

  const bekreftIkonOpacity = bekreftAnimasjon.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  })

  const sendOppdatertTilbud = async () => {
    if (erJusteringsTilbud) {
      if (justeringFase !== 'klar_til_sending' || !aktivtTilbud || !firma) return
    } else if (!bekreftet || !aktivtTilbud || !firma) {
      return
    }

    setSender(true)

    try {
      const sendtDato = new Date().toISOString()

      await sendTilbudEpost({
        tilEpost: aktivtTilbud.kundeEpost ?? '',
        kundeNavn: aktivtTilbud.kundeNavn,
        firmanavn: firma.firmanavn,
        generertTekst: visningsTekst,
        prisEksMva: sumEksMva,
        tilbudId: aktivtTilbud.id,
      })

      await oppdaterTilbudSnapshotUtenHendelse(aktivtTilbud.id, {
        generert_tekst: visningsTekst,
        timer,
        materialkostnad,
        pris_eks_mva: sumEksMva,
        status: 'sendt',
        // Når et nytt tilbud sendes etter justering/godkjenning skal det oppføre seg som "nytt".
        sett_som_lest: false,
        kunde_justering: null,
        ai_oppsummering: null,
        justering_onsket_dato: null,
      })

      await registrerNyttTilbudSendt({
        tilbudId: aktivtTilbud.id,
        firmaId: aktivtTilbud.firmaId,
        opprettetDato: sendtDato,
        versjon: aktivtTilbud.versjon ?? 1,
      })

      onOppdatert(aktivtTilbud.kundeNavn)
      onClose()
    } catch (err) {
      console.error('Feil ved sending av tilbud:', err)
    } finally {
      setSender(false)
    }
  }

  function avvisJustering() {
    if (!erJusteringsTilbud) return

    Alert.alert(
      'Avvis justering?',
      'Tilbudet beholder original status.\nKunden får ingen beskjed.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Avvis',
          style: 'destructive',
          onPress: async () => {
            try {
              await oppdaterTilbudSnapshotUtenHendelse(aktivtTilbud.id, {
                status: 'sendt',
                sett_som_lest: false,
                kunde_justering: null,
                ai_oppsummering: null,
                justering_onsket_dato: null,
              })

              onClose()
            } catch (error) {
              console.error('Feil ved avvisning av justering:', error)
            }
          },
        },
      ]
    )
  }

  const sendPaminnelse = async () => {
    if (!kanSendePaminnelse || !firma) return
    if (!aktivtTilbud.kundeEpost || !aktivtTilbud.generertTekst) return

    setSenderPaminnelse(true)
    try {
      const sendtDato = new Date().toISOString()
      const erSiste = antallPaminnelser >= 1

      await sendPaminnelseEpost(
        {
          tilEpost: aktivtTilbud.kundeEpost,
          kundeNavn: aktivtTilbud.kundeNavn,
          firmanavn: firma.firmanavn,
          generertTekst: aktivtTilbud.generertTekst,
          prisEksMva: aktivtTilbud.prisEksMva,
          tilbudId: aktivtTilbud.id,
        },
        erSiste
      )

      if (erSiste) {
        await registrerSistePaminnelseSendt({
          tilbudId: aktivtTilbud.id,
          firmaId: aktivtTilbud.firmaId,
          opprettetDato: sendtDato,
          antallPaminnelser,
        })
      } else {
        await registrerForstePaminnelseSendt({
          tilbudId: aktivtTilbud.id,
          firmaId: aktivtTilbud.firmaId,
          opprettetDato: sendtDato,
          antallPaminnelser,
        })
      }

      onOppdatert(aktivtTilbud.kundeNavn)
    } catch (error) {
      console.error('Feil ved sending av påminnelse:', error)
    } finally {
      setSenderPaminnelse(false)
    }
  }

  const markerSomUtfort = async () => {
    if (!firma || !erGodkjentTilbud) return
    try {
      const opprettetDato = new Date().toISOString()
      await registrerTilbudUtfort({
        tilbudId: aktivtTilbud.id,
        firmaId: aktivtTilbud.firmaId,
        opprettetDato,
        beskrivelse: 'Håndverkeren markerte tilbudet som utført',
      })
      onUtfort?.(aktivtTilbud.kundeNavn)
      onClose()
    } catch (error) {
      console.error('Feil ved markering som utført:', error)
    }
  }


  async function åpneTelefon() {
    const nummer = rensTelefonnummer(aktivtTilbud.kundeTelefon)
    if (!nummer) return

    const url = `tel:${nummer}`
    const kanÅpne = await Linking.canOpenURL(url)
    if (kanÅpne) {
      await Linking.openURL(url)
    }
  }

  async function åpneEpost() {
    if (!aktivtTilbud.kundeEpost) return

    const url = `mailto:${aktivtTilbud.kundeEpost}`
    const kanÅpne = await Linking.canOpenURL(url)
    if (kanÅpne) {
      await Linking.openURL(url)
    }
  }

  async function bekreftJustering() {
    try {
      setJusteringFase('genererer')

      if (harPrisEndring) {
        await oppdaterTilbudSnapshotUtenHendelse(aktivtTilbud.id, {
          pris_eks_mva: sumEksMva,
          timer,
          materialkostnad,
        })
      }

      const justeringFraKunde = utledKundeJusteringsTekst(aktivtTilbud, hendelserForVisning) ?? ''
      const jobbBeskrivelseTilAI = justeringFraKunde
        ? `${aktivtTilbud.jobbBeskrivelse}\n\nJustering fra kunde: ${justeringFraKunde}`
        : aktivtTilbud.jobbBeskrivelse

      const nyTekst = await genererTilbud({
        kundeNavn: aktivtTilbud.kundeNavn,
        jobbBeskrivelse: jobbBeskrivelseTilAI,
        firmanavn: firma?.firmanavn ?? '',
        adresse: aktivtTilbud.adresse ?? firma?.adresse ?? '',
        telefon: firma?.telefon ?? '',
        epost: firma?.epost ?? '',
        prisEksMva: sumEksMva,
        timer,
        materialkostnad,
        timepris,
        materialpaslagProsent: matPaslag,
        dagensdato: new Date().toLocaleDateString('nb-NO'),
      })
      const rensetTilbud = fjernKortLinje(nyTekst)

      await oppdaterTilbudSnapshotUtenHendelse(aktivtTilbud.id, {
        generert_tekst: rensetTilbud,
      })

      setOppdatertTekst(rensetTilbud)
      setBekreftet(true)
      setViserOppdatertPris(true)
      setJusteringFase('klar_til_sending')
      bekreftAnimasjon.setValue(0)
      Animated.sequence([
        Animated.timing(bekreftAnimasjon, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start()
    } catch (error) {
      console.error('Feil ved justeringsbekreftelse:', error)
      setJusteringFase('klar')
    }
  }

  async function bekreftPrisendring() {
    if (!harPrisEndring || oppdatererPris) return

    setOppdatererPris(true)

    try {
      await oppdaterTilbudSnapshotUtenHendelse(aktivtTilbud.id, {
        pris_eks_mva: sumEksMva,
        timer,
        materialkostnad,
      })

      setBekreftet(true)
      setViserOppdatertPris(true)
    } catch (error) {
      console.error('Feil ved prisoppdatering:', error)
    } finally {
      setOppdatererPris(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <OfferStatusHeader
          currentStatus={headerStatus.label}
          currentStatusColor={headerStatus.color}
          onClose={onClose}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <OfferInternalSummaryCard
            tilbud={aktivtTilbud}
            tjenesteLabel={
              aktivtTilbud.kortBeskrivelse ||
              aktivtTilbud.jobbType ||
              'Tilbud'
            }
            totalInklMva={totalInklMva}
            arbeidInklMva={arbeidInklMva}
            materialerInklMva={materialerInklMva}
            timerLabel={formatTimerOversikt(timer)}
            totalScale={totalPopScale}
            onPhonePress={åpneTelefon}
            onEmailPress={åpneEpost}
            reminderButton={
              kanSendePaminnelse ? (
                <TouchableOpacity
                  style={styles.paminnelseTextKnapp}
                  onPress={() => void sendPaminnelse()}
                  activeOpacity={0.82}
                  disabled={senderPaminnelse}
                >
                  {senderPaminnelse ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.paminnelseTextKnappTekst}>Send påminnelse</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />

          <OfferTimelinePanel
            events={presentasjon.timelineEvents}
            loading={hendelser === null}
          />

          {erGodkjentTilbud ? (
            <View style={styles.utfortKort}>
              <Text style={styles.utfortMeta}>
                Marker tilbudet som utført når jobben er ferdig.{'\n'}Dette fjerner det fra aktive tilbud.
              </Text>
              <TouchableOpacity
                onPress={() => void markerSomUtfort()}
                activeOpacity={0.92}
                disabled={!firma}
                style={styles.primaryCtaFullWidth}
              >
                <LinearGradient
                  colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryCtaGradient}
                >
                  <Text style={styles.primaryCtaTekst}>Marker som utført</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}

          {visPrisjusteringKort ? (
            <>
              <View
                style={[
                  styles.prisRedigerKort,
                  erJusteringsTilbud && styles.prisRedigerKortTightBottom,
                ]}
              >
                {erJusteringsTilbud ? (
                  <View style={styles.kundeMeldingBoks}>
                    <Text
                      style={[
                        styles.kundeMeldingTittel,
                        !kundeJusteringsTekst && styles.justeringsHeaderSummaryLoading,
                      ]}
                      numberOfLines={1}
                    >
                      Melding fra kunde
                    </Text>
                    <View style={styles.kundeMeldingSkille} />
                    <Text
                      style={[
                        styles.kundeMeldingTekst,
                        !kundeJusteringsTekst && styles.justeringsHeaderSummaryLoading,
                      ]}
                    >
                      {kundeJusteringsTekst?.trim() || '(mangler)'}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.prisRedigerSeksjonstittel}>Pris og omfang</Text>
                <View style={styles.prisInputRad}>
                  <View style={styles.prisInputCell}>
                    <Text style={styles.prisInputLabel}>Timer</Text>
                    <TextInput
                      style={styles.prisInput}
                      value={timerTekst}
                      onChangeText={v => {
                        setTimerTekst(v)
                        nullstillEtterPrisRedigering()
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                    />
                  </View>
                  <View style={styles.prisInputCell}>
                    <Text style={styles.prisInputLabel}>Material (kr)</Text>
                    <TextInput
                      style={styles.prisInput}
                      value={materialTekst}
                      onChangeText={v => {
                        setMaterialTekst(v)
                        nullstillEtterPrisRedigering()
                      }}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.avansertePriserToggle}
                  onPress={() => setVisAvansertePriser(v => !v)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={styles.avansertePriserToggleTekst}>Avanserte prisvalg</Text>
                  <Ionicons
                    name={visAvansertePriser ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="rgba(255,255,255,0.45)"
                  />
                </TouchableOpacity>

                {visAvansertePriser ? (
                  <View style={styles.prisInputRad}>
                    <View style={styles.prisInputCell}>
                      <Text style={styles.prisInputLabel}>Timepris (kr/t)</Text>
                      <TextInput
                        style={styles.prisInput}
                        value={timeprisTekst}
                        onChangeText={v => {
                          setTimeprisTekst(v)
                          nullstillEtterPrisRedigering()
                        }}
                        keyboardType="number-pad"
                        placeholder={String(fallbackTimepris)}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                      />
                    </View>
                    <View style={styles.prisInputCell}>
                      <Text style={styles.prisInputLabel}>Mat.påslag (%)</Text>
                      <TextInput
                        style={styles.prisInput}
                        value={matPaslagTekst}
                        onChangeText={v => {
                          setMatPaslagTekst(v)
                          nullstillEtterPrisRedigering()
                        }}
                        keyboardType="decimal-pad"
                        placeholder={String(fallbackPaslag)}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.prisActionDivider} />

                <View style={styles.prisActionRad}>
                  {erJusteringsTilbud ? (
                    <TouchableOpacity
                      style={styles.primaryCtaTouch}
                      onPress={() => {
                        if (justeringFase === 'klar') {
                          void bekreftJustering()
                          return
                        }
                        if (justeringFase === 'klar_til_sending') {
                          void sendOppdatertTilbud()
                        }
                      }}
                      disabled={justeringFase === 'genererer' || sender}
                      activeOpacity={0.92}
                    >
                      {justeringFase === 'genererer' ? (
                        <LinearGradient
                          colors={['rgba(45,90,62,0.95)', 'rgba(24,55,38,0.98)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.primaryCtaGradient, styles.primaryCtaInner]}
                        >
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.primaryCtaTekst}>Genererer tilbud...</Text>
                        </LinearGradient>
                      ) : justeringFase === 'klar_til_sending' || bekreftet ? (
                        <LinearGradient
                          colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.primaryCtaGradient, styles.primaryCtaInner]}
                        >
                          {justeringFase === 'klar_til_sending' ? (
                            <View style={styles.knappInnhold}>
                              {sender ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                              )}
                              <Text style={styles.primaryCtaTekst}>Send tilbud</Text>
                            </View>
                          ) : (
                            <View style={styles.knappInnhold}>
                              <Animated.View
                                style={{
                                  opacity: bekreftIkonOpacity,
                                  transform: [{ scale: bekreftIkonSkala }],
                                }}
                              >
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                              </Animated.View>
                              <Text style={styles.primaryCtaTekst}>Pris oppdatert!</Text>
                            </View>
                          )}
                        </LinearGradient>
                      ) : (
                        <LinearGradient
                          colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.primaryCtaGradient, styles.primaryCtaInner]}
                        >
                          <Text style={styles.primaryCtaTekst}>Generer nytt tilbud</Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.primaryCtaTouch}
                      onPress={() => {
                        if (bekreftet) {
                          void sendOppdatertTilbud()
                          return
                        }
                        void bekreftPrisendring()
                      }}
                      disabled={(!kanBekrefte && !bekreftet) || sender || oppdatererPris}
                      activeOpacity={0.92}
                    >
                      {bekreftet ? (
                        <LinearGradient
                          colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.primaryCtaGradient, styles.primaryCtaInner]}
                        >
                          <View style={styles.knappInnhold}>
                            {sender ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                            )}
                            <Text style={styles.primaryCtaTekst}>Send tilbud</Text>
                          </View>
                        </LinearGradient>
                      ) : oppdatererPris ? (
                        <View style={[styles.primaryCtaGradient, styles.primaryCtaInner, styles.primaryCtaMuted]}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.primaryCtaTekstMuted}>Oppdaterer...</Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={
                            kanBekrefte
                              ? ['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']
                              : ['rgba(55,60,68,0.95)', 'rgba(35,38,44,0.98)']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.primaryCtaGradient, styles.primaryCtaInner]}
                        >
                          <Text
                            style={kanBekrefte ? styles.primaryCtaTekst : styles.primaryCtaTekstMuted}
                          >
                            Oppdater pris
                          </Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setTimerTekst(String(originalTimer))
                      setMaterialTekst(String(originalMaterialkostnad))
                      setTimeprisTekst(String(firma?.timepris ?? 950))
                      setMatPaslagTekst(String(firma?.materialPaslag ?? 15))
                      nullstillEtterPrisRedigering()
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.resetKnapp}
                    disabled={oppdatererPris}
                  >
                    <Ionicons name="refresh" size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              {erJusteringsTilbud ? (
                <TouchableOpacity
                  onPress={avvisJustering}
                  activeOpacity={0.75}
                  style={styles.avvisJusteringKnapp}
                >
                  <Text style={styles.avvisJusteringTekst}>Avvis justering</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {aktivtTilbud.generertTekst ? (
            <>
              <Text style={styles.dokumentSeksjonLabel}>Til kunden</Text>
              <OfferBodySection>
                <TilbudsForhåndsvisning
                  tekst={visningsTekst}
                  isLoading={erJusteringsTilbud && justeringFase === 'genererer'}
                  tone="dark"
                />
              </OfferBodySection>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function OfferInternalSummaryCard({
  tilbud,
  tjenesteLabel,
  totalInklMva,
  arbeidInklMva,
  materialerInklMva,
  timerLabel,
  totalScale,
  onPhonePress,
  onEmailPress,
  reminderButton,
}: {
  tilbud: Forespørsel
  tjenesteLabel: string
  totalInklMva: number
  arbeidInklMva: number
  materialerInklMva: number
  timerLabel: string
  totalScale: Animated.Value
  onPhonePress: () => void
  onEmailPress: () => void
  reminderButton?: ReactNode
}) {
  const harKundeSeksjon =
    Boolean(tilbud.kundeNavn?.trim()) ||
    Boolean(tilbud.kundeTelefon?.trim()) ||
    Boolean(tilbud.kundeEpost?.trim()) ||
    Boolean(tilbud.adresse?.trim())

  return (
    <View style={styles.metadataCard}>
      <LinearGradient
        colors={['rgba(0,255,150,0.055)', 'rgba(0,255,150,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metadataCardTint}
      />
      <View style={styles.metadataCardInner}>
        <View style={styles.metadataTopRow}>
          <Text style={styles.metadataTjeneste} numberOfLines={2}>
            {tjenesteLabel}
          </Text>
          <View style={styles.metadataTotalCol}>
            <Animated.Text
              style={[
                styles.metadataTotalBeløp,
                { transform: [{ scale: totalScale }] },
              ]}
              numberOfLines={1}
            >
              {totalInklMva === 0 ? 'Avtales' : `kr ${totalInklMva.toLocaleString('nb-NO')}`}
            </Animated.Text>
            <Text style={styles.metadataTotalCaption}>Totalt inkl. mva</Text>
          </View>
        </View>
        {reminderButton ? (
          <View style={styles.summaryPaminnelseRad}>{reminderButton}</View>
        ) : null}
        <View style={styles.metadataHairline} />
        <View style={styles.metadataDetaljRad}>
          <Text style={styles.metadataDetaljLabel}>Arbeid inkl. mva</Text>
          <Text style={styles.metadataDetaljVerdi}>
            kr {arbeidInklMva.toLocaleString('nb-NO')}
          </Text>
        </View>
        <View style={styles.metadataDetaljRad}>
          <Text style={styles.metadataDetaljLabel}>Materialer inkl. mva</Text>
          <Text style={styles.metadataDetaljVerdi}>
            kr {materialerInklMva.toLocaleString('nb-NO')}
          </Text>
        </View>
        <View style={styles.metadataDetaljRad}>
          <Text style={styles.metadataDetaljLabel}>Estimert tid</Text>
          <Text style={styles.metadataDetaljVerdi}>{timerLabel}</Text>
        </View>
        {harKundeSeksjon ? (
          <>
            <View style={styles.metadataInndeling} />
            {tilbud.kundeNavn?.trim() ? (
              <View style={styles.metadataDetaljRad}>
                <Text style={styles.metadataDetaljLabel}>Kunde</Text>
                <Text style={styles.metadataDetaljVerdi} numberOfLines={2}>
                  {tilbud.kundeNavn.trim()}
                </Text>
              </View>
            ) : null}
            {tilbud.kundeTelefon?.trim() ? (
              <TouchableOpacity
                style={styles.metadataDetaljRad}
                onPress={onPhonePress}
                activeOpacity={0.75}
              >
                <Text style={styles.metadataDetaljLabel}>Telefon</Text>
                <Text style={[styles.metadataDetaljVerdi, styles.metadataDetaljVerdiLink]} numberOfLines={1}>
                  {tilbud.kundeTelefon.trim()}
                </Text>
              </TouchableOpacity>
            ) : null}
            {tilbud.kundeEpost?.trim() ? (
              <TouchableOpacity
                style={styles.metadataDetaljRad}
                onPress={onEmailPress}
                activeOpacity={0.75}
              >
                <Text style={styles.metadataDetaljLabel}>E-post</Text>
                <Text style={[styles.metadataDetaljVerdi, styles.metadataDetaljVerdiLink]} numberOfLines={2}>
                  {tilbud.kundeEpost.trim()}
                </Text>
              </TouchableOpacity>
            ) : null}
            {tilbud.adresse?.trim() ? (
              <View style={styles.metadataDetaljRad}>
                <Text style={styles.metadataDetaljLabel}>Prosjekt</Text>
                <Text style={styles.metadataDetaljVerdi} numberOfLines={3}>
                  {tilbud.adresse.trim()}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  )
}

function OfferTimelinePanel({
  events,
  loading,
}: {
  events: TimelineEvent[]
  loading: boolean
}) {
  if (loading) {
    return (
      <View style={styles.timelineSection}>
        <Text style={styles.timelineSectionTittel}>Historikk</Text>
        <OfferTimelineSkeleton count={4} />
      </View>
    )
  }
  if (events.length === 0) return null
  return (
    <View style={styles.timelineSection}>
      <Text style={styles.timelineSectionTittel}>Historikk</Text>
      <OfferTimeline events={events} />
    </View>
  )
}

function OfferStatusHeader({
  currentStatus,
  currentStatusColor,
  onClose,
}: {
  currentStatus: string
  currentStatusColor: string
  onClose: () => void
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSideSpacer} />

      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: currentStatusColor }]}>
          {currentStatus}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        style={styles.lukkKnapp}
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

function OfferTimelineSkeleton({ count = 3 }: { count?: number }) {
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()

    return () => {
      loop.stop()
      opacity.stopAnimation()
    }
  }, [opacity])

  const safeCount = Math.max(1, Math.min(12, Math.floor(count)))

  return (
    <Animated.View style={[styles.timelineSkeletonList, { opacity }]}>
      {Array.from({ length: safeCount }).map((_, index) => {
        const erSiste = index === safeCount - 1

        return (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineSkeletonDot} />
              {!erSiste ? <View style={styles.timelineSkeletonLine} /> : null}
            </View>

            <View style={[styles.timelineContent, erSiste && styles.timelineContentLast]}>
              <View style={styles.timelineTextRow}>
                <View style={styles.timelineSkeletonTitle} />
                <View style={styles.timelineSkeletonConnector} />
                <View style={styles.timelineSkeletonDate} />
              </View>
              <View style={styles.timelineSkeletonDescription} />
            </View>
          </View>
        )
      })}
    </Animated.View>
  )
}

function OfferTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View style={styles.timelineList}>
      {events.map((event, index) => {
        const erSiste = index === events.length - 1

        return (
          <View key={event.key} style={styles.timelineItem}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, { backgroundColor: event.dotColor }]} />
              {!erSiste ? <View style={styles.timelineLine} /> : null}
            </View>

            <View style={[styles.timelineContent, erSiste && styles.timelineContentLast]}>
              <View style={styles.timelineTextRow}>
                <Text style={styles.timelineTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                {event.dateLabel ? (
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.timelineConnector}
                  />
                ) : null}
                {event.dateLabel ? (
                  <Text style={styles.timelineDate}>{event.dateLabel}</Text>
                ) : null}
              </View>
              {event.description ? (
                <Text style={styles.timelineDescription} numberOfLines={2}>
                  {event.description}
                </Text>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function OfferBodySection({ children }: { children: React.ReactNode }) {
  return (
    <>
      <View style={styles.sectionDivider} />
      <View style={styles.tekstBoks}>{children}</View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#000000',
  },
  headerSideSpacer: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  lukkKnapp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  paminnelseTextKnapp: {
    minHeight: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
    paddingVertical: 6,
  },
  paminnelseTextKnappTekst: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.7)',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'DMSans_700Bold',
    color: '#F5F7FA',
    marginBottom: 0,
  },
  timelineList: {
    gap: 0,
  },
  timelineSkeletonList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    width: 14,
    alignItems: 'center',
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#5D6571',
    marginTop: 5,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  timelineSkeletonDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 5,
  },
  timelineSkeletonLine: {
    width: 1,
    flex: 1,
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 10,
  },
  timelineContentLast: {
    paddingBottom: 0,
  },
  timelineTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 18,
  },
  timelineSkeletonTitle: {
    height: 13,
    width: '42%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  timelineSkeletonConnector: {
    flex: 1,
    height: 1,
    minWidth: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timelineSkeletonDate: {
    height: 11,
    width: 58,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  timelineTitle: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_500Medium',
    color: '#EEF2F7',
  },
  timelineConnector: {
    flex: 1,
    height: 1,
    minWidth: 18,
  },
  timelineDate: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#7D8590',
    textAlign: 'right',
    flexShrink: 0,
  },
  timelineDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
  },
  timelineSkeletonDescription: {
    marginTop: 7,
    height: 11,
    width: '68%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 2,
    marginBottom: 12,
  },
  tekstBoks: {
    backgroundColor: '#1A1A1C',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  justeringsKort: {
    backgroundColor: '#17181B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  justeringsKortTittel: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'DMSans_700Bold',
    color: '#6FA4FF',
    marginBottom: 8,
  },
  justeringsKortOppsummering: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'DMSans_700Bold',
    color: '#6FA4FF',
    marginBottom: 8,
  },
  justeringsKortTekst: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'DMSans_400Regular',
    color: '#6FA4FF',
    fontStyle: 'italic',
  },
  paminnelseMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#AEB6C2',
  },
  utfortKort: {
    backgroundColor: '#17181B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  utfortMeta: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'DMSans_400Regular',
    color: '#AEB6C2',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  utfortKnapp: {
    height: 46,
    borderRadius: 999,
    backgroundColor: '#48C774',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  utfortKnappTekst: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'DMSans_700Bold',
    color: '#0B1F14',
  },
  justerPrisKort: {
    backgroundColor: '#17181B',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  justerPrisKortTightBottom: {
    marginBottom: 4,
  },
  justerPrisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  justerPrisOppsummering: {
    fontSize: 14,
    lineHeight: 18,
    color: '#C8D5FF',
  },
  justerPrisOppsummeringLoading: {
    color: 'rgba(200,213,255,0.7)',
  },
  justeringsHeaderSummary: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C8D5FF',
    marginBottom: 10,
  },
  justeringsHeaderSummaryLoading: {
    color: 'rgba(200,213,255,0.7)',
  },
  kundeMeldingBoks: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(111, 164, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(111, 164, 255, 0.22)',
  },
  kundeMeldingTittel: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#C8D5FF',
  },
  kundeMeldingSkille: {
    height: 1,
    backgroundColor: 'rgba(200, 213, 255, 0.18)',
    marginTop: 8,
    marginBottom: 8,
  },
  kundeMeldingTekst: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#E8EEFF',
  },
  prisYtreContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  prisRad: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
    height: 145,
  },
  prisKortKolonne: {
    flex: 1.4,
    flexDirection: 'column',
  },
  pickerKolonne: {
    flex: 0.9,
    flexDirection: 'column',
  },
  prisKolonneTittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: '#C8CDD4',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  prisKort: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    paddingTop: 8,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  prisKortTittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'left',
    marginBottom: 4,
  },
  pickerKort: {
    flex: 1,
    backgroundColor: '#1A1A1C',
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerInner: {
    flex: 1,
  },
  morkPickerWrapper: {
    backgroundColor: '#1A1A1C',
  },
  materialPickerItem: {
    fontSize: 11,
  },
  prisTotalt: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 25,
    color: '#FFFFFF',
    lineHeight: 29,
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 2,
  },
  prisMva: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 8,
  },
  prisKortSkille: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 6,
  },
  prisDetalj: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  prisSubRad: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 8,
  },
  prisSubKolonne: {
    flex: 0.9,
  },
  prisSubVenstre: {
    flex: 1.4,
  },
  prisSubLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
  },
  prisActionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 16,
    marginBottom: 14,
  },
  prisActionRad: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  resetKnapp: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'flex-end',
  },
  bekreftKnapp: {
    flex: 1,
    minWidth: 0,
    height: 50,
    backgroundColor: '#2C2C31',
    borderWidth: 0,
    borderColor: '#2C2C31',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  bekreftKnappInset: {
    flex: 1,
    height: 50,
  },
  sendTilbudKnappAktiv: {
    backgroundColor: '#2C2C31',
    borderColor: '#2C2C31',
  },
  bekreftKnappTekst: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  bekreftKnappDisabled: {
    opacity: 0.45,
  },
  bekreftKnappBekreftet: {
    backgroundColor: '#2C2C31',
    borderColor: '#2C2C31',
  },
  bekreftKnappTekstDisabled: {
    color: '#FFFFFF',
  },
  bekreftKnappTekstBekreftet: {
    color: '#FFFFFF',
  },
  avvisJusteringKnapp: {
    alignSelf: 'center',
    marginTop: -2,
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avvisJusteringTekst: {
    fontSize: 14,
    color: '#AEB6C2',
    fontFamily: 'DMSans_400Regular',
  },
  metadataCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,150,0.15)',
    backgroundColor: '#1C1E24',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  metadataCardTint: {
    ...StyleSheet.absoluteFillObject,
  },
  metadataCardInner: {
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 12,
  },
  metadataTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metadataTjeneste: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#E8ECF2',
    paddingRight: 4,
  },
  metadataTotalCol: {
    alignItems: 'flex-end',
    maxWidth: '48%',
  },
  metadataTotalCaption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
  },
  metadataTotalBeløp: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  summaryPaminnelseRad: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 2,
  },
  metadataHairline: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    marginBottom: 10,
  },
  metadataInndeling: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 10,
    marginBottom: 12,
  },
  metadataDetaljRad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 9,
    gap: 10,
  },
  metadataDetaljLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  metadataDetaljVerdi: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#D1D6DE',
    flex: 1,
    textAlign: 'right',
  },
  metadataDetaljVerdiLink: {
    color: '#9ED8B5',
    textDecorationLine: 'underline',
  },
  timelineSection: {
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  timelineSectionTittel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.38)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dokumentSeksjonLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.42)',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  prisRedigerKort: {
    backgroundColor: '#17181B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  prisRedigerKortTightBottom: {
    marginBottom: 6,
  },
  prisRedigerSeksjonstittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  avansertePriserToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  avansertePriserToggleTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  prisInputRad: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  prisInputCell: {
    flex: 1,
    minWidth: 0,
  },
  prisInputLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  prisInput: {
    height: 46,
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  primaryCtaFullWidth: {
    alignSelf: 'stretch',
  },
  primaryCtaTouch: {
    flex: 1,
    minWidth: 0,
  },
  primaryCtaGradient: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  primaryCtaMuted: {
    backgroundColor: '#2C2F36',
  },
  primaryCtaTekstMuted: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
  knappInnhold: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
})
