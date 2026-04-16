import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type TextInput as RNTextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authOnboardingColors } from '../constants/authOnboardingTheme'

type Props = {
  visible: boolean
  onClose: () => void
  tilgjengeligeTjenester: string[]
  valgteTjenester: string[]
  maxTjenester: number
  onAddService: (tjeneste: string) => Promise<boolean>
}

type ResultatRad =
  | { type: 'forslag'; value: string }
  | { type: 'custom'; value: string }

const REVEAL_MS = 190
const COLLAPSE_MS = 190
const EXPAND_MS = 180
const MAX_VISIBLE_FORSLAG = 3
const MIN_CUSTOM_LENGTH = 6
const RESULTAT_RAD_HOYDE = 44
const RESULTAT_GAP = 6
const INFO_HOYDE = 28
const RESULTAT_TOP_PADDING = 8
const RESULTAT_BOTTOM_PADDING = 2

export default function LeggTilTjenesterModal({
  visible,
  onClose,
  tilgjengeligeTjenester,
  valgteTjenester,
  maxTjenester,
  onAddService,
}: Props) {
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const [rendered, setRendered] = useState(visible)
  const [søkeTekst, setSøkeTekst] = useState('')
  const [leggerTilTjeneste, setLeggerTilTjeneste] = useState<string | null>(null)
  const [optimistiskValgte, setOptimistiskValgte] = useState<Set<string>>(new Set())
  const revealAnim = useRef(new Animated.Value(visible ? 1 : 0)).current
  const resultHeightAnim = useRef(new Animated.Value(0)).current
  const inputRef = useRef<RNTextInput>(null)
  const aktivtSøkRef = useRef('')

  function resetModalState() {
    Keyboard.dismiss()
    setSøkeTekst('')
    setLeggerTilTjeneste(null)
    setOptimistiskValgte(new Set())
    aktivtSøkRef.current = ''
  }

  useEffect(() => {
    if (visible) {
      revealAnim.setValue(0)
      resultHeightAnim.setValue(0)
      setRendered(true)
      Animated.timing(revealAnim, {
        toValue: 1,
        duration: REVEAL_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          inputRef.current?.focus()
        }
      })
      return
    }

    Animated.timing(revealAnim, {
      toValue: 0,
      duration: COLLAPSE_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        resetModalState()
        setRendered(false)
      }
    })
  }, [revealAnim, visible])

  const normalisertSøk = søkeTekst.trim()
  const kanLeggeTilFlere = valgteTjenester.length < maxTjenester
  const valgteTjenesterNormalisert = useMemo(
    () => new Set(valgteTjenester.map(tjeneste => tjeneste.trim().toLowerCase())),
    [valgteTjenester]
  )

  const forslag = useMemo(() => {
    if (!normalisertSøk) return []
    const q = normalisertSøk.toLowerCase()
    return tilgjengeligeTjenester
      .filter(tjeneste => tjeneste.toLowerCase().includes(q))
      .slice(0, MAX_VISIBLE_FORSLAG)
  }, [normalisertSøk, tilgjengeligeTjenester])

  const eksaktTreffFinnes = tilgjengeligeTjenester.some(
    tjeneste => tjeneste.toLowerCase() === normalisertSøk.toLowerCase()
  )
  const alleredeValgt = valgteTjenesterNormalisert.has(normalisertSøk.toLowerCase())
  const kanLeggeTilCustom =
    kanLeggeTilFlere &&
    normalisertSøk.length >= MIN_CUSTOM_LENGTH &&
    !alleredeValgt &&
    !eksaktTreffFinnes &&
    forslag.length === 0

  const rader = useMemo<ResultatRad[]>(() => {
    if (!kanLeggeTilFlere) return []
    if (forslag.length > 0) {
      return forslag.map(value => ({ type: 'forslag', value }))
    }
    if (kanLeggeTilCustom) {
      return [{ type: 'custom', value: normalisertSøk }]
    }
    return []
  }, [kanLeggeTilCustom, kanLeggeTilFlere, forslag, normalisertSøk])

  const visInfo = normalisertSøk.length > 0 && !kanLeggeTilFlere

  const infoTekst = !kanLeggeTilFlere ? 'Maks antall tjenester nådd.' : ''

  useEffect(() => {
    const nesteSøk = normalisertSøk.toLowerCase()
    if (aktivtSøkRef.current !== nesteSøk) {
      aktivtSøkRef.current = nesteSøk
      setOptimistiskValgte(new Set())
    }
  }, [normalisertSøk])

  useEffect(() => {
    const nesteHoyde =
      rader.length > 0
        ? RESULTAT_TOP_PADDING +
          RESULTAT_BOTTOM_PADDING +
          (rader.length * RESULTAT_RAD_HOYDE) +
          ((rader.length - 1) * RESULTAT_GAP)
        : visInfo
          ? RESULTAT_TOP_PADDING + INFO_HOYDE
          : 0

    Animated.timing(resultHeightAnim, {
      toValue: nesteHoyde,
      duration: EXPAND_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [resultHeightAnim, rader.length, visInfo])

  async function håndterLeggTil(tjeneste: string) {
    if (!kanLeggeTilFlere || leggerTilTjeneste) return
    if (valgteTjenesterNormalisert.has(tjeneste.toLowerCase())) return
    setLeggerTilTjeneste(tjeneste)
    const lagtTil = await onAddService(tjeneste)
    setLeggerTilTjeneste(null)
    if (lagtTil) {
      setOptimistiskValgte(current => {
        const neste = new Set(current)
        neste.add(tjeneste.toLowerCase())
        return neste
      })
    }
  }

  const backdropStyle = {
    opacity: revealAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  }

  const dialogStyle = {
    opacity: revealAnim,
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
      {
        scale: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  }

  const dialogTopOffset = Math.max(insets.top + 28, Math.round(screenHeight * 0.36))

  const resultOpacityStyle = {
    opacity: resultHeightAnim.interpolate({
      inputRange: [0, 16, 40],
      outputRange: [0, 0.55, 1],
      extrapolate: 'clamp',
    }),
  }

  if (!rendered) return null

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdropFill, backdropStyle]}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              Keyboard.dismiss()
              onClose()
            }}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(16, insets.top) : 0}
          style={styles.keyboardWrap}
        >
          <View
            style={[styles.centerWrap, { paddingTop: dialogTopOffset }]}
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.modalCard, dialogStyle]}>
              <View style={styles.searchField}>
                <Ionicons name="search-outline" size={17} color={authOnboardingColors.textMuted} />
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder="Søk etter tjeneste"
                  placeholderTextColor="#8692A2"
                  value={søkeTekst}
                  onChangeText={setSøkeTekst}
                  autoCapitalize="words"
                  autoFocus={false}
                  returnKeyType={kanLeggeTilCustom ? 'done' : 'search'}
                  onSubmitEditing={() => {
                    if (kanLeggeTilCustom) {
                      void håndterLeggTil(normalisertSøk)
                    }
                  }}
                  maxLength={30}
                />
                {normalisertSøk.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setSøkeTekst('')}
                    style={styles.clearButton}
                    activeOpacity={0.76}
                    accessibilityRole="button"
                    accessibilityLabel="Tøm søk"
                  >
                    <Ionicons name="close-circle" size={17} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Animated.View style={[styles.resultArea, { height: resultHeightAnim }]}>
                <Animated.View style={[styles.resultAreaInner, resultOpacityStyle]}>
                  {rader.map((rad, index) => (
                    <ResultRow
                      key={`${rad.type}-${rad.value}`}
                      label={rad.type === 'custom' ? `Legg til "${rad.value}"` : rad.value}
                      valgt={
                        valgteTjenesterNormalisert.has(rad.value.toLowerCase()) ||
                        optimistiskValgte.has(rad.value.toLowerCase())
                      }
                      pending={leggerTilTjeneste === rad.value}
                      onPress={() => håndterLeggTil(rad.value)}
                      isLast={index === rader.length - 1}
                    />
                  ))}

                  {visInfo ? (
                    <View style={styles.inlineInfo}>
                      <Text style={styles.inlineInfoText}>{infoTekst}</Text>
                    </View>
                  ) : null}
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

