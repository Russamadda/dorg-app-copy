import { useState, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Markdown from 'react-native-markdown-display'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { genererTilbud } from '../lib/openai'
import { sendTilbudEpost } from '../lib/resend'
import { lagreForespørsel } from '../lib/supabase'
import ScrollWheelPicker from './ScrollWheelPicker'
import { SkeletonLoader } from './SkeletonLoader'
import type { Firma } from '../types'

const JOBBTYPER = ['Rørlegging', 'Elektro', 'Snekker', 'Maling', 'Taklegging', 'Annet']

const PRIS_VERDIER = [
  2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000,
  6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000,
  12000, 13000, 14000, 15000, 17500, 20000, 25000, 30000,
  35000, 40000, 45000, 50000, 60000, 75000, 100000,
]
const TIMER_VERDIER = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8,
  10, 12, 16, 20, 24, 32, 40,
]
const MATERIALE_VERDIER = [
  0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000,
  6000, 7000, 8000, 10000, 12000, 15000, 20000, 25000,
  30000, 40000, 50000,
]

interface Props {
  visible: boolean
  onClose: () => void
  firma: Firma | null
  onSendt: (kundeNavn: string) => void
}

export default function NyttTilbudModal({ visible, onClose, firma, onSendt }: Props) {
  const insets = useSafeAreaInsets()
  // Skjemafelt
  const [kundeNavn, setKundeNavn] = useState('')
  const [kundeEpost, setKundeEpost] = useState('')
  const [jobbBeskrivelse, setJobbBeskrivelse] = useState('')
  const [aktivJobbtype, setAktivJobbtype] = useState('')
  const [estimertPris, setEstimertPris] = useState(8000)
  const [timer, setTimer] = useState(4)
  const [materiale, setMateriale] = useState(2000)

  // Focus state
  const [fokusertFelt, setFokusertFelt] = useState<string | null>(null)

  // Generering
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [generertTekst, setGenerertTekst] = useState('')
  const [erGenerert, setErGenerert] = useState(false)

  // Justering
  const [visJustering, setVisJustering] = useState(false)
  const [justeringsTekst, setJusteringsTekst] = useState('')

  // Direkte redigering av tilbudstekst
  const [redigerModus, setRedigerModus] = useState(false)
  const [redigerbarTekst, setRedigerbarTekst] = useState('')

  // Send
  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState('')

  // Refs
  const scrollRef = useRef<ScrollView>(null)
  const kundenavnRef = useRef<TextInput>(null)
  const epostRef = useRef<TextInput>(null)
  const beskrivelseRef = useRef<TextInput>(null)
  const justeringRef = useRef<TextInput>(null)

  function reset() {
    setKundeNavn('')
    setKundeEpost('')
    setJobbBeskrivelse('')
    setAktivJobbtype('')
    setEstimertPris(8000)
    setTimer(4)
    setMateriale(2000)
    setFokusertFelt(null)
    setIsGenerating(false)
    setIsAdjusting(false)
    setGenerertTekst('')
    setErGenerert(false)
    setVisJustering(false)
    setJusteringsTekst('')
    setRedigerModus(false)
    setRedigerbarTekst('')
    setFeil('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function generer() {
    if (!kundeNavn.trim()) { setFeil('Fyll inn kundenavn'); return }
    if (!jobbBeskrivelse.trim()) { setFeil('Fyll inn jobbeskrivelse'); return }
    setFeil('')
    Keyboard.dismiss()
    setIsGenerating(true)
    setErGenerert(true) // Switch to generated view immediately → shows SkeletonLoader
    try {
      const beskrivelse = aktivJobbtype
        ? `[${aktivJobbtype}] ${jobbBeskrivelse}`
        : jobbBeskrivelse
      const tekst = await genererTilbud({
        kundeNavn: kundeNavn.trim(),
        jobbBeskrivelse: beskrivelse,
        prisEksMva: estimertPris,
        firmanavn: firma?.firmanavn ?? 'DORG',
        adresse: firma?.adresse,
        timepris: firma?.timepris,
        telefon: firma?.telefon,
        epost: firma?.epost,
        timer,
        materialkostnad: materiale,
        dagensdato: new Date().toLocaleDateString('nb-NO'),
      })
      setGenerertTekst(tekst)
    } catch {
      setFeil('Feil ved generering. Prøv igjen.')
      setErGenerert(false) // Gå tilbake til skjema ved feil
    } finally {
      setIsGenerating(false)
    }
  }

  async function oppdaterTilbud() {
    const justeringer = justeringsTekst.trim()
    if (!justeringer) return
    Keyboard.dismiss()
    setVisJustering(false)
    setJusteringsTekst('')
    setIsAdjusting(true)
    try {
      const beskrivelse = aktivJobbtype
        ? `[${aktivJobbtype}] ${jobbBeskrivelse}`
        : jobbBeskrivelse
      const tekst = await genererTilbud({
        kundeNavn: kundeNavn.trim(),
        jobbBeskrivelse: beskrivelse,
        prisEksMva: estimertPris,
        firmanavn: firma?.firmanavn ?? 'DORG',
        adresse: firma?.adresse,
        timepris: firma?.timepris,
        telefon: firma?.telefon,
        epost: firma?.epost,
        timer,
        materialkostnad: materiale,
        dagensdato: new Date().toLocaleDateString('nb-NO'),
        justeringer,
      })
      setGenerertTekst(tekst)
    } catch {
      setFeil('Feil ved oppdatering. Prøv igjen.')
    } finally {
      setIsAdjusting(false)
    }
  }

  async function sendTilKunde() {
    if (!generertTekst || !firma) return
    setSender(true)
    setFeil('')
    try {
      await sendTilbudEpost({
        tilEpost: kundeEpost.trim(),
        kundeNavn: kundeNavn.trim(),
        firmanavn: firma.firmanavn,
        generertTekst,
        prisEksMva: estimertPris,
      })
      await lagreForespørsel({
        kundeNavn: kundeNavn.trim(),
        kundeEpost: kundeEpost.trim(),
        jobbBeskrivelse,
        prisEksMva: estimertPris,
        status: 'sendt',
        generertTekst,
        firmaId: firma.id,
        jobbType: aktivJobbtype || 'annet',
      })
      onSendt(kundeNavn.trim())
      handleClose()
    } catch (e) {
      console.error('Feil ved sending:', e)
      setFeil('Kunne ikke sende tilbud. Prøv igjen.')
    } finally {
      setSender(false)
    }
  }

  function åpneRedigerModus() {
    setRedigerbarTekst(generertTekst)
    setRedigerModus(true)
  }

  function lagreRedigering() {
    setGenerertTekst(redigerbarTekst)
    setRedigerModus(false)
  }

  const mva = estimertPris * 0.25
  const total = estimertPris + mva
  const isActive = isGenerating || isAdjusting

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={handleClose}
      onShow={() => {
        setTimeout(() => kundenavnRef.current?.focus(), 100)
      }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerVenstre}>
            {isActive && <View style={styles.headerDot} />}
            <Text style={styles.tittel}>Nytt tilbud</Text>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.avbryt}>Avbryt</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={12}
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + (visJustering ? 96 : 16) },
            ]}
          >
          {/* ═══ ETTER GENERERING ═══ */}
          {erGenerert && (
            <>
              <View style={styles.generatedShell}>
                <View style={styles.generatedMain}>
                  <View style={styles.oppsummeringsBoks}>
                    <OppsummeringsRad label="Kunde" verdi={kundeNavn} />
                    <OppsummeringsRad label="Jobb" verdi={jobbBeskrivelse} truncate />
                    <OppsummeringsRad
                      label="Estimert"
                      verdi={`kr ${estimertPris.toLocaleString('nb-NO')}`}
                    />
                    <View style={styles.oppsummeringsDivider} />
                    <TouchableOpacity
                      style={styles.redigerKnapp}
                      onPress={() => {
                        setErGenerert(false)
                        scrollRef.current?.scrollTo({ y: 0, animated: false })
                      }}
                    >
                      <Text style={styles.redigerTekst}>← Rediger utgangspunkt</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.seksjonLabel, { marginTop: 24 }]}>FORHÅNDSVISNING</Text>

                  {(isGenerating || isAdjusting) ? (
                    <View style={styles.loadingStage}>
                      <SkeletonLoader style={styles.loadingSkeleton} />
                    </View>
                  ) : (
                    <>
                      <View style={styles.fvBoks}>
                        {redigerModus ? (
                          <>
                            <View style={styles.fvRedigerHeader}>
                              <Text style={styles.fvRedigerLabel}>Redigerer tilbudstekst</Text>
                              <TouchableOpacity onPress={lagreRedigering}>
                                <Text style={styles.fvFerdigTekst}>Ferdig</Text>
                              </TouchableOpacity>
                            </View>
                            <TextInput
                              style={styles.redigerInput}
                              value={redigerbarTekst}
                              onChangeText={setRedigerbarTekst}
                              multiline
                              autoFocus
                              textAlignVertical="top"
                            />
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.redigerIkonRad}
                              onPress={åpneRedigerModus}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="pencil-outline" size={14} color="#9CA3AF" />
                              <Text style={styles.redigerIkonTekst}>Rediger</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={åpneRedigerModus} activeOpacity={0.95}>
                              <Markdown style={markdownStyles}>{generertTekst}</Markdown>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      <View style={styles.prisSammendragBoks}>
                        <PrisRad
                          label="Pris eks. mva"
                          verdi={`kr ${estimertPris.toLocaleString('nb-NO')}`}
                        />
                        <PrisRad
                          label="MVA 25%"
                          verdi={`kr ${Math.round(mva).toLocaleString('nb-NO')}`}
                        />
                        <View style={styles.prisDivider} />
                        <PrisRad
                          label="Totalt"
                          verdi={`kr ${Math.round(total).toLocaleString('nb-NO')}`}
                          bold
                        />
                      </View>
                    </>
                  )}
                </View>

                {!isGenerating && !isAdjusting && visJustering && (
                  <View style={styles.justeringsBoks}>
                    <TextInput
                      ref={justeringRef}
                      style={styles.justeringsInput}
                      placeholder="F.eks: øk timepris, kortere leveringstid"
                      placeholderTextColor={Colors.textMuted}
                      value={justeringsTekst}
                      onChangeText={setJusteringsTekst}
                      returnKeyType="go"
                      returnKeyLabel="Oppdater"
                      onSubmitEditing={oppdaterTilbud}
                      blurOnSubmit
                      autoCorrect={false}
                      autoCapitalize="sentences"
                    />
                  </View>
                )}

                <View style={styles.generatedFooter}>
                  <View style={styles.handlingKnapper}>
                    <TouchableOpacity
                      style={[styles.justerKnapp, (isGenerating || isAdjusting) && styles.knappDisabled]}
                      onPress={() => {
                        if (isGenerating || isAdjusting) return
                        const opening = !visJustering
                        setVisJustering(opening)
                        if (opening) {
                          requestAnimationFrame(() => {
                            scrollRef.current?.scrollToEnd({ animated: true })
                            setTimeout(() => justeringRef.current?.focus(), 220)
                          })
                        } else {
                          Keyboard.dismiss()
                        }
                      }}
                      disabled={isGenerating || isAdjusting}
                    >
                      <Ionicons name="options-outline" size={16} color="#1B4332" />
                      <Text style={styles.justerTekst}>Juster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendKnapp, sender && { opacity: 0.7 }]}
                      onPress={sendTilKunde}
                      disabled={sender}
                    >
                      {sender ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#fff" />
                          <Text style={styles.sendTekst}>Send til kunde</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}
                </View>
              </View>
            </>
          )}

          {/* ═══ SKJEMA ═══ */}
          {!erGenerert && (
            <>
              <View style={styles.formShell}>
                <View style={styles.formBody}>
                  <Text style={styles.seksjonLabel}>KUNDEN</Text>
                  <TextInput
                    ref={kundenavnRef}
                    style={[styles.input, fokusertFelt === 'kundenavn' && styles.inputFocused]}
                    placeholder="Kundenavn"
                    placeholderTextColor={Colors.textMuted}
                    value={kundeNavn}
                    onChangeText={setKundeNavn}
                    autoCapitalize="words"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => epostRef.current?.focus()}
                    onFocus={() => {
                      setFokusertFelt('kundenavn')
                    }}
                    onBlur={() => setFokusertFelt(null)}
                  />
                  <TextInput
                    ref={epostRef}
                    style={[
                      styles.input,
                      { marginTop: 8 },
                      fokusertFelt === 'epost' && styles.inputFocused,
                    ]}
                    placeholder="Kunde e-post"
                    placeholderTextColor={Colors.textMuted}
                    value={kundeEpost}
                    onChangeText={setKundeEpost}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => beskrivelseRef.current?.focus()}
                    onFocus={() => {
                      setFokusertFelt('epost')
                    }}
                    onBlur={() => setFokusertFelt(null)}
                  />

                  <Text style={[styles.seksjonLabel, { marginTop: 24 }]}>JOBBEN</Text>
                  <TextInput
                    ref={beskrivelseRef}
                    style={[
                      styles.multilineInput,
                      fokusertFelt === 'beskrivelse' && styles.multilineInputFocused,
                    ]}
                    placeholder={'F.eks: Bytte varmtvannsbereder i bad.\nInkludere røropplegg til oppvaskmaskin.'}
                    placeholderTextColor={Colors.textMuted}
                    value={jobbBeskrivelse}
                    onChangeText={setJobbBeskrivelse}
                    multiline
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onFocus={() => {
                      setFokusertFelt('beskrivelse')
                      setTimeout(() => scrollRef.current?.scrollTo({ y: 160, animated: true }), 300)
                    }}
                    onBlur={() => setFokusertFelt(null)}
                  />

                  <Text style={[styles.seksjonLabel, { marginTop: 28 }]}>TYPE JOBB</Text>
                  <View style={styles.typeGrid}>
                    {JOBBTYPER.map(type => {
                      const aktiv = aktivJobbtype === type
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.typeOption, aktiv && styles.typeOptionAktiv]}
                          onPress={() => {
                            setAktivJobbtype(prev => prev === type ? '' : type)
                            Keyboard.dismiss()
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.typeRadio, aktiv && styles.typeRadioAktiv]}>
                            {aktiv ? <View style={styles.typeRadioInner} /> : null}
                          </View>
                          <Text style={[styles.typeOptionTekst, aktiv && styles.typeOptionTekstAktiv]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <View style={styles.hjulSection}>
                    <View style={styles.hjulRad}>
                      <ScrollWheelPicker
                        label="ESTIMERT PRIS"
                        value={estimertPris}
                        onChange={setEstimertPris}
                        values={PRIS_VERDIER}
                        suffix="kr"
                      />
                      <ScrollWheelPicker
                        label="TIMER"
                        value={timer}
                        onChange={setTimer}
                        values={TIMER_VERDIER}
                        suffix="t"
                      />
                      <ScrollWheelPicker
                        label="MATERIALE"
                        value={materiale}
                        onChange={setMateriale}
                        values={MATERIALE_VERDIER}
                        suffix="kr"
                      />
                    </View>
                  </View>

                  {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}
                </View>

                <View style={styles.formFooter}>
                  <TouchableOpacity
                    style={[
                      styles.genererKnapp,
                      isGenerating && styles.genererKnappLoading,
                    ]}
                    onPress={generer}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.genererTekst}>Genererer...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.genererTekst}>Generer tilbud</Text>
                        <Ionicons name="arrow-forward-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Hjelpere ────────────────────────────────────────────────────────────────

