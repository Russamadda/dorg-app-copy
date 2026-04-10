import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Pressable,
  Alert,
  InteractionManager,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { ArrowUpRight, Send, User } from 'lucide-react-native'
import { genererTilbud } from '../lib/openai'
import { sendTilbudEpost } from '../lib/resend'
import {
  lagreForespørsel,
  lagreTilbudUtkast,
  oppdaterForespørsel,
  registrerForsteTilbudSendt,
  supabase,
} from '../lib/supabase'
import { getCachedFirma } from '../lib/firmaCache'
import { fjernKortLinje } from '../lib/tekstUtils'
import {
  finaliserTilbudTekstSync,
  formaterOppstartDatoNb,
} from '../lib/tilbudFinalisering'
import { TILBUD_KUNDE_PLASSHOLDER_NAVN } from '../lib/tilbudKundePlassholder'
import { beregnTilbudPrisLinjer } from '../lib/tilbudPris'
import { Picker } from '@react-native-picker/picker'
import { SkeletonLoader } from './SkeletonLoader'
import { KundeKontaktKalender, startOfLocalDay } from './KundeKontaktKalender'
import { TilbudsForhåndsvisning } from './TilbudsForhåndsvisning'
import type { Firma, Forespørsel } from '../types'

const TIMER_VERDIER = [
  0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40,
  48, 56, 64, 80, 100, 120, 160, 200,
]
const MATERIALE_VERDIER = [
  0, 500, 1000, 1500, 2000, 2500, 3000,
  4000, 5000, 6000, 8000, 10000, 15000,
  20000, 25000, 30000, 40000, 50000,
]

/** Nøkler matcher `FAGKATEGORIER[].id` i lib/fagkategorier.ts (lagring: firma.fagkategori). */
const PLACEHOLDERS = {
  snekker:
    'F.eks: Legge parkett i stue og gang (ca 40 kvm), rive gammelt gulv og montere nye lister.',

  maler:
    'F.eks: Male stue og kjøkken, sparkle hull og ujevnheter, to strøk på vegger og tak.',

  elektriker:
    'F.eks: Legge opp nye stikkontakter i stue, bytte downlights og oppgradere sikringsskap.',

  rorlegger:
    'F.eks: Bytte kjøkkenkran, koble opp oppvaskmaskin og legge nye vannrør under vask.',

  entreprenor:
    'F.eks: Grave ut til garasje, klargjøre tomt og støpe såle.',
} as const

const DEFAULT_PLACEHOLDER =
  'F.eks: Beskriv jobben så konkret som mulig, inkludert omfang og arbeid som skal utføres.'

type PlaceholderBedriftstype = keyof typeof PLACEHOLDERS

function normaliserTilPlaceholderNøkkel(fagkategori: string): PlaceholderBedriftstype | null {
  const k = fagkategori.trim().toLowerCase()
  if (k === 'rørlegger') return 'rorlegger'
  if (k === 'entreprenør') return 'entreprenor'
  if (k in PLACEHOLDERS) return k as PlaceholderBedriftstype
  return null
}

function resolveJobbBeskrivelsePlaceholder(fagkategori: string | null | undefined): string {
  const raw = fagkategori?.trim()
  if (!raw) return DEFAULT_PLACEHOLDER
  const key = normaliserTilPlaceholderNøkkel(raw)
  return key ? PLACEHOLDERS[key] : DEFAULT_PLACEHOLDER
}

function formatTimer(v: number): string {
  return `${v.toLocaleString('nb-NO')} t`
}

/** Estimert tid i oversiktskort (forhåndsvisning), ikke i hjulvelger. */
function formatTimerOversikt(v: number): string {
  if (v === 1) return '1 time'
  return `${v.toLocaleString('nb-NO')} timer`
}

interface Props {
  visible: boolean
  onClose: () => void
  firma: Firma | null
  onSendt: (kundeNavn: string) => void
  valgtTjeneste: string
  onRequestVelgTjeneste: () => void
  /** Rad å gjenåpne (status utkast); konsumeres etter hydrering. */
  utkastKilde?: Forespørsel | null
  onConsumedUtkastKilde?: () => void
}

function rensMarkdown(tekst: string) {
  return tekst
    .replace(/^#{1,6}\s/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
}

function erGyldigEpost(epost: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost.trim())
}

function MetadataDetaljRad({
  label,
  verdi,
  truncate,
}: {
  label: string
  verdi: string
  truncate?: boolean
}) {
  return (
    <View style={styles.metadataDetaljRad}>
      <Text style={styles.metadataDetaljLabel}>{label}</Text>
      <Text style={styles.metadataDetaljVerdi} numberOfLines={truncate ? 1 : undefined}>
        {verdi}
      </Text>
    </View>
  )
}

function PreviewKortHeader({
  action,
}: {
  action?: ReactNode
}) {
  return (
    <View style={styles.previewCardHeader}>
      <Text style={styles.previewCardHeaderCaption}>Til kunden</Text>
      <View style={styles.previewCardHeaderActionSlot}>
        {action ?? <View style={styles.previewCardHeaderActionSpacer} />}
      </View>
    </View>
  )
}

