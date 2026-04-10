import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Easing,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { oppdaterFirma } from '../lib/supabase'
import { tabBarEmitter } from '../lib/tabBarEmitter'
import { FAGKATEGORIER, TJENESTER_PER_KATEGORI } from '../lib/fagkategorier'
import AppBackground from './AppBackground'
import type { Firma } from '../types'

interface OnboardingProps {
  userId: string
  firma: Firma | null
  onFerdig: (oppdatertFirma: Firma) => void
  demoMode?: boolean
  onAvbryt?: () => void
}

const KATEGORI_IKON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  snekker: 'hammer-outline',
  maler: 'color-palette-outline',
  elektriker: 'flash-outline',
  rorlegger: 'water-outline',
  entreprenor: 'business-outline',
}

const PROGRESS_STEPS = [0, 1, 2, 3] as const
const VELKOMST_IKONER = ['hammer-outline', 'brush-outline', 'flash-outline', 'water-outline'] as const
const OVERGANG_UT_VARIGHET = 140
const OVERGANG_INN_VARIGHET = 220
const OVERGANG_FORSKYVNING = 16
const OVERGANG_MIN_OPACITY = 0
const AUTO_ADVANCE_DELAY = 72
const INTRO_SWIPE_VARIGHET = 320
const SKJERM_BREDDE = Dimensions.get('window').width
const MAX_CONTENT_WIDTH = 460

// ─── Progress-indikator ────────────────────────────────────────────────────────

function ProgressIndikator({ aktivtSteg }: { aktivtSteg: number }) {
  const aktivIndex = aktivtSteg - 1
  return (
    <View style={styles.progressRow}>
      {PROGRESS_STEPS.map(i => {
        const erAktiv = i === aktivIndex
        const erFullfort = i < aktivIndex
        return (
          <View
            key={i}
            style={[
              styles.progressDot,
              erAktiv ? styles.progressDotActive : null,
              erFullfort ? styles.progressDotComplete : null,
            ]}
          />
        )
      })}
    </View>
  )
}

// ─── Onboarding ────────────────────────────────────────────────────────────────