function OppsummeringsRad({
  label,
  verdi,
  truncate,
}: {
  label: string
  verdi: string
  truncate?: boolean
}) {
  return (
    <View style={styles.oppsummeringsRad}>
      <Text style={styles.oppsummeringsLabel}>{label}</Text>
      <Text style={styles.oppsummeringsVerdi} numberOfLines={truncate ? 1 : undefined}>
        {verdi}
      </Text>
    </View>
  )
}

function PrisRad({
  label,
  verdi,
  bold,
}: {
  label: string
  verdi: string
  bold?: boolean
}) {
  return (
    <View style={styles.prisRadRow}>
      <Text style={[styles.prisRadLabel, bold && styles.prisRadBold]}>{label}</Text>
      <Text style={[styles.prisRadVerdi, bold && styles.prisRadBoldVerdi]}>{verdi}</Text>
    </View>
  )
}

// ── Markdown styles ──────────────────────────────────────────────────────────

const markdownStyles = {
  body: { fontSize: 14, color: '#111827', lineHeight: 22 },
  heading1: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: '#1B4332',
    marginBottom: 8,
  },
  heading2: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#1B4332',
    marginBottom: 6,
  },
  bullet_list: { marginLeft: 8 },
  list_item: { fontSize: 14, color: '#374151' },
  strong: { fontWeight: '700' as const },
  hr: { backgroundColor: '#E2E8E4', height: 1, marginVertical: 12 },
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerVenstre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF82',
  },
  tittel: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: Colors.primary,
  },
  avbryt: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#6B7280',
  },

  // Content
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
  },
  formShell: {
    paddingBottom: 4,
  },
  formBody: {
    paddingBottom: 12,
  },
  formFooter: {
    paddingTop: 24,
    paddingBottom: 0,
  },

  // Seksjonlabel
  seksjonLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: '#374151',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // Inputs
  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#111827',
  },
  inputFocused: {
    borderColor: '#1B4332',
    borderWidth: 1.5,
  },
  multilineInput: {
    minHeight: 110,
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    paddingTop: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },
  multilineInputFocused: {
    borderColor: '#1B4332',
    borderWidth: 1.5,
  },

  // Jobbtype
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E7E2',
    backgroundColor: '#FBFDFC',
  },
  typeOptionAktiv: {
    backgroundColor: '#E8F3EC',
    borderColor: '#1B4332',
  },
  typeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C7D1C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  typeRadioAktiv: {
    borderColor: '#1B4332',
  },
  typeRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B4332',
  },
  typeOptionTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#44505F',
  },
  typeOptionTekstAktiv: {
    color: '#1B4332',
  },

  // Hjul
  hjulSection: {
    marginTop: 28,
  },
  hjulRad: { flexDirection: 'row', gap: 8 },

  // Feil
  feilTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },

  // Generer-knapp
  genererKnapp: {
    height: 54,
    backgroundColor: '#1B4332',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genererKnappLoading: { backgroundColor: '#0F2D1F' },
  genererTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },

  // Generert visning
  generatedShell: {
    flexGrow: 1,
    minHeight: 0,
  },
  generatedMain: {
    flexGrow: 1,
  },
  generatedFooter: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  loadingStage: {
    flex: 1,
    minHeight: 420,
    justifyContent: 'flex-start',
  },
  loadingSkeleton: {
    flex: 1,
  },

  // Oppsummering (DEL 5)
  oppsummeringsBoks: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0,
  },
  oppsummeringsRad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  oppsummeringsLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  oppsummeringsVerdi: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  oppsummeringsDivider: { height: 1, backgroundColor: '#E5E7EB' },
  redigerKnapp: { paddingVertical: 12, alignItems: 'center' },
  redigerTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#4CAF82',
  },

  // Forhåndsvisning
  fvBoks: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderTopWidth: 3,
    borderTopColor: '#4CAF82',
    padding: 20,
  },
  fvRedigerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fvRedigerLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  fvFerdigTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: '#1B4332',
  },
  redigerIkonRad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  redigerIkonTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  redigerInput: {
    fontSize: 14,
    lineHeight: 22,
    color: '#111827',
    fontFamily: 'DMSans_400Regular',
    minHeight: 200,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: '#1B4332',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },

  // Prissammendrag
  prisSammendragBoks: {
    backgroundColor: '#F8FBF9',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  prisRadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  prisRadLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  prisRadVerdi: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#111827',
  },
  prisRadBold: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#1B4332',
  },
  prisRadBoldVerdi: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    color: '#1B4332',
  },
  prisDivider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 8, marginTop: 2 },

  // Justeringsfelt
  justeringsBoks: { marginTop: 12, gap: 8 },
  justeringsInput: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1B4332',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#111827',
  },

  // Handlingsknapper
  handlingKnapper: {
    flexDirection: 'row',
    gap: 10,
  },
  knappDisabled: {
    opacity: 0.55,
  },
  justerKnapp: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#1B4332',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  justerTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#1B4332',
  },
  sendKnapp: {
    flex: 2,
    height: 52,
    backgroundColor: '#1B4332',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },
})