function ResultRow({
  label,
  valgt,
  pending,
  onPress,
  isLast,
}: {
  label: string
  valgt: boolean
  pending: boolean
  onPress: () => void
  isLast: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={pending || valgt}
      style={[
        styles.resultRow,
        valgt && styles.resultRowValgt,
        !isLast && styles.resultRowSpacing,
      ]}
      activeOpacity={0.86}
    >
      <Text style={styles.resultTitle} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.resultIconWrap, valgt && styles.resultIconWrapValgt]}>
        {pending ? (
          <ActivityIndicator size="small" color={authOnboardingColors.cta} />
        ) : valgt ? (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        ) : (
          <Ionicons name="add" size={16} color={authOnboardingColors.cta} />
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.18)',
  },
  keyboardWrap: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 392,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.07)',
    shadowColor: '#14304B',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(132,145,161,0.18)',
    shadowColor: '#14304B',
    shadowOpacity: 0.018,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: authOnboardingColors.text,
  },
  clearButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultArea: {
    overflow: 'hidden',
  },
  resultAreaInner: {
    paddingTop: RESULTAT_TOP_PADDING,
    paddingBottom: RESULTAT_BOTTOM_PADDING,
  },
  inlineInfo: {
    height: INFO_HOYDE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authOnboardingColors.softAccent,
    paddingHorizontal: 8,
  },
  inlineInfoText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: authOnboardingColors.textMuted,
  },
  resultRow: {
    height: RESULTAT_RAD_HOYDE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  resultRowValgt: {
    backgroundColor: 'rgba(27,67,50,0.06)',
    borderColor: 'rgba(27,67,50,0.14)',
  },
  resultRowSpacing: {
    marginBottom: RESULTAT_GAP,
  },
  resultIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authOnboardingColors.softAccent,
  },
  resultIconWrapValgt: {
    backgroundColor: authOnboardingColors.cta,
  },
  resultTitle: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 18,
    color: authOnboardingColors.text,
  },
})
