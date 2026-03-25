import { useRef, useState } from 'react'
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
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { genererTilbud } from '../lib/openai'
import { sendTilbudEpost } from '../lib/resend'
import { lagreForespørsel } from '../lib/supabase'
import ScrollWheelPicker from './ScrollWheelPicker'
import { SkeletonLoader } from './SkeletonLoader'
import { TilbudsForhåndsvisning } from './TilbudsForhåndsvisning'
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

function rensMarkdown(tekst: string) {
  return tekst
    .replace(/^#{1,6}\s/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
}

function erGyldigEpost(epost: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost.trim())
}

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

export default function NyttTilbudModal({ visible, onClose, firma, onSendt }: Props) {
  const insets = useSafeAreaInsets()

  const [kundeNavn, setKundeNavn] = useState('')
  const [kundeTelefon, setKundeTelefon] = useState('')
  const [kundeEpost, setKundeEpost] = useState('')
  const [jobbBeskrivelse, setJobbBeskrivelse] = useState('')
  const [aktivJobbtype, setAktivJobbtype] = useState('')
  const [estimertPris, setEstimertPris] = useState(8000)
  const [timer, setTimer] = useState(4)
  const [materiale, setMateriale] = useState(2000)

  const [fokusertFelt, setFokusertFelt] = useState<string | null>(null)
  const [skalFokusereBeskrivelseVedRetur, setSkalFokusereBeskrivelseVedRetur] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generertTekst, setGenerertTekst] = useState('')
  const [erGenerert, setErGenerert] = useState(false)

  const [redigerModus, setRedigerModus] = useState(false)
  const [redigerbarTekst, setRedigerbarTekst] = useState('')

  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState('')

  const scrollRef = useRef<ScrollView>(null)
  const kundenavnRef = useRef<TextInput>(null)
  const telefonRef = useRef<TextInput>(null)
  const epostRef = useRef<TextInput>(null)
  const beskrivelseRef = useRef<TextInput>(null)

  function reset() {
    setKundeNavn('')
    setKundeTelefon('')
    setKundeEpost('')
    setJobbBeskrivelse('')
    setAktivJobbtype('')
    setEstimertPris(8000)
    setTimer(4)
    setMateriale(2000)

    setFokusertFelt(null)
    setSkalFokusereBeskrivelseVedRetur(false)

    setIsGenerating(false)
    setGenerertTekst('')
    setErGenerert(false)

    setRedigerModus(false)
    setRedigerbarTekst('')

    setSender(false)
    setFeil('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function byggJobbBeskrivelse() {
    return aktivJobbtype
      ? `[${aktivJobbtype}] ${jobbBeskrivelse}`
      : jobbBeskrivelse
  }

  function validerSkjemaFørGenerering() {
    if (!kundeNavn.trim()) {
      setFeil('Fyll inn kundenavn')
      return false
    }

    if (!jobbBeskrivelse.trim()) {
      setFeil('Fyll inn jobbeskrivelse')
      return false
    }

    setFeil('')
    return true
  }

  async function generer() {
    if (!validerSkjemaFørGenerering()) return

    Keyboard.dismiss()
    setFeil('')
    setIsGenerating(true)
    setErGenerert(true)

    try {
      const tekst = await genererTilbud({
        kundeNavn: kundeNavn.trim(),
        jobbBeskrivelse: byggJobbBeskrivelse(),
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
      setErGenerert(false)
    } finally {
      setIsGenerating(false)
    }
  }

  async function sendTilKunde() {
    if (!generertTekst || !firma) return

    if (!kundeEpost.trim()) {
      setFeil('Fyll inn kunde e-post')
      return
    }

    if (!erGyldigEpost(kundeEpost)) {
      setFeil('Skriv inn en gyldig e-postadresse')
      return
    }

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
        kundeTelefon: kundeTelefon.trim() || undefined,
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

  function aktiverRedigering() {
    setRedigerbarTekst(rensMarkdown(generertTekst))
    setRedigerModus(true)
  }

  function lagreRedigering() {
    setGenerertTekst(redigerbarTekst)
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
      kundenavnRef.current?.focus()
    }, 100)
  }

  function håndterBeskrivelseFocus() {
    setFokusertFelt('beskrivelse')
  }

  const isLoadingState = erGenerert && isGenerating
  const isGeneratedState = erGenerert && !isGenerating
  const fixedBottomPadding = Math.max(insets.bottom, 12)

  const kanSende =
    !sender &&
    !!generertTekst &&
    !!kundeEpost.trim() &&
    erGyldigEpost(kundeEpost)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={handleClose}
      onShow={() => {
        if (!erGenerert) {
          håndterFormVisning()
        }
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerVenstre}>
              {(isLoadingState || isGeneratedState) && <View style={styles.headerDot} />}
              <Text style={styles.tittel}>Nytt tilbud</Text>
            </View>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.avbryt}>Avbryt</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.flex}>
            {!erGenerert && (
              <View style={styles.screen}>
                <View
                  style={[
                    styles.content,
                    styles.formContent,
                    { paddingBottom: 110 + fixedBottomPadding },
                  ]}
                >
                  <View style={styles.formBody}>
                    <Text style={styles.seksjonLabel}>KUNDEN</Text>

                    <View style={styles.kundeRad}>
                      <TextInput
                        ref={kundenavnRef}
                        style={[
                          styles.input,
                          styles.kundeNavnInput,
                          fokusertFelt === 'kundenavn' && styles.inputFocused,
                        ]}
                        placeholder="Kundenavn"
                        placeholderTextColor={Colors.textMuted}
                        value={kundeNavn}
                        onChangeText={setKundeNavn}
                        autoCapitalize="words"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => telefonRef.current?.focus()}
                        onFocus={() => setFokusertFelt('kundenavn')}
                        onBlur={() => setFokusertFelt(null)}
                      />

                      <TextInput
                        ref={telefonRef}
                        style={[
                          styles.input,
                          styles.kundeTelefonInput,
                          fokusertFelt === 'telefon' && styles.inputFocused,
                        ]}
                        placeholder="Telefon"
                        placeholderTextColor={Colors.textMuted}
                        value={kundeTelefon}
                        onChangeText={setKundeTelefon}
                        keyboardType="phone-pad"
                        textContentType="telephoneNumber"
                        autoCapitalize="none"
                        onFocus={() => setFokusertFelt('telefon')}
                        onBlur={() => setFokusertFelt(null)}
                      />
                    </View>

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
                      autoCorrect={false}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => beskrivelseRef.current?.focus()}
                      onFocus={() => setFokusertFelt('epost')}
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
                      onFocus={håndterBeskrivelseFocus}
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
                              setAktivJobbtype(prev => (prev === type ? '' : type))
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
                </View>

                <View
                  style={[
                    styles.fixedFooter,
                    styles.bottomDock,
                    { paddingBottom: fixedBottomPadding },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.genererKnapp, isGenerating && styles.genererKnappLoading]}
                    onPress={generer}
                    disabled={isGenerating}
                    activeOpacity={0.85}
                  >
                    {isGenerating ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.genererTekst}>Genererer...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.genererTekst}>Generer tilbud</Text>
                        <Ionicons
                          name="arrow-forward-outline"
                          size={16}
                          color="#fff"
                          style={{ marginLeft: 6 }}
                        />
                      </>
                    )}
                  </TouchableOpacity>
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
                    { paddingBottom: 108 + fixedBottomPadding },
                  ]}
                >
                  <View style={styles.generatedMain}>
                    <View style={styles.oppsummeringsBoks}>
                      <OppsummeringsRad label="Kunde" verdi={kundeNavn} />
                      {kundeTelefon.trim() ? (
                        <OppsummeringsRad label="Telefon" verdi={kundeTelefon.trim()} />
                      ) : null}
                      <OppsummeringsRad label="Jobb" verdi={jobbBeskrivelse} truncate />
                      <OppsummeringsRad
                        label="Estimert"
                        verdi={`kr ${estimertPris.toLocaleString('nb-NO')}`}
                      />
                    </View>

                    <Text style={[styles.seksjonLabel, { marginTop: 24 }]}>FORHÅNDSVISNING</Text>

                    <View style={styles.loadingStage}>
                      <SkeletonLoader style={styles.loadingSkeleton} />
                    </View>
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.fixedFooter,
                    styles.bottomDock,
                    { paddingBottom: fixedBottomPadding },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.sendKnappFull, styles.knappDisabled]}
                    disabled
                    activeOpacity={1}
                  >
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.sendTekst}>Send til kunde</Text>
                  </TouchableOpacity>
                  {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}
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
                    { paddingBottom: 88 + fixedBottomPadding },
                  ]}
                >
                  <View style={styles.generatedMainCompact}>
                    <View style={styles.oppsummeringsBoks}>
                      <OppsummeringsRad label="Kunde" verdi={kundeNavn} />
                      {kundeTelefon.trim() ? (
                        <OppsummeringsRad label="Telefon" verdi={kundeTelefon.trim()} />
                      ) : null}
                      <OppsummeringsRad label="Jobb" verdi={jobbBeskrivelse} truncate />
                      <OppsummeringsRad
                        label="Estimert"
                        verdi={`kr ${estimertPris.toLocaleString('nb-NO')}`}
                      />
                    </View>

                    <Text style={[styles.seksjonLabel, { marginTop: 14 }]}>FORHÅNDSVISNING</Text>

                    <View style={styles.fvBoks}>
                      {redigerModus ? (
                        <>
                          <View style={styles.fvRedigerHeader}>
                            <Text style={styles.fvRedigerLabel}>Redigerer tilbudstekst</Text>
                            <TouchableOpacity onPress={lagreRedigering} activeOpacity={0.7}>
                              <Text style={styles.fvFerdigTekst}>Ferdig</Text>
                            </TouchableOpacity>
                          </View>

                          <TextInput
                            style={styles.redigerInput}
                            value={redigerbarTekst}
                            onChangeText={setRedigerbarTekst}
                            multiline
                            textAlignVertical="top"
                            scrollEnabled
                          />
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.redigerIkonRad}
                            onPress={aktiverRedigering}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.redigerIkonTekst}>Rediger manuelt</Text>
                          </TouchableOpacity>

                          <TouchableOpacity onPress={aktiverRedigering} activeOpacity={0.95}>
                            <TilbudsForhåndsvisning tekst={generertTekst} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    <View style={styles.oppsummeringsDivider} />
                    <TouchableOpacity
                      style={styles.redigerKnapp}
                      onPress={tilbakeTilSkjemaFraBeskrivelse}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.redigerTekst}>Juster utgangspunkt</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View
                  style={[
                    styles.fixedFooter,
                    styles.bottomDock,
                    { paddingBottom: fixedBottomPadding },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.sendKnappFull, (!kanSende || sender) && styles.knappDisabled]}
                    onPress={sendTilKunde}
                    disabled={!kanSende}
                    activeOpacity={0.85}
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
                  {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    minHeight: 0,
  },

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

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
  },

  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  fixedFooter: {
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  formBody: {
    paddingBottom: 12,
  },

  seksjonLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: '#374151',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  kundeRad: {
    flexDirection: 'row',
    gap: 8,
  },

  kundeNavnInput: {
    flex: 1,
  },

  kundeTelefonInput: {
    flex: 1,
  },

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

  hjulSection: {
    marginTop: 28,
  },

  hjulRad: {
    flexDirection: 'row',
    gap: 8,
  },

  feilTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },

  genererKnapp: {
    height: 54,
    backgroundColor: '#1B4332',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  genererKnappLoading: {
    backgroundColor: '#0F2D1F',
  },

  genererTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },

  formContent: {
    flex: 1,
  },

  generatedContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },

  generatedContentCompact: {
    flexGrow: 0,
  },

  generatedMain: {
    flexGrow: 1,
  },

  generatedMainCompact: {},

  loadingStage: {
    flex: 1,
    minHeight: 420,
    justifyContent: 'flex-start',
  },

  loadingSkeleton: {
    flex: 1,
  },

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

  oppsummeringsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  redigerKnapp: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  redigerTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#4CAF82',
  },

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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1B4332',
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
    lineHeight: 22,
    minHeight: 400,
    textAlignVertical: 'top',
  },

  knappDisabled: {
    opacity: 0.55,
  },

  sendKnappFull: {
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
