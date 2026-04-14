import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import OnboardingShell from './OnboardingShell'
import { deriveOnboardingStep } from './deriveOnboardingStep'
import { notifyFirmaOppsettEndret } from '../../lib/firmaSetupEvents'
import { hentFirma, oppdaterFirma, opprettFirma } from '../../lib/supabase'
import { tabBarEmitter } from '../../lib/tabBarEmitter'
import { FAGKATEGORIER, TJENESTER_PER_KATEGORI } from '../../lib/fagkategorier'
import { authOnboardingColors, authOnboardingTheme } from '../../constants/authOnboardingTheme'
import type { Firma } from '../../types'

const PLACEHOLDER_FIRMANAVN = 'Min bedrift'

const KATEGORI_IKON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  snekker: 'hammer-outline',
  maler: 'color-palette-outline',
  elektriker: 'flash-outline',
  rorlegger: 'water-outline',
  entreprenor: 'business-outline',
}

type Step = 1 | 2 | 3 | 4 | 5

type Props = {
  userId: string
  firma: Firma | null
  onFerdig: (oppdatertFirma: Firma) => void
}

function ProgressDots({ step, total }: { step: Step; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const active = n === step
        const done = n < step
        return (
          <View
            key={n}
            style={[styles.dot, active && styles.dotActive, done && styles.dotDone]}
          />
        )
      })}
    </View>
  )
}