export default function Onboarding({
  userId,
  firma,
  onFerdig,
  demoMode = false,
  onAvbryt,
}: OnboardingProps) {
  const router = useRouter()
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const introSwipeAnim = useRef(new Animated.Value(0)).current
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const introAnimationFrame = useRef<number | null>(null)
  const timeprisInputRef = useRef<TextInput>(null)
  const pendingIntroSteg = useRef<0 | 1 | 2 | 3 | 4 | null>(null)
  const flytendeNesteBottom = Platform.OS === 'ios' ? 332 : 64
  const standardTimepris = '950'
  const standardMaterialPaslag = '15'

  useEffect(() => {
    tabBarEmitter.setVisible(false)
    return () => {
      tabBarEmitter.setVisible(true)
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current)
      }
      if (introAnimationFrame.current !== null) {
        cancelAnimationFrame(introAnimationFrame.current)
      }
    }
  }, [])

  const getInitialSteg = (): 0 | 1 | 2 | 3 | 4 => {
    if (
      firma?.fagkategori &&
      firma.fagkategori.trim() !== '' &&
      (firma.tjenester?.length ?? 0) === 0
    ) {
      return 2
    }
    return 0
  }

  const [aktivtSteg, setAktivtSteg] = useState<0 | 1 | 2 | 3 | 4>(getInitialSteg)
  const [valgtKategori, setValgtKategori] = useState<string | null>(
    demoMode ? null : (firma?.fagkategori ?? null)
  )
  const [valgteTjenester, setValgteTjenester] = useState<string[]>([])
  const [timeprisStr, setTimeprisStr] = useState('')
  const [materialPaslagStr, setMaterialPaslagStr] = useState('')
  const [lagrer, setLagrer] = useState(false)
  const [overgangAktiv, setOvergangAktiv] = useState(false)
  const [introTransitionAktiv, setIntroTransitionAktiv] = useState(false)
  const [introOverlaySynlig, setIntroOverlaySynlig] = useState(false)
  const visFlytendeNesteKnapp = aktivtSteg === 3

  useLayoutEffect(() => {
    if (pendingIntroSteg.current !== aktivtSteg) return

    fadeAnim.setValue(OVERGANG_MIN_OPACITY)
    slideAnim.setValue(OVERGANG_FORSKYVNING)

    introAnimationFrame.current = requestAnimationFrame(() => {
      introAnimationFrame.current = null
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: OVERGANG_INN_VARIGHET,
          easing: Easing.out(Easing.cubic),
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: OVERGANG_INN_VARIGHET,
          easing: Easing.out(Easing.cubic),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        setOvergangAktiv(false)
        if (finished && aktivtSteg === 3) {
          timeprisInputRef.current?.focus()
        }
      })
    })

    pendingIntroSteg.current = null

    return () => {
      if (introAnimationFrame.current !== null) {
        cancelAnimationFrame(introAnimationFrame.current)
        introAnimationFrame.current = null
      }
    }
  }, [aktivtSteg, fadeAnim, slideAnim])

  function byttSteg(nyttSteg: number) {
    if (nyttSteg === aktivtSteg) return
    if (aktivtSteg === 1 && nyttSteg === 0) {
      startKategoriTilIntro()
      return
    }

    setOvergangAktiv(true)
    fadeAnim.stopAnimation()
    slideAnim.stopAnimation()
    if (introAnimationFrame.current !== null) {
      cancelAnimationFrame(introAnimationFrame.current)
      introAnimationFrame.current = null
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: OVERGANG_MIN_OPACITY,
        duration: OVERGANG_UT_VARIGHET,
        easing: Easing.out(Easing.cubic),
        isInteraction: false,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -OVERGANG_FORSKYVNING,
        duration: OVERGANG_UT_VARIGHET,
        easing: Easing.out(Easing.cubic),
        isInteraction: false,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        setOvergangAktiv(false)
        return
      }

      pendingIntroSteg.current = nyttSteg as 0 | 1 | 2 | 3 | 4
      setAktivtSteg(nyttSteg as 0 | 1 | 2 | 3 | 4)
    })
  }

  function startIntroTilKategori() {
    if (introTransitionAktiv) return

    introSwipeAnim.stopAnimation()
    introSwipeAnim.setValue(0)
    setIntroTransitionAktiv(true)
    setIntroOverlaySynlig(true)
    setAktivtSteg(1)

    requestAnimationFrame(() => {
      Animated.timing(introSwipeAnim, {
        toValue: -SKJERM_BREDDE,
        duration: INTRO_SWIPE_VARIGHET,
        easing: Easing.out(Easing.cubic),
        isInteraction: false,
        useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) {
            introSwipeAnim.setValue(0)
            setIntroTransitionAktiv(false)
            setIntroOverlaySynlig(false)
            setAktivtSteg(0)
            return
          }

          setIntroTransitionAktiv(false)
          setIntroOverlaySynlig(false)
        })
    })
  }

  function startKategoriTilIntro() {
    if (introTransitionAktiv) return

    introSwipeAnim.stopAnimation()
    introSwipeAnim.setValue(-SKJERM_BREDDE)
    setIntroOverlaySynlig(true)
    setIntroTransitionAktiv(true)

    requestAnimationFrame(() => {
      Animated.timing(introSwipeAnim, {
        toValue: 0,
        duration: INTRO_SWIPE_VARIGHET,
        easing: Easing.out(Easing.cubic),
        isInteraction: false,
        useNativeDriver: true,
      }).start(({ finished }) => {
        setIntroTransitionAktiv(false)
        if (!finished) {
          setIntroOverlaySynlig(false)
          introSwipeAnim.setValue(0)
          return
        }

        setAktivtSteg(0)
      })
    })
  }

  function velgKategori(kategorId: string) {
    setValgtKategori(kategorId)
    setValgteTjenester([])

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    autoAdvanceTimer.current = setTimeout(() => byttSteg(2), AUTO_ADVANCE_DELAY)
  }

  function toggleTjeneste(t: string) {
    setValgteTjenester(prev => {
      if (prev.includes(t)) {
        return prev.filter(x => x !== t)
      }
      return [...prev, t]
    })
  }

  function nesteSteg2() {
    if (valgteTjenester.length === 0) {
      return
    }

    byttSteg(3)
  }

  function nesteSteg3() {
    byttSteg(4)
  }

  function lukkDemo() {
    if (onAvbryt) {
      onAvbryt()
      return
    }

    router.back()
  }

  async function avsluttOnboarding() {
    const tp = Number(timeprisStr) || 0
    const mp = Number(materialPaslagStr) || 0
    const oppdatertFirma: Firma = {
      id: firma?.id ?? '',
      userId,
      firmanavn: firma?.firmanavn ?? '',
      orgNummer: firma?.orgNummer,
      telefon: firma?.telefon,
      epost: firma?.epost,
      adresse: firma?.adresse,
      poststed: firma?.poststed,
      logoUrl: firma?.logoUrl,
      timepris: tp,
      materialPaslag: mp,
      fagkategori: valgtKategori ?? '',
      tjenester: valgteTjenester,
      aktiveTjenester: valgteTjenester,
    }

    setLagrer(true)
    try {
      await oppdaterFirma(userId, {
        fagkategori: oppdatertFirma.fagkategori,
        tjenester: oppdatertFirma.tjenester,
        aktiveTjenester: oppdatertFirma.aktiveTjenester,
        timepris: oppdatertFirma.timepris,
        materialPaslag: oppdatertFirma.materialPaslag,
      })
    } catch (e) {
      console.error(e)
      return
    } finally {
      setLagrer(false)
    }

    onFerdig({
      ...oppdatertFirma,
    })
    router.replace('/(tabs)/tilbud')
  }

  const kategoriInfo = FAGKATEGORIER.find(k => k.id === valgtKategori)

  // ── STEG 1–4: tre-sone oppsett ─────────────────────────────────────────────

  const kanGåNeste =
    aktivtSteg === 2
      ? valgteTjenester.length > 0
      : true
  const visDemoLukkKnapp = demoMode

  return (
    <View style={styles.root}>
      <AppBackground variant="secondary" />
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {aktivtSteg === 4 ? (
            <View style={styles.headerShell}>
              <View style={styles.headerSingleRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => byttSteg(3)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="arrow-back-outline" size={22} color="#111111" />
                </TouchableOpacity>
              </View>
              {visDemoLukkKnapp ? (
                <View style={styles.headerDismissWrap}>
                  <TouchableOpacity
                    style={styles.demoDismissButton}
                    onPress={lukkDemo}
                    activeOpacity={0.78}
                    accessibilityLabel="Lukk onboarding-demo"
                  >
                    <Ionicons name="close-outline" size={16} color="#181A20" />
                    <Text style={styles.demoDismissLabel}>Lukk demo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.headerShell}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => byttSteg(aktivtSteg - 1)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="arrow-back-outline" size={22} color="#111111" />
                </TouchableOpacity>

                <ProgressIndikator aktivtSteg={aktivtSteg} />

                <View style={styles.backButtonPlaceholder} />
              </View>
              {visDemoLukkKnapp ? (
                <View style={styles.headerDismissWrap}>
                  <TouchableOpacity
                    style={styles.demoDismissButton}
                    onPress={lukkDemo}
                    activeOpacity={0.78}
                    accessibilityLabel="Lukk onboarding-demo"
                  >
                    <Ionicons name="close-outline" size={16} color="#181A20" />
                    <Text style={styles.demoDismissLabel}>Lukk demo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {aktivtSteg !== 0 && (
            <Animated.View
              collapsable={false}
              pointerEvents={overgangAktiv ? 'none' : 'auto'}
              renderToHardwareTextureAndroid={overgangAktiv}
              shouldRasterizeIOS={overgangAktiv}
              style={[
                styles.stepAnimatedContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  aktivtSteg === 1 ? styles.scrollContentCategoryStep : null,
                  aktivtSteg === 2 ? styles.scrollContentServiceStep : null,
                  aktivtSteg === 3 ? styles.scrollContentWithFloatingCta : null,
                  aktivtSteg === 4 ? styles.scrollContentCompletion : null,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {aktivtSteg === 1 && (
                  <View style={[styles.stepShell, styles.categoryStepShell]}>
                    <View style={[styles.stepIntroBlock, styles.categoryStepIntroBlock]}>
                      <Text style={styles.stepEyebrow}>Steg 1</Text>
                      <Text style={styles.stepTitle}>Hva jobber du med?</Text>
                      <Text style={styles.stepSubtitle}>Velg fagkategori</Text>
                    </View>

                    <View style={[styles.optionStack, styles.categoryOptionStack]}>
                      {FAGKATEGORIER.map(k => {
                        const valgt = valgtKategori === k.id
                        const ikon = KATEGORI_IKON[k.id] ?? 'hammer-outline'

                        return (
                          <TouchableOpacity
                            key={k.id}
                            style={[
                              styles.optionCard,
                              styles.categoryOptionCard,
                              valgt ? styles.optionCardActive : null,
                            ]}
                            onPress={() => velgKategori(k.id)}
                            activeOpacity={0.78}
                          >
                            <View style={[styles.optionIconWrap, valgt ? styles.optionIconWrapActive : null]}>
                              <Ionicons
                                name={ikon}
                                size={22}
                                color={valgt ? '#FFFFFF' : '#181A20'}
                              />
                            </View>

                            <View style={[styles.optionCopy, styles.categoryOptionCopy]}>
                              <Text style={styles.optionTitle}>{k.navn}</Text>
                              <Text style={styles.optionDescription}>{k.beskrivelse}</Text>
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )}

                {aktivtSteg === 2 && (
                  <View style={[styles.stepShell, styles.serviceStepShell]}>
                    <View style={styles.stepIntroBlock}>
                      <Text style={styles.stepEyebrow}>Steg 2</Text>
                      <Text style={styles.stepTitle}>Velg dine tjenester</Text>
                      <Text style={styles.stepSubtitle}>
                        Du kan legge til tilpassede tjenester senere.
                      </Text>
                    </View>

                    <View style={[styles.optionStack, styles.serviceOptionStack]}>
                      {(TJENESTER_PER_KATEGORI[valgtKategori ?? ''] ?? []).map(t => {
                        const valgt = valgteTjenester.includes(t)

                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.optionCard, styles.serviceCard, valgt ? styles.optionCardActive : null]}
                            onPress={() => toggleTjeneste(t)}
                            activeOpacity={0.78}
                          >
                            <View style={styles.optionCopy}>
                              <Text style={styles.optionTitle}>{t}</Text>
                            </View>

                            <View style={[styles.optionStatus, valgt ? styles.optionStatusActive : null]}>
                              <Ionicons
                                name={valgt ? 'checkmark' : 'add'}
                                size={16}
                                color={valgt ? '#FFFFFF' : '#7B818C'}
                              />
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>

                    <View style={styles.inlineActionArea}>
                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          styles.introPrimaryButton,
                          !kanGåNeste ? styles.primaryButtonDisabled : null,
                        ]}
                        onPress={nesteSteg2}
                        disabled={!kanGåNeste}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.primaryButtonLabel, styles.introPrimaryButtonLabel]}>
                          Neste
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {aktivtSteg === 3 && (
                  <View style={[styles.stepShell, styles.pricingShell]}>
                    <View style={styles.pricingIntroBlock}>
                      <Text style={styles.stepEyebrow}>Steg 3</Text>
                      <Text style={styles.stepTitle}>Hva tar du betalt?</Text>
                      <Text style={styles.stepSubtitle}>
                        Du kan endre dette på profilsiden din.
                      </Text>
                    </View>

                    <View style={styles.priceFieldsWrap}>
                      <View style={styles.priceFieldBlock}>
                        <Text style={styles.fieldLabel}>TIMEPRIS</Text>
                        <View style={styles.inputRowPlain}>
                          <TextInput
                            ref={timeprisInputRef}
                            style={styles.priceInputPlain}
                            value={timeprisStr}
                            onChangeText={tekst => setTimeprisStr(tekst.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            keyboardAppearance="light"
                            placeholder={standardTimepris}
                            placeholderTextColor="#A2A8B3"
                          />
                          <Text style={styles.inputSuffix}>kr/t</Text>
                        </View>
                        <Text style={styles.fieldHint}>
                          {kategoriInfo?.timeprisHint ?? ''}
                        </Text>
                      </View>

                      <View style={styles.priceFieldSpacer} />

                      <View style={[styles.priceFieldBlock, styles.priceFieldBlockLast]}>
                        <Text style={styles.fieldLabel}>MATERIALPÅSLAG</Text>
                        <View style={styles.inputRowPlain}>
                          <TextInput
                            style={styles.priceInputPlain}
                            value={materialPaslagStr}
                            onChangeText={tekst => setMaterialPaslagStr(tekst.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            keyboardAppearance="light"
                            caretHidden={false}
                            placeholder={standardMaterialPaslag}
                            placeholderTextColor="#A2A8B3"
                          />
                          <Text style={styles.inputSuffix}>%</Text>
                        </View>
                        <Text style={styles.fieldHint}>
                          Påslag på materialer du kjøper inn.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {aktivtSteg === 4 && (
                  <View style={[styles.stepShell, styles.completionShell]}>
                    <View style={styles.completionIconWrap}>
                      <Ionicons name="checkmark" size={34} color="#FFFFFF" />
                    </View>

                    <Text style={styles.completionTitle}>Alt klart!</Text>
                    <Text style={styles.completionSubtitle}>
                      {'Dorg er klar til å lage\ntilbud for deg.'}
                    </Text>

                    <View style={styles.completionCard}>
                      <View style={styles.completionHeader}>
                        <View>
                          <Text style={styles.completionCategoryName}>
                            {kategoriInfo?.navn ?? ''}
                          </Text>
                          <Text style={styles.completionPricingMeta}>
                            {timeprisStr || '950'} kr/t · {materialPaslagStr || '15'}% påslag
                          </Text>
                        </View>

                        <View style={styles.completionCategoryIcon}>
                          <Ionicons
                            name={KATEGORI_IKON[valgtKategori ?? ''] ?? 'construct-outline'}
                            size={26}
                            color="#181A20"
                          />
                        </View>
                      </View>

                      <View style={styles.completionDivider} />

                      {valgteTjenester.map(tjeneste => (
                        <View key={tjeneste} style={styles.completionServiceRow}>
                          <Text style={styles.completionServiceText}>{tjeneste}</Text>
                          <Ionicons name="checkmark-circle" size={16} color="#2B9A66" />
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        styles.introPrimaryButton,
                        lagrer ? styles.primaryButtonDisabled : null,
                      ]}
                      onPress={avsluttOnboarding}
                      disabled={lagrer}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.primaryButtonLabel, styles.introPrimaryButtonLabel]}>
                        Lag ditt første tilbud
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {visFlytendeNesteKnapp && (
        <Animated.View
          collapsable={false}
          pointerEvents="box-none"
          renderToHardwareTextureAndroid={overgangAktiv}
          shouldRasterizeIOS={overgangAktiv}
          style={[
            styles.floatingActionWrap,
            {
              bottom: flytendeNesteBottom,
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryButton, styles.introPrimaryButton, styles.floatingPrimaryButton]}
            onPress={nesteSteg3}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryButtonLabel, styles.introPrimaryButtonLabel]}>
              Neste
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {(aktivtSteg === 0 || introOverlaySynlig) && (
        <Animated.View
          pointerEvents={introTransitionAktiv ? 'none' : 'auto'}
          collapsable={false}
          renderToHardwareTextureAndroid={introTransitionAktiv}
          shouldRasterizeIOS={introTransitionAktiv}
          style={[
            styles.introOverlay,
            {
              zIndex: 10,
              transform: [{ translateX: introSwipeAnim }],
            },
          ]}
        >
          <View style={styles.introRoot}>
            <AppBackground variant="secondary" />
            <SafeAreaView style={styles.introSafeArea} edges={['top', 'bottom']}>
                  <View style={styles.introContent}>
                    {visDemoLukkKnapp ? (
                      <View style={styles.introDismissWrap}>
                        <TouchableOpacity
                          style={styles.demoDismissButton}
                          onPress={lukkDemo}
                          activeOpacity={0.78}
                          accessibilityLabel="Lukk onboarding-demo"
                        >
                          <Ionicons name="close-outline" size={16} color="#181A20" />
                          <Text style={styles.demoDismissLabel}>Lukk demo</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={styles.introTop}>
                      <Text style={styles.introBrand}>DORG</Text>
                      <Text style={styles.introBrandSub}>for håndverkere</Text>
                    </View>

                    <View style={styles.introMiddle}>
                      <View style={styles.introIconRow}>
                        {VELKOMST_IKONER.map(ikon => (
                          <Ionicons key={ikon} name={ikon} size={28} color="#181A20" style={styles.introIcon} />
                        ))}
                      </View>
                      <Text style={styles.introTitle}>
                        {'Hei! La oss sette\nopp profilen din.'}
                      </Text>
                      <Text style={styles.introDescription}>
                        60 sekunder. Ingen skjemaer. Bare et rolig oppsett før du lager første tilbud.
                      </Text>
                    </View>

                <View style={styles.introBottom}>
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.introPrimaryButton]}
                    onPress={startIntroTilKategori}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.primaryButtonLabel, styles.introPrimaryButtonLabel]}>
                      Kom i gang
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: '#EEF1F6',
  },
  keyboardRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerShell: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSingleRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
  headerDismissWrap: {
    position: 'absolute',
    top: 8,
    right: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  demoDismissButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    shadowColor: '#7E8798',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  demoDismissLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 16,
    color: '#181A20',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.12)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    width: 26,
    backgroundColor: '#181A20',
  },
  progressDotComplete: {
    backgroundColor: 'rgba(24,26,32,0.45)',
  },
  stepAnimatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  scrollContentCategoryStep: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 80,
  },
  scrollContentServiceStep: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 80,
  },
  scrollContentWithFloatingCta: {
    paddingBottom: 180,
  },
  scrollContentCompletion: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 72,
  },
  stepShell: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  stepShellCentered: {
    justifyContent: 'center',
    paddingTop: 72,
  },
  categoryStepShell: {
    paddingTop: 0,
  },
  serviceStepShell: {
    paddingTop: 0,
  },
  pricingShell: {
    justifyContent: 'center',
    paddingTop: 32,
  },
  stepIntroBlock: {
    marginBottom: 28,
  },
  categoryStepIntroBlock: {
    marginBottom: 22,
  },
  pricingIntroBlock: {
    marginBottom: 24,
  },
  stepEyebrow: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: '#7B818C',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 32,
    lineHeight: 38,
    color: '#111111',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#596170',
    textAlign: 'center',
    marginTop: 10,
  },
  optionStack: {
    width: '100%',
  },
  categoryOptionStack: {
    width: '88%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  serviceOptionStack: {
    width: '88%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  optionCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    shadowColor: '#7E8798',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  categoryOptionCard: {
    minHeight: 74,
    paddingHorizontal: 16,
  },
  optionCardActive: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(17,17,17,0.82)',
    shadowOpacity: 0.12,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.06)',
  },
  optionIconWrapActive: {
    backgroundColor: '#181A20',
  },
  optionCopy: {
    flex: 1,
    paddingHorizontal: 14,
  },
  categoryOptionCopy: {
    paddingRight: 0,
  },
  optionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: '#111111',
  },
  optionDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#667085',
    marginTop: 4,
  },
  optionStatus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
  },
  optionStatusActive: {
    backgroundColor: '#181A20',
    borderColor: '#181A20',
  },
  serviceCard: {
    minHeight: 68,
  },
  inlineActionArea: {
    paddingTop: 8,
  },
  primaryButton: {
    alignSelf: 'center',
    width: 280,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#111111',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonLeadSpacer: {
    width: 38,
    height: 38,
  },
  primaryButtonLabelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  primaryButtonLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  introPrimaryButton: {
    width: 296,
    borderRadius: 29,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(17,17,17,0.08)',
    shadowColor: '#7E8798',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  introPrimaryButtonLabel: {
    color: '#181A20',
    textAlign: 'center',
  },
  primaryButtonIconShell: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  priceFieldsWrap: {
    width: '100%',
    marginTop: 10,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: '#394150',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  priceFieldBlock: {
    alignSelf: 'center',
    width: '66%',
    maxWidth: 308,
  },
  priceFieldBlockLast: {
    marginBottom: 20,
  },
  priceFieldSpacer: {
    height: 40,
  },
  inputRowPlain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(17,17,17,0.62)',
    paddingBottom: 0,
    marginBottom: 3,
  },
  priceInputPlain: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 42,
    color: '#111111',
    paddingVertical: 0,
    marginBottom: -4,
  },
  inputSuffix: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 20,
    lineHeight: 24,
    color: '#7B818C',
    marginLeft: 8,
  },
  fieldHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#596170',
    marginTop: 2,
  },
  completionShell: {
    alignItems: 'center',
    paddingTop: 0,
  },
  completionIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181A20',
    marginBottom: 22,
    shadowColor: '#111111',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  completionTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 40,
    lineHeight: 44,
    color: '#111111',
    textAlign: 'center',
  },
  completionSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 26,
    color: '#596170',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 26,
  },
  completionCard: {
    width: 296,
    maxWidth: 296,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 22,
    marginTop: 12,
    marginBottom: 26,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#6F7A90',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
    elevation: 4,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionCategoryName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    lineHeight: 28,
    color: '#111111',
  },
  completionPricingMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 21,
    color: '#596170',
    marginTop: 4,
  },
  completionCategoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.06)',
  },
  completionDivider: {
    height: 1,
    backgroundColor: 'rgba(17,17,17,0.08)',
    marginVertical: 16,
  },
  completionServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  completionServiceText: {
    flex: 1,
    paddingRight: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#111111',
  },
  floatingActionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  floatingPrimaryButton: {
    width: 164,
    height: 52,
    borderRadius: 26,
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  introRoot: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  introSafeArea: {
    flex: 1,
  },
  introContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
  },
  introDismissWrap: {
    position: 'absolute',
    top: 8,
    right: 24,
    zIndex: 2,
  },
  introTop: {
    alignItems: 'center',
    paddingTop: 24,
  },
  introBrand: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 38,
    lineHeight: 42,
    color: '#111111',
    letterSpacing: 3,
  },
  introBrandSub: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#7B818C',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  introMiddle: {
    alignItems: 'center',
  },
  introIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  introIcon: {
    marginHorizontal: 10,
    marginVertical: 8,
    opacity: 0.88,
  },
  introTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    lineHeight: 40,
    color: '#111111',
    textAlign: 'center',
  },
  introDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: '#596170',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  introBottom: {
    alignItems: 'center',
  },
  introCopyCard: {
    flexDirection: 'row',
    width: '100%',
  },
})