export default function NyttTilbudModal({
  visible,
  onClose,
  firma,
  onSendt,
  valgtTjeneste,
  onRequestVelgTjeneste,
  utkastKilde = null,
  onConsumedUtkastKilde,
}: Props) {
  const insets = useSafeAreaInsets()
  const genererKnappScale = useRef(new Animated.Value(1)).current
  const sendKnappScale = useRef(new Animated.Value(1)).current
  const metadataEnter = useRef(new Animated.Value(1)).current
  const previewEnter = useRef(new Animated.Value(1)).current
  const previewSlide = useRef(new Animated.Value(0)).current
  const previewAnimatedOnce = useRef(false)
  const livePingScale = useRef(new Animated.Value(0.7)).current
  const livePingOpacity = useRef(new Animated.Value(0.55)).current
  const prisPopScale = useRef(new Animated.Value(1)).current
  const prisGlowAnim = useRef(new Animated.Value(0)).current
  const prevTotalRef = useRef<number | null>(null)
  const firmaFraCache = getCachedFirma()
  const firmaGrunnlag = firmaFraCache ?? firma

  const jobbBeskrivelsePlaceholder = useMemo(
    () => resolveJobbBeskrivelsePlaceholder(firmaGrunnlag?.fagkategori),
    [firmaGrunnlag?.fagkategori],
  )

  const [kundeNavn, setKundeNavn] = useState('')
  const [kundeTelefon, setKundeTelefon] = useState('')
  const [kundeEpost, setKundeEpost] = useState('')
  const [prosjektAdresse, setProsjektAdresse] = useState('')
  const [oppstartDato, setOppstartDato] = useState<Date | null>(null)
  const [jobbBeskrivelse, setJobbBeskrivelse] = useState('')
  const [timer, setTimer] = useState(4)
  const [materiale, setMateriale] = useState(2000)

  const [fokusertFelt, setFokusertFelt] = useState<string | null>(null)
  const [skalFokusereBeskrivelseVedRetur, setSkalFokusereBeskrivelseVedRetur] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generertTekst, setGenerertTekst] = useState('')
  const [råGenerertTekst, setRåGenerertTekst] = useState('')
  const [erGenerert, setErGenerert] = useState(false)

  const [redigerModus, setRedigerModus] = useState(false)
  const [redigerbarTekst, setRedigerbarTekst] = useState('')

  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState<{
    jobbBeskrivelse?: string
  }>({})
  const [generellFeil, setGenerellFeil] = useState('')

  const scrollRef = useRef<ScrollView>(null)
  const kundenavnRef = useRef<TextInput>(null)
  const telefonRef = useRef<TextInput>(null)
  const epostRef = useRef<TextInput>(null)
  const prosjektRef = useRef<TextInput>(null)
  const beskrivelseRef = useRef<TextInput>(null)

  const [visKundeSkjema, setVisKundeSkjema] = useState(false)

  const utkastRadIdRef = useRef<string | null>(null)
  const utkastVersjonRef = useRef(1)
  const utkastHydrertForIdRef = useRef<string | null>(null)
  const lukkingPågårRef = useRef(false)

  const [timeprisTekst, setTimeprisTekst] = useState('')
  const [matPaslagTekst, setMatPaslagTekst] = useState('')

  function reset() {
    setKundeNavn('')
    setKundeTelefon('')
    setKundeEpost('')
    setProsjektAdresse('')
    setOppstartDato(null)
    setJobbBeskrivelse('')
    setTimer(4)
    setMateriale(2000)

    setFokusertFelt(null)
    setSkalFokusereBeskrivelseVedRetur(false)

    setIsGenerating(false)
    setGenerertTekst('')
    setRåGenerertTekst('')
    setErGenerert(false)

    setRedigerModus(false)
    setRedigerbarTekst('')

    setSender(false)
    setFeil({})
    setGenerellFeil('')

    setVisKundeSkjema(false)
    utkastRadIdRef.current = null
    utkastVersjonRef.current = 1
    utkastHydrertForIdRef.current = null
  }

  function utførLukkUtenLagring() {
    reset()
    onClose()
  }

  function forespørLukkMedUtkastValg() {
    if (!visible || lukkingPågårRef.current) return
    if (visKundeSkjema) {
      Keyboard.dismiss()
      setVisKundeSkjema(false)
      return
    }
    if (sender || isGenerating) return

    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    Alert.alert(
      'Lagre utkast?',
      undefined,
      [
        {
          text: 'Nei',
          style: 'destructive',
          onPress: () => utførLukkUtenLagring(),
        },
        {
          text: 'Ja',
          onPress: () => {
            void (async () => {
              if (lukkingPågårRef.current) return
              lukkingPågårRef.current = true
              try {
                if (!firmaGrunnlag?.id) {
                  utførLukkUtenLagring()
                  return
                }
                const tekstForLagring =
                  erGenerert ? (råGenerertTekst.trim() || generertTekst.trim() || null) : null
                await lagreTilbudUtkast({
                  id: utkastRadIdRef.current ?? undefined,
                  firmaId: firmaGrunnlag.id,
                  jobbType: valgtTjeneste,
                  jobbBeskrivelse: byggJobbBeskrivelse(),
                  timer,
                  materialkostnad: materiale,
                  prisEksMva: estimertPrisEksMva,
                  generertTekst: tekstForLagring,
                  draftStage: erGenerert ? 'preview' : 'builder',
                })
                InteractionManager.runAfterInteractions(() => {
                  utførLukkUtenLagring()
                })
              } catch (e) {
                console.error('[NyttTilbudModal] lagre utkast:', e)
                Alert.alert('Kunne ikke lagre', 'Prøv igjen.')
              } finally {
                lukkingPågårRef.current = false
              }
            })()
          },
        },
      ],
      { cancelable: true }
    )
  }

  useEffect(() => {
    if (!visible) {
      utkastHydrertForIdRef.current = null
      return
    }
    if (!utkastKilde) return
    if (utkastHydrertForIdRef.current === utkastKilde.id) return
    utkastHydrertForIdRef.current = utkastKilde.id
    utkastRadIdRef.current = utkastKilde.id
    utkastVersjonRef.current = utkastKilde.versjon ?? 1

    const full = utkastKilde.jobbBeskrivelse ?? ''
    const prefix = `[${valgtTjeneste}] `
    const utenPrefiks = full.startsWith(prefix)
      ? full.slice(prefix.length)
      : full.replace(/^\[[^\]]+\]\s*/, '')
    setJobbBeskrivelse(utenPrefiks)

    setTimer(utkastKilde.timer ?? 4)
    setMateriale(utkastKilde.materialkostnad ?? 0)

    if (utkastKilde.draftStage === 'preview' && (utkastKilde.generertTekst?.trim() ?? '')) {
      const g = utkastKilde.generertTekst!.trim()
      setGenerertTekst(g)
      setRåGenerertTekst(g)
      setErGenerert(true)
      setRedigerModus(false)
      setIsGenerating(false)
    } else {
      setGenerertTekst('')
      setRåGenerertTekst('')
      setErGenerert(false)
      setRedigerModus(false)
      setIsGenerating(false)
    }

    setKundeNavn('')
    setKundeTelefon('')
    setKundeEpost('')
    setProsjektAdresse('')
    setOppstartDato(null)
    setFeil({})
    setGenerellFeil('')

    onConsumedUtkastKilde?.()
  }, [visible, utkastKilde, valgtTjeneste, onConsumedUtkastKilde])

  function byggJobbBeskrivelse() {
    return `[${valgtTjeneste}] ${jobbBeskrivelse}`
  }

  useEffect(() => {
    if (!visKundeSkjema) return
    const t = setTimeout(() => kundenavnRef.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [visKundeSkjema])

  useEffect(() => {
    if (!visible || erGenerert) return
    setTimeprisTekst(String(firmaGrunnlag?.timepris ?? 950))
    setMatPaslagTekst(String(firmaGrunnlag?.materialPaslag ?? 15))
  }, [visible, erGenerert, firmaGrunnlag?.timepris, firmaGrunnlag?.materialPaslag])

  function valider(): boolean {
    const nyeFeil: typeof feil = {}

    if (jobbBeskrivelse.trim().length < 10) nyeFeil.jobbBeskrivelse = 'Beskriv jobben med minst 10 tegn'
    if (timer === 0 && materiale === 0) {
      nyeFeil.jobbBeskrivelse = nyeFeil.jobbBeskrivelse ?? 'Sett timer eller materialer (kan ikke være 0)'
    }

    setFeil(nyeFeil)
    return Object.keys(nyeFeil).length === 0
  }

  function aktiverRedigering() {
    setRedigerbarTekst(rensMarkdown(byggForhåndsvisningTekst()))
    setRedigerModus(true)
  }

  function byggForhåndsvisningTekst(): string {
    if (!generertTekst) return ''
    if (!kundeNavn.trim()) return generertTekst
    return finaliserTilbudTekstSync({
      tilbudTekst: generertTekst,
      kundeNavn: kundeNavn.trim(),
      prosjektAdresse,
      foreslattOppstartTekst: oppstartDato ? formaterOppstartDatoNb(oppstartDato) : undefined,
    })
  }

  function lagreRedigering() {
    setGenerertTekst(redigerbarTekst)
    setRåGenerertTekst(redigerbarTekst)
    setRedigerModus(false)
  }

  function tilbakeTilSkjemaFraBeskrivelse() {
    setErGenerert(false)
    setRedigerModus(false)
    setSkalFokusereBeskrivelseVedRetur(true)
    Keyboard.dismiss()

    requestAnimationFrame(() => {
      setTimeout(() => {
        beskrivelseRef.current?.focus()
      }, 150)
    })
  }

  function håndterFormVisning() {
    if (skalFokusereBeskrivelseVedRetur) {
      setTimeout(() => {
        beskrivelseRef.current?.focus()
        setSkalFokusereBeskrivelseVedRetur(false)
      }, 150)
      return
    }

    setTimeout(() => {
      beskrivelseRef.current?.focus()
    }, 100)
  }

  const parsedTimepris = Number(timeprisTekst.replace(/\s/g, '').replace(',', '.'))
  const timepris =
    Number.isFinite(parsedTimepris) && parsedTimepris > 0
      ? Math.round(parsedTimepris)
      : firmaGrunnlag?.timepris ?? 950

  const parsedMatPaslag = Number(matPaslagTekst.replace(/\s/g, '').replace(',', '.'))
  const matPaslag = Number.isFinite(parsedMatPaslag)
    ? Math.min(100, Math.max(0, parsedMatPaslag))
    : firmaGrunnlag?.materialPaslag ?? 15
  const prisLinjer = beregnTilbudPrisLinjer({
    timer,
    materialkostnad: materiale,
    timepris,
    materialPaslag: matPaslag,
  })
  const estimertPrisEksMva = prisLinjer.totalEksMva
  const totalInklMva = prisLinjer.totalInklMva
  const arbeidInklMva = prisLinjer.arbeidInklMva
  const materialInklMva = prisLinjer.materialerInklMva

  useEffect(() => {
    if (prevTotalRef.current === null) {
      prevTotalRef.current = totalInklMva
      return
    }
    if (prevTotalRef.current === totalInklMva) return
    prevTotalRef.current = totalInklMva

    prisPopScale.setValue(1)
    Animated.sequence([
      Animated.timing(prisPopScale, {
        toValue: 1.035,
        duration: 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(prisPopScale, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start()

    prisGlowAnim.setValue(1)
    Animated.timing(prisGlowAnim, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start()
  }, [totalInklMva])

  const prisCardShadowOpacity = prisGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.45],
  })

  useLayoutEffect(() => {
    if (!erGenerert) {
      previewAnimatedOnce.current = false
      metadataEnter.setValue(1)
      previewEnter.setValue(1)
      previewSlide.setValue(0)
      return
    }
    if (previewAnimatedOnce.current) return
    metadataEnter.setValue(0)
    previewEnter.setValue(0)
    previewSlide.setValue(14)
  }, [erGenerert])

  useEffect(() => {
    if (!erGenerert) return
    if (previewAnimatedOnce.current) return
    previewAnimatedOnce.current = true
    Animated.parallel([
      Animated.timing(metadataEnter, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(45),
        Animated.parallel([
          Animated.timing(previewEnter, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(previewSlide, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start()
  }, [erGenerert])

  useEffect(() => {
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePingScale, {
          toValue: 1.9,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(livePingScale, {
          toValue: 0.7,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    const opacityLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePingOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(livePingOpacity, {
          toValue: 0.55,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )

    scaleLoop.start()
    opacityLoop.start()

    return () => {
      scaleLoop.stop()
      opacityLoop.stop()
    }
  }, [livePingOpacity, livePingScale])

  function animerGenererKnapp(tilVerdi: 0 | 1) {
    Animated.timing(genererKnappScale, {
      toValue: tilVerdi === 1 ? 0.98 : 1,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }

  function animerSendKnapp(tilVerdi: 0 | 1) {
    Animated.timing(sendKnappScale, {
      toValue: tilVerdi === 1 ? 0.98 : 1,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }

  async function generer() {
    if (!valider()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true })
      return
    }

    Keyboard.dismiss()
    setGenerellFeil('')
    setIsGenerating(true)
    setErGenerert(true)

    try {
      const tekst = await genererTilbud({
        kundeNavn: kundeNavn.trim() || TILBUD_KUNDE_PLASSHOLDER_NAVN,
        jobbBeskrivelse: byggJobbBeskrivelse(),
        prisEksMva: estimertPrisEksMva,
        firmanavn: firmaGrunnlag?.firmanavn ?? '',
        adresse: firmaGrunnlag?.adresse ?? '',
        telefon: firmaGrunnlag?.telefon ?? '',
        epost: firmaGrunnlag?.epost ?? '',
        tjeneste: valgtTjeneste,
        fagkategori: firmaGrunnlag?.fagkategori ?? undefined,
        timer,
        materialkostnad: materiale,
        timepris,
        materialpaslagProsent: matPaslag,
        dagensdato: new Date().toLocaleDateString('nb-NO'),
        behandleSomUtkastUtenTekstanalyse: true,
      })
      setRåGenerertTekst(tekst)
      setGenerertTekst(fjernKortLinje(tekst))
    } catch {
      setGenerellFeil('Feil ved generering. Prøv igjen.')
      setErGenerert(false)
    } finally {
      setIsGenerating(false)
    }
  }

  async function sendTilKunde() {
    if (!generertTekst || !firmaGrunnlag) return

    if (!kundeNavn.trim()) {
      setGenerellFeil('Fyll inn kundenavn')
      return
    }

    if (!kundeEpost.trim()) {
      setGenerellFeil('Fyll inn kunde e-post')
      return
    }

    if (!erGyldigEpost(kundeEpost)) {
      setGenerellFeil('Skriv inn en gyldig e-postadresse')
      return
    }

    if (!prosjektAdresse.trim()) {
      setGenerellFeil('Fyll inn prosjektadresse eller område')
      return
    }

    setSender(true)
    setGenerellFeil('')

    try {
      const sendtDato = new Date().toISOString()
      const kildetekst = råGenerertTekst || generertTekst
      const tekstUtenKortlinje = fjernKortLinje(kildetekst)
      const ferdigTekst = finaliserTilbudTekstSync({
        tilbudTekst: tekstUtenKortlinje,
        kundeNavn: kundeNavn.trim(),
        prosjektAdresse: prosjektAdresse.trim(),
        foreslattOppstartTekst: oppstartDato ? formaterOppstartDatoNb(oppstartDato) : undefined,
      })
      const eksisterendeUtkastId = utkastRadIdRef.current
      let tilbudId: string
      let firmaIdSend: string
      let versjonSend: number

      if (eksisterendeUtkastId) {
        await oppdaterForespørsel(eksisterendeUtkastId, {
          kundeNavn: kundeNavn.trim(),
          kundeTelefon: kundeTelefon.trim() || undefined,
          kundeEpost: kundeEpost.trim(),
          jobbBeskrivelse,
          kortBeskrivelse: valgtTjeneste,
          prisEksMva: estimertPrisEksMva,
          timer,
          materialkostnad: materiale,
          status: 'sendt',
          generertTekst: ferdigTekst,
          jobbType: valgtTjeneste,
          adresse: prosjektAdresse.trim(),
          draftStage: null,
        })
        tilbudId = eksisterendeUtkastId
        firmaIdSend = firmaGrunnlag.id
        const { data: vRad, error: vErr } = await supabase
          .from('tilbud')
          .select('versjon')
          .eq('id', tilbudId)
          .single()
        if (vErr) throw vErr
        versjonSend = (vRad as { versjon: number | null })?.versjon ?? utkastVersjonRef.current
      } else {
        const lagret = await lagreForespørsel({
          kundeNavn: kundeNavn.trim(),
          kundeTelefon: kundeTelefon.trim() || undefined,
          kundeEpost: kundeEpost.trim(),
          jobbBeskrivelse,
          prisEksMva: estimertPrisEksMva,
          timer,
          materialkostnad: materiale,
          status: 'sendt',
          generertTekst: ferdigTekst,
          firmaId: firmaGrunnlag.id,
          jobbType: valgtTjeneste,
          kortBeskrivelse: valgtTjeneste,
          adresse: prosjektAdresse.trim(),
        })
        tilbudId = lagret.id
        firmaIdSend = lagret.firmaId
        versjonSend = lagret.versjon ?? 1
      }

      await sendTilbudEpost({
        tilEpost: kundeEpost.trim(),
        kundeNavn: kundeNavn.trim(),
        firmanavn: firmaGrunnlag.firmanavn,
        generertTekst: ferdigTekst,
        prisEksMva: estimertPrisEksMva,
        tilbudId,
      })

      await registrerForsteTilbudSendt({
        tilbudId,
        firmaId: firmaIdSend,
        opprettetDato: sendtDato,
        versjon: versjonSend,
      })

      onSendt(kundeNavn.trim())
      utførLukkUtenLagring()
    } catch (e) {
      console.error('Feil ved sending:', e)
      setGenerellFeil('Kunne ikke sende tilbud. Prøv igjen.')
    } finally {
      setSender(false)
    }
  }

  const isLoadingState = erGenerert && isGenerating
  const isGeneratedState = erGenerert && !isGenerating
  const contentBottomPadding = Math.max(insets.bottom, 12)
  const footerBottomPadding = 16
  /**
   * Forhåndsvisning: tettere mot bunn enn full safe area (gulv på min. 3 px).
   */
  const previewFooterDockBottom = Math.max(3, insets.bottom - 14)
  /**
   * Ferdig forhåndsvisning (Send / Legg til kundeinfo): samme svarte panelhøyde som lasting,
   * men CTA + microcopy flyttet ned (+8 pt luft over, −8 pt under = netto 0).
   */
  const previewFooterDockBottomGenerated = Math.max(3, insets.bottom - 22)
  /** Må dekke fast footer (prisestimat + Generer) slik at skjema/hint ikke dekkes. */
  const formFooterClearance = 352

  const kanSende =
    !sender &&
    !!generertTekst &&
    !!kundeNavn.trim() &&
    !!kundeEpost.trim() &&
    erGyldigEpost(kundeEpost) &&
    !!prosjektAdresse.trim()

  function åpneKundeSkjema() {
    setGenerellFeil('')
    setOppstartDato(prev =>
      prev === null ? startOfLocalDay(new Date()) : startOfLocalDay(prev)
    )
    setVisKundeSkjema(true)
  }

  const kundeSkjemaKanFerdigstilles =
    !!kundeNavn.trim() &&
    !!kundeTelefon.trim() &&
    !!kundeEpost.trim() &&
    erGyldigEpost(kundeEpost)

  const tilbudMetadataKort = (
    <Animated.View style={{ opacity: metadataEnter }}>
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
              {valgtTjeneste}
            </Text>
            <View style={styles.metadataTotalCol}>
              <Text style={styles.metadataTotalBeløp} numberOfLines={1}>
                {totalInklMva === 0
                  ? 'Avtales'
                  : `kr ${totalInklMva.toLocaleString('nb-NO')}`}
              </Text>
              <Text style={styles.metadataTotalCaption}>Totalt inkl. mva</Text>
            </View>
          </View>
          <View style={styles.metadataHairline} />
          <MetadataDetaljRad
            label="Arbeid inkl. mva"
            verdi={
              totalInklMva === 0
                ? 'Avtales'
                : `kr ${arbeidInklMva.toLocaleString('nb-NO')}`
            }
          />
          <MetadataDetaljRad
            label="Materialer inkl. mva"
            verdi={
              totalInklMva === 0
                ? 'Avtales'
                : `kr ${materialInklMva.toLocaleString('nb-NO')}`
            }
          />
          {timer > 0 ? (
            <MetadataDetaljRad
              label="Estimert tid"
              verdi={formatTimerOversikt(timer)}
            />
          ) : null}
          {kundeNavn.trim() ||
          kundeTelefon.trim() ||
          prosjektAdresse.trim() ||
          oppstartDato ? (
            <>
              <View style={styles.metadataInndeling} />
              {kundeNavn.trim() ? (
                <MetadataDetaljRad label="Kunde" verdi={kundeNavn.trim()} />
              ) : null}
              {kundeTelefon.trim() ? (
                <MetadataDetaljRad label="Telefon" verdi={kundeTelefon.trim()} />
              ) : null}
              {prosjektAdresse.trim() ? (
                <MetadataDetaljRad
                  label="Prosjekt"
                  verdi={prosjektAdresse.trim()}
                  truncate
                />
              ) : null}
              {oppstartDato ? (
                <MetadataDetaljRad
                  label="Oppstart"
                  verdi={formaterOppstartDatoNb(oppstartDato)}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Animated.View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={false}
      onRequestClose={forespørLukkMedUtkastValg}
      onShow={() => {
        if (!erGenerert) {
          håndterFormVisning()
        }
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerTitleAbsoluteWrap} pointerEvents="box-none">
              {erGenerert ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.headerTjenesteRadKompakt,
                    pressed && styles.headerTjenesteRadPressed,
                  ]}
                  onPress={onRequestVelgTjeneste}
                  accessibilityRole="button"
                  accessibilityLabel="Bytt tjeneste"
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                >
                  <View style={styles.headerUtkastRad}>
                    <Text
                      style={styles.headerTjenesteTekst}
                      numberOfLines={1}
                    >
                      Utkast
                    </Text>
                    {(isLoadingState || isGeneratedState) ? (
                      <View style={styles.livePingWrap}>
                        <Animated.View
                          style={[
                            styles.livePingRing,
                            {
                              opacity: livePingOpacity,
                              transform: [{ scale: livePingScale }],
                            },
                          ]}
                        />
                        <View style={styles.livePingDot} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.headerTjenesteRadKompakt,
                    pressed && styles.headerTjenesteRadPressed,
                  ]}
                  onPress={onRequestVelgTjeneste}
                  accessibilityRole="button"
                  accessibilityLabel="Bytt tjeneste"
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                >
                  <Text
                    style={styles.headerTjenesteTekst}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.62}
                  >
                    {valgtTjeneste}
                  </Text>
                </Pressable>
              )}
            </View>
            {!erGenerert ? (
              <View style={styles.headerLeftCluster} pointerEvents="box-none">
                <Pressable
                  style={({ pressed }) => [
                    styles.headerEditKnapp,
                    pressed && styles.headerEditKnappPressed,
                  ]}
                  onPress={onRequestVelgTjeneste}
                  accessibilityRole="button"
                  accessibilityLabel="Bytt tjeneste"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="rgba(255,255,255,0.7)"
                  />
                </Pressable>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={forespørLukkMedUtkastValg}
              activeOpacity={0.7}
              style={styles.lukkKnapp}
            >
              <Ionicons
                name="close"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.flex}>
            {!erGenerert && (
              <View style={styles.screen}>
                <ScrollView
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.content,
                    styles.formContent,
                    { paddingBottom: formFooterClearance + contentBottomPadding },
                  ]}
                >
                  <View style={styles.formBody}>
                    <Text style={styles.beskrivelseHelper}>
                      Beskriv jobben så konkret som mulig for et mer presist tilbud
                    </Text>
                    <TextInput
                      ref={beskrivelseRef}
                      style={[
                        styles.heroBeskrivelse,
                        fokusertFelt === 'beskrivelse' && styles.heroBeskrivelseFocused,
                        feil.jobbBeskrivelse && styles.inputFeil,
                      ]}
                      placeholder={jobbBeskrivelsePlaceholder}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={jobbBeskrivelse}
                      onChangeText={(v) => {
                        setJobbBeskrivelse(v)
                        if (feil.jobbBeskrivelse) {
                          setFeil(f => ({ ...f, jobbBeskrivelse: undefined }))
                        }
                      }}
                      multiline
                      scrollEnabled
                      textAlignVertical="top"
                      {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={() => Keyboard.dismiss()}
                      onFocus={() => setFokusertFelt('beskrivelse')}
                      onBlur={() => setFokusertFelt(null)}
                    />

                    <View style={styles.prisYtreContainer}>
                      <View style={styles.pickerSection}>
                        <View style={styles.pickerLabelRow}>
                          <Text style={styles.pickerLabel}>Timer</Text>
                          <Text style={styles.pickerLabel}>Materialer</Text>
                        </View>
                        <View style={styles.pickerWheelRow}>
                          <View style={styles.pickerColumnWrap}>
                            <View style={styles.pickerWheelCol}>
                              <Picker
                                selectedValue={timer}
                                onValueChange={(v) => {
                                  setTimer(Number(v))
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                }}
                                style={styles.nativePicker}
                                itemStyle={styles.nativePickerItem}
                              >
                                {TIMER_VERDIER.map((v) => (
                                  <Picker.Item
                                    key={String(v)}
                                    label={formatTimer(v)}
                                    value={v}
                                    color="#FFFFFF"
                                  />
                                ))}
                              </Picker>
                            </View>
                            <Text style={styles.pickerHint}>
                              Velg estimert arbeidstid for prisestimatet.
                            </Text>
                          </View>
                          <View style={styles.pickerColumnWrap}>
                            <View style={styles.pickerWheelCol}>
                              <Picker
                                selectedValue={materiale}
                                onValueChange={(v) => {
                                  setMateriale(Number(v))
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                }}
                                style={styles.nativePicker}
                                itemStyle={styles.nativePickerItem}
                              >
                                {MATERIALE_VERDIER.map((v) => (
                                  <Picker.Item
                                    key={String(v)}
                                    label={v === 0 ? '0 kr' : `${v.toLocaleString('nb-NO')} kr`}
                                    value={v}
                                    color="#F5F7FA"
                                  />
                                ))}
                              </Picker>
                            </View>
                            <Text style={styles.pickerHint}>
                              Velg estimert materialkost før mva som grunnlag.
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.fixedFooter,
                    styles.bottomDock,
                    { paddingBottom: footerBottomPadding + insets.bottom },
                  ]}
                >
                  <View style={styles.prisFooterSkilleWrap} pointerEvents="none">
                    <LinearGradient
                      colors={[
                        'rgba(74,222,128,0)',
                        'rgba(74,222,128,0.04)',
                        'rgba(74,222,128,0.18)',
                        'rgba(74,222,128,0.38)',
                        'rgba(74,222,128,0.18)',
                        'rgba(74,222,128,0.04)',
                        'rgba(74,222,128,0)',
                      ]}
                      locations={[0, 0.18, 0.38, 0.5, 0.62, 0.82, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.prisFooterSkilleGradient}
                    />
                  </View>
                  <Animated.View
                    style={[
                      styles.prisKortKompakt,
                      { transform: [{ scale: prisPopScale }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['rgba(16,46,32,0.94)', 'rgba(6,18,12,0.98)']}
                      start={{ x: 0.15, y: 1 }}
                      end={{ x: 0.92, y: 0.08 }}
                      style={styles.prisKortKompaktGradient}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.prisKortGlow,
                        { shadowOpacity: prisCardShadowOpacity },
                      ]}
                    />
                    <View style={styles.prisKortKompaktInnhold}>
                      <View style={styles.prisKompaktHeader}>
                        <View style={styles.prisKompaktHeaderMeta}>
                          <Text style={styles.prisKompaktLabel}>Prisestimat</Text>
                          <Text style={styles.prisKompaktUnder}>Totalt inkl. mva</Text>
                        </View>
                        <Text
                          style={styles.prisKompaktBeløp}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                        >
                          {totalInklMva === 0 ? 'Avtales' : `kr ${totalInklMva.toLocaleString('nb-NO')}`}
                        </Text>
                      </View>
                      <View style={styles.prisKompaktDetaljer}>
                        <View style={styles.prisKompaktRad}>
                          <View style={styles.prisKompaktRadVenstre}>
                            <Text
                              style={styles.prisKompaktRadLabel}
                              numberOfLines={1}
                            >
                              Arbeid inkl. mva
                            </Text>
                            <Text
                              style={styles.prisKompaktRadMeta}
                              numberOfLines={1}
                            >
                              ({timepris} kr/t)
                            </Text>
                          </View>
                          <Text
                            style={styles.prisKompaktRadVerdi}
                            numberOfLines={1}
                          >
                            kr {arbeidInklMva.toLocaleString('nb-NO')}
                          </Text>
                        </View>
                        <View style={styles.prisKompaktRad}>
                          <View style={styles.prisKompaktRadVenstre}>
                            <Text
                              style={styles.prisKompaktRadLabel}
                              numberOfLines={1}
                            >
                              Materialer inkl. mva
                            </Text>
                            <Text
                              style={styles.prisKompaktRadMeta}
                              numberOfLines={1}
                            >
                              (+{Math.round(matPaslag)}%)
                            </Text>
                          </View>
                          <Text
                            style={styles.prisKompaktRadVerdi}
                            numberOfLines={1}
                          >
                            kr {materialInklMva.toLocaleString('nb-NO')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                  <View style={[styles.footerActionArea, styles.footerEtterPrisestimat]}>
                    <Animated.View
                      style={[
                        styles.genererKnappTouch,
                        { transform: [{ scale: genererKnappScale }] },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={generer}
                        disabled={isGenerating}
                        activeOpacity={0.92}
                        onPressIn={() => animerGenererKnapp(1)}
                        onPressOut={() => animerGenererKnapp(0)}
                      >
                        {isGenerating ? (
                          <View style={[styles.sendKnappPrimary, styles.sendKnappLoading]}>
                            <View style={styles.ctaLeadSpacer} />
                            <View style={styles.ctaLabelWrap}>
                              <Text style={styles.sendTekstPrimary}>Genererer...</Text>
                            </View>
                            <View style={styles.sendIkonPrimærWrap}>
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            </View>
                          </View>
                        ) : (
                          <LinearGradient
                            colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.sendKnappPrimary}
                          >
                            <View style={styles.ctaLeadSpacer} />
                            <View style={styles.ctaLabelWrap}>
                              <Text style={styles.sendTekstPrimary}>Generer tilbud</Text>
                            </View>
                            <View style={styles.sendIkonPrimærWrap}>
                              <ArrowUpRight
                                size={20}
                                color="#FFFFFF"
                                strokeWidth={2.2}
                              />
                            </View>
                          </LinearGradient>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>
              </View>
            )}

            {isLoadingState && (
              <View style={styles.screen}>
                <ScrollView
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                  contentContainerStyle={[
                    styles.generatedContent,
                    { paddingBottom: 96 + contentBottomPadding },
                  ]}
                >
                  <View style={styles.generatedMain}>
                    {tilbudMetadataKort}

                    <Animated.View
                      style={{
                        opacity: previewEnter,
                        transform: [{ translateY: previewSlide }],
                      }}
                    >
                      <View style={styles.previewCard}>
                        <PreviewKortHeader />
                        <View style={styles.previewCardBodyLoading}>
                          <SkeletonLoader style={styles.loadingSkeleton} />
                        </View>
                      </View>
                    </Animated.View>
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.fixedFooter,
                    styles.fixedFooterPreview,
                    styles.bottomDock,
                    { paddingBottom: previewFooterDockBottom },
                  ]}
                >
                  <View style={[styles.footerActionArea, styles.footerActionAreaPreview]}>
                    <TouchableOpacity
                      style={styles.sendKnappTouch}
                      disabled
                      activeOpacity={1}
                    >
                      <View style={[styles.sendKnapp, styles.sendKnappVente]}>
                        <View style={styles.ctaLeadSpacer} />
                        <View style={styles.ctaLabelWrap}>
                          <Text style={[styles.sendTekst, styles.sendTekstVente]}>
                            Send tilbud
                          </Text>
                        </View>
                        <View style={styles.sendIkonWrap}>
                          <Send
                            size={18}
                            color="#6B7280"
                            strokeWidth={2.2}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                    {generellFeil ? <Text style={styles.footerFeilTekst}>{generellFeil}</Text> : null}
                  </View>
                </View>
              </View>
            )}

            {isGeneratedState && (
              <View style={styles.screen}>
                <ScrollView
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.generatedContent,
                    styles.generatedContentCompact,
                    { paddingBottom: 80 + contentBottomPadding },
                  ]}
                >
                  <View style={styles.generatedMainCompact}>
                    {tilbudMetadataKort}

                    <Animated.View
                      style={{
                        opacity: previewEnter,
                        transform: [{ translateY: previewSlide }],
                      }}
                    >
                      <View style={styles.previewCard}>
                        {redigerModus ? (
                          <>
                            <PreviewKortHeader
                              action={(
                                <TouchableOpacity
                                  onPress={lagreRedigering}
                                  activeOpacity={0.7}
                                  style={styles.previewHeaderTextAction}
                                >
                                  <Text style={styles.previewHeaderActionText}>Ferdig</Text>
                                </TouchableOpacity>
                              )}
                            />
                            <View style={styles.previewCardBody}>
                              <TextInput
                                style={styles.redigerInput}
                                value={redigerbarTekst}
                                onChangeText={setRedigerbarTekst}
                                multiline
                                textAlignVertical="top"
                                scrollEnabled
                              />
                            </View>
                          </>
                        ) : (
                          <>
                            <PreviewKortHeader
                              action={(
                                <TouchableOpacity
                                  style={styles.redigerIkonRad}
                                  onPress={aktiverRedigering}
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel="Rediger tilbud manuelt"
                                >
                                  <Ionicons name="pencil-outline" size={14} color="#9CA3AF" />
                                </TouchableOpacity>
                              )}
                            />

                            <View style={styles.previewCardBody}>
                              <TouchableOpacity
                                onPress={aktiverRedigering}
                                activeOpacity={0.95}
                              >
                                <TilbudsForhåndsvisning
                                  tekst={byggForhåndsvisningTekst()}
                                  tone="dark"
                                  documentVariant
                                />
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.previewSecondaryAction}
                        onPress={tilbakeTilSkjemaFraBeskrivelse}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.previewSecondaryText}>Juster utgangspunkt</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.fixedFooter,
                    styles.fixedFooterPreview,
                    styles.bottomDock,
                    { paddingBottom: previewFooterDockBottomGenerated },
                  ]}
                >
                  <View
                    style={[
                      styles.footerActionArea,
                      styles.footerActionAreaPreview,
                      styles.footerActionAreaPreviewMedKundeCta,
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.sendKnappTouch,
                        { transform: [{ scale: sendKnappScale }] },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (!kanSende) {
                            åpneKundeSkjema()
                            return
                          }
                          sendTilKunde()
                        }}
                        disabled={sender}
                        activeOpacity={0.92}
                        onPressIn={() => animerSendKnapp(1)}
                        onPressOut={() => animerSendKnapp(0)}
                      >
                        {sender ? (
                          <View style={[styles.sendKnapp, styles.sendKnappLoading]}>
                            <View style={styles.ctaLeadSpacer} />
                            <View style={styles.ctaLabelWrap}>
                              <Text style={styles.sendTekst}>Sender...</Text>
                            </View>
                            <View style={styles.sendIkonWrap}>
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            </View>
                          </View>
                        ) : (
                          <LinearGradient
                            colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.sendKnappPrimary}
                          >
                            <View style={styles.ctaLeadSpacer} />
                            <View style={styles.ctaLabelWrap}>
                              <Text style={styles.sendTekstPrimary}>
                                {kanSende ? 'Send tilbud' : 'Legg til kundeinfo'}
                              </Text>
                            </View>
                            <View style={styles.sendIkonPrimærWrap}>
                              {kanSende ? (
                                <Send
                                  size={20}
                                  color="#FFFFFF"
                                  strokeWidth={2.2}
                                />
                              ) : (
                                <User
                                  size={20}
                                  color="#FFFFFF"
                                  strokeWidth={2.2}
                                />
                              )}
                            </View>
                          </LinearGradient>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                    {!kanSende && !sender ? (
                      <Text style={[styles.sendMicrocopy, styles.sendMicrocopyPreview]}>
                        Påkrevd før sending
                      </Text>
                    ) : null}
                    {generellFeil ? <Text style={styles.footerFeilTekst}>{generellFeil}</Text> : null}
                  </View>
                </View>
              </View>
            )}
          </View>

          <Modal
            visible={visKundeSkjema}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setVisKundeSkjema(false)}
          >
            <SafeAreaView style={styles.kundeModalContainer} edges={['top', 'bottom']}>
              <View style={styles.kundeModalHeaderRad}>
                <View style={styles.kundeModalTittelWrap} pointerEvents="none">
                  <Text style={styles.kundeModalTittelAbs} numberOfLines={1}>
                    Kontakt
                  </Text>
                </View>
                <View style={styles.kundeModalHeaderRow}>
                  <View style={styles.kundeModalHeaderSide} />
                  <View style={styles.kundeModalHeaderSide}>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss()
                        setVisKundeSkjema(false)
                      }}
                      style={styles.kundeModalLukk}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <KeyboardAwareScrollView
                style={styles.kundeModalScroll}
                contentContainerStyle={styles.kundeModalScrollInnhold}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={32}
                keyboardOpeningTime={0}
              >
                <Text style={styles.kundeModalIntroKort} numberOfLines={1}>
                  Legg til kontaktinfo for å fullføre tilbudet.
                </Text>
                <TextInput
                  ref={kundenavnRef}
                  style={[
                    styles.kundeModalInput,
                    fokusertFelt === 'kundenavn_sheet' && styles.inputFocused,
                  ]}
                  placeholder="Kundenavn"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={kundeNavn}
                  onChangeText={setKundeNavn}
                  autoCapitalize="words"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => telefonRef.current?.focus()}
                  onFocus={() => setFokusertFelt('kundenavn_sheet')}
                  onBlur={() => setFokusertFelt(null)}
                />
                <TextInput
                  ref={telefonRef}
                  style={[
                    styles.kundeModalInput,
                    fokusertFelt === 'telefon_sheet' && styles.inputFocused,
                  ]}
                  placeholder="Telefon"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={kundeTelefon}
                  onChangeText={setKundeTelefon}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoCapitalize="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => epostRef.current?.focus()}
                  onFocus={() => setFokusertFelt('telefon_sheet')}
                  onBlur={() => setFokusertFelt(null)}
                />
                <TextInput
                  ref={epostRef}
                  style={[
                    styles.kundeModalInput,
                    fokusertFelt === 'epost_sheet' && styles.inputFocused,
                  ]}
                  placeholder="E-post"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={kundeEpost}
                  onChangeText={setKundeEpost}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => prosjektRef.current?.focus()}
                  onFocus={() => setFokusertFelt('epost_sheet')}
                  onBlur={() => setFokusertFelt(null)}
                />
                <TextInput
                  ref={prosjektRef}
                  style={[
                    styles.kundeModalInput,
                    fokusertFelt === 'prosjekt_sheet' && styles.inputFocused,
                  ]}
                  placeholder="Prosjektadresse eller område"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={prosjektAdresse}
                  onChangeText={setProsjektAdresse}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => setFokusertFelt('prosjekt_sheet')}
                  onBlur={() => setFokusertFelt(null)}
                />
                <Text style={styles.kundeModalKalenderSeksjon}>
                  Velg eventuell oppstartdato (valgfritt)
                </Text>
                <KundeKontaktKalender
                  sheetVisible={visKundeSkjema}
                  selectedDate={oppstartDato ?? startOfLocalDay(new Date())}
                  onSelectDate={d => setOppstartDato(startOfLocalDay(d))}
                />
              </KeyboardAwareScrollView>

              <View
                style={[
                  styles.kundeModalCtaDock,
                  // SafeAreaView har allerede bunn-inset; kun luft mellom knapp og trygg kant.
                  { paddingBottom: 10 },
                ]}
              >
                <TouchableOpacity
                  disabled={!kundeSkjemaKanFerdigstilles}
                  onPress={() => {
                    if (!kundeSkjemaKanFerdigstilles) return
                    Keyboard.dismiss()
                    setVisKundeSkjema(false)
                  }}
                  activeOpacity={0.92}
                >
                  {kundeSkjemaKanFerdigstilles ? (
                    <LinearGradient
                      colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.sendKnappPrimary,
                        styles.kundeModalFerdigKnapp,
                        styles.kundeModalFerdigGradient,
                      ]}
                    >
                      <Text style={styles.sendTekstPrimary}>Ferdig</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.sendKnappPrimary,
                        styles.kundeModalFerdigKnapp,
                        styles.kundeModalFerdigDisabled,
                      ]}
                    >
                      <Text style={styles.kundeModalFerdigDisabledTekst}>Ferdig</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 64,
    backgroundColor: '#000000',
  },
  headerTitleAbsoluteWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 72,
    pointerEvents: 'box-none',
  },
  headerLeftCluster: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  headerUtkastRad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  livePingWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  livePingRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(72, 187, 120, 0.36)',
  },
  livePingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4ADE80',
  },
  headerTjenesteRadKompakt: {
    maxWidth: '100%',
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  headerTjenesteRadPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTjenesteTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerEditKnapp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEditKnappPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lukkKnapp: {
    position: 'absolute',
    right: 20,
    top: 13,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    backgroundColor: 'transparent',
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  /** Fades ut mot sidene; full bredde innenfor footer-padding. */
  prisFooterSkilleWrap: {
    marginHorizontal: -20,
    marginBottom: 12,
    alignItems: 'stretch',
  },
  prisFooterSkilleGradient: {
    height: 2,
    borderRadius: 1,
    width: '100%',
  },
  fixedFooter: {
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.94)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  /** Lavere svart panel i forhåndsvisning (Send) – skjema uendret. */
  fixedFooterPreview: {
    paddingTop: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  footerActionArea: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  footerActionAreaPreview: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  /**
   * Ferdig forhåndsvisning: skyver CTA ned uten å endre total footer-høyde
   * (brukes sammen med kortere previewFooterDockBottomGenerated).
   */
  footerActionAreaPreviewMedKundeCta: {
    paddingTop: 12,
  },
  /** Ekstra luft mellom prisestimat-kort og Generer-knapp (kun skjema-steget). */
  footerEtterPrisestimat: {
    marginTop: 12,
  },
  formBody: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  seksjonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  seksjonHeaderSpacing: {
    marginTop: 24,
  },
  seksjonLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  seksjonFeilTekst: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#CC3333',
    textAlign: 'right',
    paddingBottom: 1,
  },
  kundeRad: {
    flexDirection: 'row',
    gap: 8,
  },
  kundeNavnInput: {
    flex: 1,
  },
  kundeNavnWrap: {
    flex: 1,
  },
  kundeTelefonInput: {
    flex: 1,
  },
  input: {
    height: 48,
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputFocused: {
    backgroundColor: '#232326',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  inputFeil: {
    backgroundColor: '#1A1A1C',
    borderColor: 'rgba(255,92,92,0.92)',
  },
  multilineInput: {
    height: 110,
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    padding: 16,
    paddingTop: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
    textAlignVertical: 'top',
  },
  multilineInputFocused: {
    backgroundColor: '#232326',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroBeskrivelse: {
    height: 204,
    marginBottom: 10,
    backgroundColor: '#101012',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 8 : 10,
    paddingBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlignVertical: 'top',
  },
  heroBeskrivelseFocused: {
    backgroundColor: '#111114',
    borderColor: 'rgba(74,222,128,0.25)',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.06,
  },
  beskrivelseHelper: {
    marginBottom: 6,
    paddingHorizontal: 22,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
  },
  prisYtreContainer: {
    marginTop: 9,
    paddingTop: 0,
    paddingBottom: 40,
    marginBottom: 0,
  },
  kundeModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  kundeModalHeaderRad: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  kundeModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kundeModalTittelWrap: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kundeModalTittelAbs: {
    width: '100%',
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: '#FAFAFA',
    letterSpacing: 0.2,
  },
  kundeModalHeaderSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kundeModalLukk: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kundeModalScroll: {
    flex: 1,
  },
  kundeModalScrollInnhold: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  kundeModalIntroKort: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  kundeModalKalenderSeksjon: {
    marginTop: 4,
    marginBottom: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.35,
    color: 'rgba(255,255,255,0.52)',
  },
  kundeModalInput: {
    height: 46,
    marginBottom: 12,
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  kundeModalCtaDock: {
    paddingHorizontal: 20,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#000000',
  },
  kundeModalFerdigKnapp: {
    height: 48,
    borderRadius: 14,
  },
  kundeModalFerdigGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  kundeModalFerdigDisabled: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#24262B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  kundeModalFerdigDisabledTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 21,
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  prisKortKompakt: {
    borderRadius: 20,
    marginBottom: 0,
    minHeight: 128,
    overflow: 'hidden',
  },
  prisKortKompaktGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  prisKortGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.14,
    elevation: 6,
  },
  prisKortKompaktInnhold: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  prisKompaktHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  prisKompaktHeaderMeta: {
    flex: 1,
  },
  prisKompaktLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#C5CCD6',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  prisKompaktBeløp: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 38,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '62%',
    transform: [{ translateY: 2 }],
  },
  prisKompaktUnder: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#E8EAED',
    lineHeight: 18,
  },
  prisKompaktDetaljer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,255,180,0.08)',
    paddingTop: 10,
    marginTop: 10,
    gap: 6,
  },
  prisKompaktRad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  prisKompaktRadVenstre: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
    gap: 8,
  },
  prisKompaktRadLabel: {
    flexShrink: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#D2D8E0',
  },
  prisKompaktRadVerdi: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    flexShrink: 0,
    textAlign: 'right',
  },
  prisKompaktRadMeta: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  pickerSection: {
    marginBottom: 16,
    paddingTop: 2,
    paddingBottom: 0,
  },
  pickerLabelRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  pickerLabel: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  pickerWheelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pickerColumnWrap: {
    flex: 1,
    marginHorizontal: 4,
  },
  pickerWheelCol: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.22)',
    overflow: 'hidden',
  },
  pickerHint: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
  },
  nativePicker: {
    width: '100%',
    height: 200,
  },
  nativePickerItem: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prisInnstillingerRad: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  prisInputGruppe: {
    flex: 1,
  },
  prisInputLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  prisTallfelt: {
    height: 46,
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  prisKortTittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'left',
    marginBottom: 4,
  },
  prisTotalt: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 25,
    color: '#FFFFFF',
    lineHeight: 29,
    marginTop: 8,
    marginBottom: 2,
    letterSpacing: -0.3,
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
  prisSkille: {
    height: 1,
    backgroundColor: '#F0F0F0',
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
  footerFeilTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#CC3333',
    marginTop: 10,
    textAlign: 'center',
  },
  ctaLeadSpacer: {
    width: 38,
    height: 38,
  },
  ctaLabelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  genererKnappTouch: {
    width: '100%',
    alignSelf: 'stretch',
  },
  sendKnappTouch: {
    width: '100%',
    alignSelf: 'stretch',
  },
  sendKnapp: {
    height: 57,
    backgroundColor: '#1D1E22',
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  sendKnappLoading: {
    backgroundColor: '#25272C',
  },
  sendKnappDisabled: {
    opacity: 0.48,
  },
  sendKnappVente: {
    backgroundColor: '#24262B',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sendTekstVente: {
    color: '#6B7280',
  },
  sendKnappPrimary: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  sendTekstPrimary: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 21,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  sendIkonPrimærWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendMicrocopy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.36)',
    textAlign: 'center',
    marginTop: 8,
  },
  sendMicrocopyPreview: {
    marginTop: 4,
  },
  sendTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  sendIkonWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  formContent: {
    flex: 1,
  },
  generatedContent: {
    paddingHorizontal: 20,
    paddingTop: 72,
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  generatedContentCompact: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  generatedMain: {
    flexGrow: 1,
  },
  generatedMainCompact: {},
  previewCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  previewCardHeader: {
    minHeight: 44,
    backgroundColor: '#222226',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  previewCardHeaderCaption: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 0.2,
    paddingRight: 52,
  },
  previewCardHeaderActionSlot: {
    position: 'absolute',
    top: 0,
    right: 10,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCardHeaderActionSpacer: {
    width: 30,
    height: 30,
  },
  previewCardBody: {
    paddingLeft: 22,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  previewCardBodyLoading: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    minHeight: 220,
  },
  loadingSkeleton: {
    flex: 1,
    backgroundColor: '#1A1A1C',
  },
  metadataCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,150,0.15)',
    backgroundColor: '#1C1E24',
    overflow: 'hidden',
    marginBottom: 4,
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
    paddingBottom: 10,
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
  redigerKnapp: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  previewSecondaryAction: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 0,
  },
  previewSecondaryText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: '#4ADE80',
  },
  previewHeaderTextAction: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  previewHeaderActionText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: '#F5F7FA',
  },
  redigerIkonRad: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  redigerInput: {
    backgroundColor: '#232326',
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#F5F7FA',
    lineHeight: 22,
    minHeight: 400,
    textAlignVertical: 'top',
  },
})