export default function OnboardingFlow({ userId, firma, onFerdig }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [initialized, setInitialized] = useState(false)
  const slide = useRef(new Animated.Value(0)).current

  const [firmanavn, setFirmanavn] = useState('')
  const [valgtKategori, setValgtKategori] = useState<string | null>(null)
  const [valgteTjenester, setValgteTjenester] = useState<string[]>([])
  const [timeprisStr, setTimeprisStr] = useState('')
  const [materialStr, setMaterialStr] = useState('')
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState('')

  const timeprisInputRef = useRef<TextInput>(null)

  useEffect(() => {
    tabBarEmitter.setVisible(false)
    return () => {
      tabBarEmitter.setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!firma || initialized) return
    const s = deriveOnboardingStep(firma)
    setStep(s)
    const navn = firma.firmanavn?.trim() ?? ''
    setFirmanavn(navn === PLACEHOLDER_FIRMANAVN ? '' : navn)
    setValgtKategori(firma.fagkategori ?? null)
    setValgteTjenester(firma.tjenester ?? [])
    setTimeprisStr(firma.timepris != null && firma.timepris > 0 ? String(firma.timepris) : '')
    setMaterialStr(firma.materialPaslag != null ? String(firma.materialPaslag) : '')
    setInitialized(true)
  }, [firma, initialized])

  useEffect(() => {
    if (step !== 4) return
    const t = setTimeout(() => timeprisInputRef.current?.focus(), 260)
    return () => clearTimeout(t)
  }, [step])

  function animateStep(neste: Step) {
    Animated.timing(slide, {
      toValue: -10,
      duration: 120,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setStep(neste)
      slide.setValue(14)
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    })
  }

  async function nesteFraSteg1() {
    const navn = firmanavn.trim()
    if (!navn) {
      setFeil('Skriv inn firmanavn.')
      return
    }
    setFeil('')
    setLagrer(true)
    try {
      if (!firma?.id) {
        await opprettFirma(userId, navn)
      } else {
        await oppdaterFirma(userId, { firmanavn: navn })
      }
      animateStep(2)
    } catch (e) {
      console.error(e)
      setFeil('Kunne ikke lagre. Prøv igjen.')
    } finally {
      setLagrer(false)
    }
  }

  async function nesteFraSteg2() {
    if (!valgtKategori?.trim()) {
      setFeil('Velg en fagkategori.')
      return
    }
    setFeil('')
    setLagrer(true)
    try {
      await oppdaterFirma(userId, { fagkategori: valgtKategori })
      animateStep(3)
    } catch (e) {
      console.error(e)
      setFeil('Kunne ikke lagre. Prøv igjen.')
    } finally {
      setLagrer(false)
    }
  }

  async function nesteFraSteg3() {
    if (valgteTjenester.length < 1) {
      setFeil('Velg minst én tjeneste.')
      return
    }
    setFeil('')
    setLagrer(true)
    try {
      await oppdaterFirma(userId, {
        tjenester: valgteTjenester,
        aktiveTjenester: valgteTjenester,
      })
      animateStep(4)
    } catch (e) {
      console.error(e)
      setFeil('Kunne ikke lagre. Prøv igjen.')
    } finally {
      setLagrer(false)
    }
  }

  function nesteFraSteg4() {
    const tp = Number(timeprisStr.replace(/\s/g, '')) || 0
    const mp = Number(materialStr.replace(/\s/g, ''))
    if (tp <= 0) {
      setFeil('Oppgi timepris (kr/t).')
      return
    }
    if (materialStr.trim() === '' || Number.isNaN(mp) || mp < 0) {
      setFeil('Oppgi materialpåslag i prosent (0 er lov).')
      return
    }
    setFeil('')
    animateStep(5)
  }

  async function fullfor() {
    const tp = Number(timeprisStr.replace(/\s/g, '')) || 0
    const mp = Number(materialStr.replace(/\s/g, '')) || 0
    const navn = firmanavn.trim()
    setLagrer(true)
    try {
      await oppdaterFirma(userId, {
        firmanavn: navn,
        fagkategori: valgtKategori ?? '',
        tjenester: valgteTjenester,
        aktiveTjenester: valgteTjenester,
        timepris: tp,
        materialPaslag: mp,
      })
      const fersk = await hentFirma(userId)
      if (!fersk) {
        setLagrer(false)
        return
      }
      notifyFirmaOppsettEndret()
      onFerdig(fersk)
    } catch (e) {
      console.error(e)
      setLagrer(false)
      return
    }
    setLagrer(false)
    router.replace('/(tabs)/tilbud')
  }

  function goBack() {
    setFeil('')
    if (step === 1) return
    animateStep((step - 1) as Step)
  }

  const kategoriInfo = FAGKATEGORIER.find(k => k.id === valgtKategori)
  const tjenesteListe = TJENESTER_PER_KATEGORI[valgtKategori ?? ''] ?? []

  function toggleTjeneste(t: string) {
    setValgteTjenester(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={goBack}
        disabled={step === 1}
        activeOpacity={0.75}
      >
        {step > 1 ? (
          <Ionicons name="arrow-back-outline" size={22} color={authOnboardingColors.text} />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </TouchableOpacity>
      <ProgressDots step={step} total={5} />
      <View style={{ width: 44 }} />
    </View>
  )

  return (
    <OnboardingShell header={header} extraScrollHeight={step === 4 ? 160 : 100}>
      <Animated.View style={{ flex: 1, opacity: 1, transform: [{ translateY: slide }] }}>
        {step === 1 && (
          <View style={styles.stepBlock}>
            <Text style={styles.eyebrow}>Steg 1 av 5</Text>
            <Text style={styles.title}>Hva heter firmaet ditt?</Text>
            <Text style={styles.lead}>
              Dette vises til kunder i tilbud og på profilen din. Du kan finpusse detaljer senere under
              Bedrift.
            </Text>
            <Text style={authOnboardingTheme.fieldLabel}>Firmanavn</Text>
            <TextInput
              style={authOnboardingTheme.input}
              value={firmanavn}
              onChangeText={setFirmanavn}
              placeholder="F.eks. Hansen Snekkerverksted AS"
              placeholderTextColor="#A2A8B3"
              autoCapitalize="words"
            />
            {feil ? <Text style={authOnboardingTheme.errorText}>{feil}</Text> : null}
            <TouchableOpacity
              style={[authOnboardingTheme.cta, (lagrer || !firmanavn.trim()) && authOnboardingTheme.ctaDisabled]}
              onPress={() => void nesteFraSteg1()}
              disabled={lagrer || !firmanavn.trim()}
              activeOpacity={0.88}
            >
              {lagrer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={authOnboardingTheme.ctaLabel}>Fortsett</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBlock}>
            <Text style={styles.eyebrow}>Steg 2 av 5</Text>
            <Text style={styles.title}>Hva jobber du med?</Text>
            <Text style={styles.lead}>Velg én hovedkategori — du kan utvide senere.</Text>
            <View style={styles.cardStack}>
              {FAGKATEGORIER.map(k => {
                const valgt = valgtKategori === k.id
                const ikon = KATEGORI_IKON[k.id] ?? 'hammer-outline'
                return (
                  <TouchableOpacity
                    key={k.id}
                    style={[styles.katCard, valgt && styles.katCardActive]}
                    onPress={() => {
                      if (valgtKategori !== k.id) setValgteTjenester([])
                      setValgtKategori(k.id)
                    }}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.katIcon, valgt && styles.katIconActive]}>
                      <Ionicons name={ikon} size={22} color={valgt ? '#fff' : authOnboardingColors.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.katTitle}>{k.navn}</Text>
                      <Text style={styles.katDesc}>{k.beskrivelse}</Text>
                    </View>
                    {valgt ? <Ionicons name="checkmark-circle" size={22} color={authOnboardingColors.cta} /> : null}
                  </TouchableOpacity>
                )
              })}
            </View>
            {feil ? <Text style={authOnboardingTheme.errorText}>{feil}</Text> : null}
            <TouchableOpacity
              style={[authOnboardingTheme.cta, (lagrer || !valgtKategori) && authOnboardingTheme.ctaDisabled]}
              onPress={() => void nesteFraSteg2()}
              disabled={lagrer || !valgtKategori}
              activeOpacity={0.88}
            >
              {lagrer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={authOnboardingTheme.ctaLabel}>Fortsett</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBlock}>
            <Text style={styles.eyebrow}>Steg 3 av 5</Text>
            <Text style={styles.title}>Velg tjenester</Text>
            <Text style={styles.lead}>Marker det du tilbyr. Du kan legge til egne tjenester senere.</Text>
            <View style={styles.cardStack}>
              {tjenesteListe.map(t => {
                const valgt = valgteTjenester.includes(t)
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tjenesteRad, valgt && styles.tjenesteRadActive]}
                    onPress={() => toggleTjeneste(t)}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.tjenesteTxt, valgt && styles.tjenesteTxtActive]}>{t}</Text>
                    <View style={[styles.chk, valgt && styles.chkActive]}>
                      <Ionicons name={valgt ? 'checkmark' : 'add'} size={16} color={valgt ? '#fff' : '#7B818C'} />
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
            {feil ? <Text style={authOnboardingTheme.errorText}>{feil}</Text> : null}
            <TouchableOpacity
              style={[
                authOnboardingTheme.cta,
                (lagrer || valgteTjenester.length < 1) && authOnboardingTheme.ctaDisabled,
              ]}
              onPress={() => void nesteFraSteg3()}
              disabled={lagrer || valgteTjenester.length < 1}
              activeOpacity={0.88}
            >
              {lagrer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={authOnboardingTheme.ctaLabel}>Fortsett</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepBlock}>
            <Text style={styles.eyebrow}>Steg 4 av 5</Text>
            <Text style={styles.title}>Priser</Text>
            <Text style={styles.lead}>Du kan endre dette når som helst under Bedrift.</Text>

            <Text style={[authOnboardingTheme.fieldLabel, { marginTop: 8 }]}>Timepris</Text>
            <View style={styles.priceRow}>
              <TextInput
                ref={timeprisInputRef}
                style={styles.priceInput}
                value={timeprisStr}
                onChangeText={txt => setTimeprisStr(txt.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                keyboardAppearance="light"
                placeholder="950"
                placeholderTextColor="#A2A8B3"
              />
              <Text style={styles.priceSuffix}>kr/t</Text>
            </View>
            <Text style={styles.hint}>{kategoriInfo?.timeprisHint ?? ''}</Text>

            <Text style={[authOnboardingTheme.fieldLabel, { marginTop: 22 }]}>Materialpåslag</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                value={materialStr}
                onChangeText={txt => setMaterialStr(txt.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                keyboardAppearance="light"
                placeholder="15"
                placeholderTextColor="#A2A8B3"
              />
              <Text style={styles.priceSuffix}>%</Text>
            </View>
            <Text style={styles.hint}>Påslag på materialer du kjøper inn (0 % er helt i orden).</Text>

            {feil ? <Text style={[authOnboardingTheme.errorText, { marginTop: 12 }]}>{feil}</Text> : null}
            <TouchableOpacity
              style={[authOnboardingTheme.cta, { marginTop: 20 }]}
              onPress={nesteFraSteg4}
              activeOpacity={0.88}
            >
              <Text style={authOnboardingTheme.ctaLabel}>Fortsett</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepBlock}>
            <View style={styles.completeIcon}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>Alt er klart</Text>
            <Text style={styles.lead}>Dorg er klar til å lage tilbud for deg.</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryKat}>{kategoriInfo?.navn ?? ''}</Text>
                  <Text style={styles.summaryMeta}>
                    {timeprisStr || '—'} kr/t · {materialStr || '—'} % påslag
                  </Text>
                </View>
                <View style={styles.summaryIconBox}>
                  <Ionicons
                    name={KATEGORI_IKON[valgtKategori ?? ''] ?? 'construct-outline'}
                    size={24}
                    color={authOnboardingColors.text}
                  />
                </View>
              </View>
              <View style={styles.divider} />
              {valgteTjenester.map(t => (
                <View key={t} style={styles.svcRow}>
                  <Text style={styles.svcTxt}>{t}</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#2B9A66" />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[authOnboardingTheme.cta, lagrer && authOnboardingTheme.ctaDisabled]}
              onPress={() => void fullfor()}
              disabled={lagrer}
              activeOpacity={0.88}
            >
              {lagrer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={authOnboardingTheme.ctaLabel}>Lag ditt første tilbud</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(17,17,17,0.12)',
  },
  dotActive: {
    width: 22,
    backgroundColor: authOnboardingColors.cta,
  },
  dotDone: {
    backgroundColor: 'rgba(30,58,95,0.35)',
  },
  stepBlock: {
    paddingTop: 8,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  eyebrow: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: authOnboardingColors.textSubtle,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 30,
    lineHeight: 36,
    color: authOnboardingColors.text,
    marginBottom: 10,
  },
  lead: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: authOnboardingColors.textMuted,
    marginBottom: 22,
  },
  cardStack: {
    gap: 10,
    marginBottom: 20,
  },
  katCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: authOnboardingColors.surface,
    borderWidth: 1,
    borderColor: authOnboardingColors.border,
    gap: 12,
  },
  katCardActive: {
    borderColor: authOnboardingColors.cta,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  katIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(17,17,17,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  katIconActive: {
    backgroundColor: authOnboardingColors.cta,
  },
  katTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: authOnboardingColors.text,
  },
  katDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: authOnboardingColors.textMuted,
    marginTop: 2,
  },
  tjenesteRad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: authOnboardingColors.surface,
    borderWidth: 1,
    borderColor: authOnboardingColors.border,
    marginBottom: 8,
  },
  tjenesteRadActive: {
    borderColor: authOnboardingColors.cta,
  },
  tjenesteTxt: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: authOnboardingColors.text,
    paddingRight: 12,
  },
  tjenesteTxtActive: {
    fontFamily: 'DMSans_700Bold',
  },
  chk: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(17,17,17,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: authOnboardingColors.border,
  },
  chkActive: {
    backgroundColor: authOnboardingColors.cta,
    borderColor: authOnboardingColors.cta,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(17,17,17,0.2)',
    paddingBottom: 6,
    minHeight: 56,
  },
  priceInput: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 40,
    lineHeight: 46,
    color: authOnboardingColors.text,
    paddingVertical: 4,
    minHeight: 52,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  priceSuffix: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    color: authOnboardingColors.textSubtle,
    marginLeft: 8,
    marginBottom: 8,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: authOnboardingColors.textMuted,
    marginTop: 10,
  },
  completeIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: authOnboardingColors.cta,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: authOnboardingColors.surface,
    borderWidth: 1,
    borderColor: authOnboardingColors.border,
    marginBottom: 22,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKat: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    color: authOnboardingColors.text,
  },
  summaryMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: authOnboardingColors.textMuted,
    marginTop: 4,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(17,17,17,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: authOnboardingColors.border,
    marginVertical: 14,
  },
  svcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  svcTxt: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: authOnboardingColors.text,
    paddingRight: 8,
  },
})
