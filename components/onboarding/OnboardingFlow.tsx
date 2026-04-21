import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  KeyboardState,
  ReduceMotion,
  useAnimatedKeyboard,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import AuthPrimaryButton from '../auth/AuthPrimaryButton'
import AuthTextField from '../auth/AuthTextField'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'
import { tjenesterForKategori } from '../../constants/tjenester'
import { notifyFirmaOppsettEndret } from '../../lib/firmaSetupEvents'
import { FAGKATEGORIER } from '../../lib/fagkategorier'
import { hentFirma, oppdaterFirma, opprettFirma } from '../../lib/supabase'
import type { Firma } from '../../types'
import { deriveOnboardingStep } from './deriveOnboardingStep'
import OnboardingShell from './OnboardingShell'
import OnboardingStepStage from './OnboardingStepStage'

type Step = 1 | 2 | 3 | 4

type Props = {
  userId: string
  firma: Firma | null
  onFerdig: (oppdatertFirma: Firma) => void
}

const PLACEHOLDER_FIRMANAVN = 'Min bedrift'
const MAX_ACTIVE_TJENESTER = 6

export default function OnboardingFlow({ userId, firma, onFerdig }: Props) {
  const keyboard = useAnimatedKeyboard()
  const hasFirmaRef = useRef(Boolean(firma?.id))
  const initSignaturRef = useRef<string | null>(null)
  const stepCommitFrameRef = useRef<number | null>(null)

  const [step, setStep] = useState<Step>(1)
  const [direction, setDirection] = useState<1 | -1>(1)

  const [firmanavn, setFirmanavn] = useState('')
  const [fagkategori, setFagkategori] = useState<string | null>(null)
  const [tjenester, setTjenester] = useState<string[]>([])
  const [timepris, setTimepris] = useState('')
  const [materialPaslag, setMaterialPaslag] = useState('')

  const [feil, setFeil] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    const initSignatur = `${userId}:${firma?.id ?? 'none'}:${firma?.userId ?? 'none'}`
    if (initSignaturRef.current === initSignatur) {
      return
    }

    if (stepCommitFrameRef.current != null) {
      cancelAnimationFrame(stepCommitFrameRef.current)
      stepCommitFrameRef.current = null
    }

    const nesteSteg = deriveOnboardingStep(firma)
    setStep(nesteSteg)
    setDirection(1)
    hasFirmaRef.current = Boolean(firma?.id)

    const navn = firma?.firmanavn?.trim() ?? ''
    setFirmanavn(navn && navn !== PLACEHOLDER_FIRMANAVN ? navn : '')
    setFagkategori(firma?.fagkategori ?? null)
    setTjenester(firma?.tjenester ?? [])
    setTimepris(firma?.timepris != null && firma.timepris > 0 ? String(firma.timepris) : '')
    setMaterialPaslag(firma?.materialPaslag != null ? String(firma.materialPaslag) : '')
    setFeil(null)
    setLagrer(false)

    initSignaturRef.current = initSignatur
  }, [firma, userId])

  const tilgjengeligeTjenester = useMemo(
    () => tjenesterForKategori(fagkategori).slice(0, 6),
    [fagkategori]
  )
  const valgtKategoriInfo = useMemo(
    () => FAGKATEGORIER.find(kategori => kategori.id === fagkategori) ?? null,
    [fagkategori]
  )

  const flowKeyboardAnimatedStyle = useAnimatedStyle(() => {
    const keyboardVisible =
      keyboard.state.value === KeyboardState.OPEN ||
      keyboard.state.value === KeyboardState.OPENING

    const lift = keyboardVisible && step === 3 ? -84 : 0

    return {
      transform: [
        {
          translateY: withTiming(lift, {
            duration: 170,
            reduceMotion: ReduceMotion.System,
          }),
        },
      ],
    }
  }, [keyboard.state, step])

  async function ensureFirmaExists(navn: string) {
    if (hasFirmaRef.current) {
      return
    }

    await opprettFirma(userId, navn || PLACEHOLDER_FIRMANAVN)
    hasFirmaRef.current = true
  }

  function gåTilSteg(nesteSteg: Step) {
    if (nesteSteg === step) {
      return
    }
    const nesteRetning: 1 | -1 = nesteSteg > step ? 1 : -1
    setDirection(nesteRetning)
    setFeil(null)

    // Viktig: la direction committe på nåværende steg først, slik at exiting-retning blir korrekt.
    if (stepCommitFrameRef.current != null) {
      cancelAnimationFrame(stepCommitFrameRef.current)
    }
    stepCommitFrameRef.current = requestAnimationFrame(() => {
      setStep(nesteSteg)
      stepCommitFrameRef.current = null
    })
  }

  useEffect(() => {
    return () => {
      if (stepCommitFrameRef.current != null) {
        cancelAnimationFrame(stepCommitFrameRef.current)
      }
    }
  }, [])

  async function lagreSteg1() {
    const navn = firmanavn.trim()
    if (!navn) {
      setFeil('Skriv inn firmanavn.')
      return
    }
    if (!fagkategori) {
      setFeil('Velg fagkategori.')
      return
    }

    setFeil(null)
    setLagrer(true)

    try {
      await ensureFirmaExists(navn)
      await oppdaterFirma(userId, {
        firmanavn: navn,
        fagkategori,
      })
      gåTilSteg(2)
    } catch (error) {
      console.error('[onboarding] steg 1 feilet:', error)
      setFeil('Kunne ikke lagre firmaopplysningene. Prøv igjen.')
    } finally {
      setLagrer(false)
    }
  }

  async function lagreSteg2() {
    if (tjenester.length < 1) {
      setFeil('Velg minst én tjeneste.')
      return
    }

    setFeil(null)
    setLagrer(true)

    try {
      await ensureFirmaExists(firmanavn.trim())
      await oppdaterFirma(userId, {
        tjenester,
        aktiveTjenester: tjenester.slice(0, MAX_ACTIVE_TJENESTER),
      })
      gåTilSteg(3)
    } catch (error) {
      console.error('[onboarding] steg 2 feilet:', error)
      setFeil('Kunne ikke lagre tjenestene. Prøv igjen.')
    } finally {
      setLagrer(false)
    }
  }

  function validerPriser(): { gyldig: boolean; tp: number; mp: number } {
    const tp = Number(timepris.replace(/\s/g, '').replace(',', '.'))
    const mp = Number(materialPaslag.replace(/\s/g, '').replace(',', '.'))

    if (!Number.isFinite(tp) || tp <= 0) {
      setFeil('Skriv inn en gyldig timepris.')
      return { gyldig: false, tp: 0, mp: 0 }
    }

    if (!Number.isFinite(mp) || mp < 0 || mp > 500) {
      setFeil('Skriv inn et gyldig materialpåslag.')
      return { gyldig: false, tp, mp: 0 }
    }

    setFeil(null)
    return { gyldig: true, tp: Math.round(tp), mp: Math.round(mp) }
  }

  function nesteFraSteg3() {
    const { gyldig } = validerPriser()
    if (!gyldig) {
      return
    }
    Keyboard.dismiss()
    gåTilSteg(4)
  }

  async function fullforOnboarding() {
    const navn = firmanavn.trim()
    const { gyldig, tp, mp } = validerPriser()

    if (!navn) {
      setFeil('Skriv inn firmanavn.')
      gåTilSteg(1)
      return
    }

    if (!fagkategori) {
      setFeil('Velg fagkategori.')
      gåTilSteg(1)
      return
    }

    if (tjenester.length < 1) {
      setFeil('Velg minst én tjeneste.')
      gåTilSteg(2)
      return
    }

    if (!gyldig) {
      gåTilSteg(3)
      return
    }

    setFeil(null)
    setLagrer(true)

    try {
      await ensureFirmaExists(navn)
      await oppdaterFirma(userId, {
        firmanavn: navn,
        fagkategori,
        tjenester,
        aktiveTjenester: tjenester.slice(0, MAX_ACTIVE_TJENESTER),
        timepris: tp,
        materialPaslag: mp,
      })

      const oppdatertFirma = await hentFirma(userId)
      if (!oppdatertFirma) {
        throw new Error('Mangler firma etter onboarding')
      }

      notifyFirmaOppsettEndret()
      onFerdig(oppdatertFirma)
    } catch (error) {
      console.error('[onboarding] fullføring feilet:', error)
      setFeil('Kunne ikke fullføre oppsettet. Prøv igjen.')
    } finally {
      setLagrer(false)
    }
  }

  function toggleTjeneste(tjeneste: string) {
    setTjenester(current =>
      current.includes(tjeneste)
        ? current.filter(verdi => verdi !== tjeneste)
        : [...current, tjeneste]
    )
  }

  function renderStep(currentStep: Step) {
    if (currentStep === 1) {
      return (
        <View style={styles.stepLayer}>
          <Text style={[styles.cardTitle, styles.cardTitleAbove]}>Sett opp bedriften</Text>
          <View style={styles.card}>
          <Text style={[styles.cardLead, styles.cardLeadFirstInCard]}>
            Legg inn firmanavn og velg fagkategori.
          </Text>

          <AuthTextField
            label="Firmanavn"
            value={firmanavn}
            onChangeText={text => {
              setFirmanavn(text)
              if (feil) setFeil(null)
            }}
            placeholder="F.eks. Hansen Bygg AS"
            autoCapitalize="words"
          />

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Fagkategori</Text>
            <View style={styles.optionList}>
              {FAGKATEGORIER.map(kategori => {
                const valgt = fagkategori === kategori.id
                return (
                  <Pressable
                    key={kategori.id}
                    style={({ pressed }) => [
                      styles.optionRow,
                      valgt && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => {
                      setFagkategori(kategori.id)
                      setTjenester([])
                      if (feil) setFeil(null)
                    }}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionTitle}>{kategori.navn}</Text>
                      <Text style={styles.optionText}>{kategori.beskrivelse}</Text>
                    </View>
                    <View style={[styles.optionCheck, valgt && styles.optionCheckSelected]}>
                      <Ionicons
                        name={valgt ? 'checkmark' : 'ellipse-outline'}
                        size={18}
                        color={valgt ? '#FFFFFF' : authOnboardingColors.textSubtle}
                      />
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {feil ? <Text style={styles.errorText}>{feil}</Text> : null}
          <AuthPrimaryButton
            label="Neste"
            onPress={() => void lagreSteg1()}
            loading={lagrer}
            disabled={!firmanavn.trim() || !fagkategori}
            style={styles.primaryButton}
          />
        </View>
        </View>
      )
    }

    if (currentStep === 2) {
      return (
        <View style={[styles.stepLayer, styles.stepLayerCentered]}>
          <View style={[styles.cardStack, styles.stepTjenesterLift]}>
            <Text style={[styles.cardTitle, styles.cardTitleAbove]}>Velg tjenester</Text>
            <View style={styles.card}>
          <Text style={[styles.cardLead, styles.cardLeadFirstInCard]}>
            Du kan legge til flere tjenester på profilen din senere.
          </Text>

          <View style={styles.serviceList}>
            {tilgjengeligeTjenester.map(tjeneste => {
              const valgt = tjenester.includes(tjeneste)
              return (
                <Pressable
                  key={tjeneste}
                  style={({ pressed }) => [
                    styles.serviceRow,
                    valgt && styles.serviceRowSelected,
                    pressed && styles.serviceRowPressed,
                  ]}
                  onPress={() => {
                    toggleTjeneste(tjeneste)
                    if (feil) setFeil(null)
                  }}
                >
                  <View style={styles.serviceCopy}>
                    <Text style={[styles.serviceTitle, valgt && styles.serviceTitleSelected]}>
                      {tjeneste}
                    </Text>
                  </View>
                  <View style={[styles.serviceCheck, valgt && styles.serviceCheckSelected]}>
                    <Ionicons
                      name={valgt ? 'checkmark' : 'ellipse-outline'}
                      size={18}
                      color={valgt ? '#FFFFFF' : authOnboardingColors.textSubtle}
                    />
                  </View>
                </Pressable>
              )
            })}
          </View>

          {feil ? <Text style={styles.errorText}>{feil}</Text> : null}
          <AuthPrimaryButton
            label="Neste"
            onPress={() => void lagreSteg2()}
            loading={lagrer}
            disabled={tjenester.length < 1}
            style={styles.primaryButton}
          />
            </View>
            <Text style={[styles.stepQuoteText, styles.stepQuoteTextOutsideCard]}>
              Dette gjør at DORG forstår hva bedriften din faktisk tilbyr,{'\n'}
              slik at nye tilbud blir mer treffsikre fra start.
            </Text>
          </View>
        </View>
      )
    }

    if (currentStep === 3) {
      return (
        <View style={[styles.stepLayer, styles.stepLayerCentered]}>
          <View style={[styles.cardStack, styles.stepPrisgrunnlagLift]}>
            <Text style={[styles.cardTitle, styles.cardTitleAbove]}>Prisgrunnlag</Text>
            <View style={styles.card}>
          <Text style={[styles.cardLead, styles.cardLeadFirstInCard]}>
            Dette kan justeres senere på profilsiden.
          </Text>

          <View style={styles.priceField}>
            <Text style={styles.sectionLabel}>Timepris</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                style={styles.priceInput}
                value={timepris}
                onChangeText={text => {
                  setTimepris(text.replace(/[^0-9,]/g, ''))
                  if (feil) setFeil(null)
                }}
                keyboardType="decimal-pad"
                placeholder="950"
                placeholderTextColor="#8A94A5"
              />
              <Text style={styles.priceSuffix}>kr/t</Text>
            </View>
            <Text style={styles.helperText}>
              Standard timepris for nye tilbud.
            </Text>
          </View>

          <View style={styles.priceField}>
            <Text style={styles.sectionLabel}>Materialpåslag</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                style={styles.priceInput}
                value={materialPaslag}
                onChangeText={text => {
                  setMaterialPaslag(text.replace(/[^0-9,]/g, ''))
                  if (feil) setFeil(null)
                }}
                keyboardType="decimal-pad"
                placeholder="15"
                placeholderTextColor="#8A94A5"
              />
              <Text style={styles.priceSuffix}>%</Text>
            </View>
            <Text style={styles.helperText}>
              Påslag for materialkostnader.
            </Text>
          </View>

          {feil ? <Text style={styles.errorText}>{feil}</Text> : null}
          <AuthPrimaryButton
            label="Neste"
            onPress={nesteFraSteg3}
            disabled={!timepris.trim() || !materialPaslag.trim()}
            style={styles.primaryButton}
          />
            </View>
            <Text style={[styles.stepQuoteText, styles.stepQuoteTextOutsideCard]}>
              Disse verdiene brukes i beregningen av nye tilbud,{'\n'}
              slik at du slipper å starte fra blankt hver gang.
            </Text>
          </View>
        </View>
      )
    }

    return (
      <View style={[styles.stepLayer, styles.stepLayerStep4]}>
        <View style={[styles.cardStack, styles.cardStackNarrow]}>
          <View style={styles.completeHeroAbove}>
            <View style={styles.completeIconLarge}>
              <Ionicons name="checkmark" size={44} color="#FFFFFF" />
            </View>
            <Text style={[styles.cardTitle, styles.cardTitleAbove, styles.completeTitleAbove]}>
              Alt er klart!
            </Text>
          </View>
          <View style={[styles.card, styles.cardSummaryComplete]}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryCompanyName}>{firmanavn}</Text>
            <Text style={styles.summaryCategory}>{valgtKategoriInfo?.navn ?? '—'}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBlock}>
            <Text style={styles.summarySectionTitle}>Tjenester</Text>
            <View style={styles.summaryServiceList}>
              {tjenester.map(tjeneste => (
                <View key={tjeneste} style={styles.summaryServiceRow}>
                  <Text style={styles.summaryServiceText}>{tjeneste}</Text>
                  <Ionicons name="checkmark-circle" size={16} color={authOnboardingColors.cta} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryPriceRow}>
            <View style={styles.summaryPriceCell}>
              <Text style={[styles.summarySectionTitle, styles.summaryPriceHeading]}>Timepris</Text>
              <Text style={[styles.summaryPrimaryValue, styles.summaryPriceValue]}>
                {timepris || '—'} kr/t
              </Text>
            </View>
            <View style={styles.summaryPriceCell}>
              <Text style={[styles.summarySectionTitle, styles.summaryPriceHeading]}>
                Materialpåslag
              </Text>
              <Text style={[styles.summaryPrimaryValue, styles.summaryPriceValue]}>
                {materialPaslag || '—'} %
              </Text>
            </View>
          </View>

          {feil ? <Text style={styles.errorText}>{feil}</Text> : null}
          </View>

          <AuthPrimaryButton
            label="Fullfør profilen og lag ditt første tilbud"
            onPress={() => void fullforOnboarding()}
            loading={lagrer}
            style={styles.completePrimaryButtonBelow}
          />
        </View>
      </View>
    )
  }

  return (
    <OnboardingShell>
      <View style={styles.flowColumn}>
        <View style={styles.hero}>
          <Pressable
            onPress={() => gåTilSteg((Math.max(1, step - 1) as Step))}
            disabled={step === 1 || lagrer}
            accessibilityRole="button"
            style={[styles.backButton, step === 1 && styles.backButtonDisabled]}
          >
            <Ionicons name="arrow-back" size={18} color={authOnboardingColors.text} />
          </Pressable>
          <Text style={styles.progressLabel}>Steg {step} av 4</Text>
          <View style={styles.progressWrap}>
            <View style={styles.progressDots}>
              {[1, 2, 3, 4].map(verdi => {
                const aktiv = verdi === step
                const ferdig = verdi < step
                return (
                  <View
                    key={verdi}
                    style={[styles.progressDot, aktiv && styles.progressDotActive, ferdig && styles.progressDotDone]}
                  />
                )
              })}
            </View>
          </View>
        </View>

        <Animated.View style={[styles.stageFill, flowKeyboardAnimatedStyle]}>
          <OnboardingStepStage
            step={step}
            direction={direction}
            renderStep={renderStep}
          />
        </Animated.View>
      </View>
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  flowColumn: {
    flex: 1,
    minHeight: 0,
    /** Samme som tidligere steg 1 — låser «Steg x av x» + progress på tvers av alle steg. */
    paddingTop: 52,
    paddingBottom: 6,
  },
  stageFill: {
    flex: 1,
    minHeight: 0,
  },
  stepLayer: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  /** Vertikal sentrering av kort i steg 2–3 (tjenester, pris). */
  stepLayerCentered: {
    justifyContent: 'center',
    paddingVertical: 6,
  },
  /** Steg 4 (oppsummering): forankret fra topp så kortet bare vokser nedover. */
  stepLayerStep4: {
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  /** Løfter «Velg tjenester»-tittel + kort litt opp; for stor negativ verdi skjuler tittelen under hero. */
  stepTjenesterLift: {
    marginTop: -96,
  },
  /** Løfter «Prisgrunnlag»-tittel + kort mye opp på skjermen. */
  stepPrisgrunnlagLift: {
    marginTop: -176,
  },
  hero: {
    position: 'relative',
    marginBottom: 12,
    alignItems: 'center',
    minHeight: 68,
    justifyContent: 'flex-start',
  },
  progressWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: -50,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
  },
  backButtonDisabled: {
    opacity: 0,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(17,17,17,0.12)',
  },
  progressDotActive: {
    width: 22,
    backgroundColor: authOnboardingColors.cta,
  },
  progressDotDone: {
    backgroundColor: 'rgba(27,67,50,0.28)',
  },
  progressLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: authOnboardingColors.textMuted,
    marginBottom: 8,
  },
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(27,67,50,0.08)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  cardTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: authOnboardingColors.text,
  },
  /** Tittel over kortet, midtstilt på full bredde. */
  cardTitleAbove: {
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  /** Kort + tittel stablet (full bredde). */
  cardStack: {
    width: '100%',
    alignSelf: 'stretch',
  },
  /** Kun steg 4: bredere blokk ved å bruke litt av shell-padding (tydelig på små skjermer). */
  cardStackNarrow: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  /** Første tekst i kort etter at tittel er flyttet ut. */
  cardLeadFirstInCard: {
    marginTop: 0,
  },
  cardLead: {
    marginTop: 8,
    marginBottom: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: authOnboardingColors.textMuted,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  sectionBlock: {
    marginTop: 0,
  },
  sectionLabel: {
    marginBottom: 8,
    marginLeft: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: authOnboardingColors.text,
  },
  optionList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(132,145,161,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionRowSelected: {
    borderColor: authOnboardingColors.cta,
    backgroundColor: 'rgba(27,67,50,0.05)',
  },
  optionRowPressed: {
    opacity: 0.9,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: authOnboardingColors.text,
  },
  optionText: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: authOnboardingColors.textMuted,
  },
  optionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.05)',
  },
  optionCheckSelected: {
    backgroundColor: authOnboardingColors.cta,
  },
  serviceList: {
    gap: 8,
  },
  serviceRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(132,145,161,0.2)',
  },
  serviceRowSelected: {
    borderColor: authOnboardingColors.cta,
    backgroundColor: 'rgba(27,67,50,0.05)',
  },
  serviceRowPressed: {
    opacity: 0.9,
  },
  serviceCopy: {
    flex: 1,
    paddingRight: 12,
  },
  serviceTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 17,
    color: authOnboardingColors.text,
  },
  serviceTitleSelected: {
    fontFamily: 'DMSans_700Bold',
  },
  serviceCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.05)',
  },
  serviceCheckSelected: {
    backgroundColor: authOnboardingColors.cta,
  },
  priceField: {
    marginBottom: 14,
  },
  priceInputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(132,145,161,0.2)',
    paddingHorizontal: 16,
  },
  priceInput: {
    flex: 1,
    minHeight: 52,
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    color: authOnboardingColors.text,
  },
  priceSuffix: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: authOnboardingColors.textMuted,
  },
  helperText: {
    marginTop: 6,
    marginLeft: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: authOnboardingColors.textMuted,
  },
  stepQuoteText: {
    marginTop: 10,
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    color: 'rgba(27,67,50,0.84)',
    textAlign: 'center',
    alignSelf: 'center',
  },
  stepQuoteTextOutsideCard: {
    marginTop: 18,
    marginBottom: 0,
    maxWidth: 320,
  },
  completeHeroAbove: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  completeIconLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authOnboardingColors.cta,
    marginBottom: 10,
  },
  /** Justerer «Alt er klart!» når den bruker cardTitle + cardTitleAbove. */
  completeTitleAbove: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 22,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(17,17,17,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 14,
  },
  /** Oppsummeringskort steg 4 — ekstra luft i kortet. */
  cardSummaryComplete: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  summaryHeader: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 2,
  },
  summaryCompanyName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: authOnboardingColors.text,
    textAlign: 'center',
  },
  summaryCategory: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 18,
    color: authOnboardingColors.textMuted,
    textAlign: 'center',
  },
  summaryBlock: {
    gap: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(17,17,17,0.08)',
    marginVertical: 10,
  },
  summarySectionTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: authOnboardingColors.textMuted,
  },
  summaryPrimaryValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: authOnboardingColors.text,
  },
  summaryServiceList: {
    gap: 8,
  },
  summaryServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  summaryServiceText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 18,
    color: authOnboardingColors.text,
  },
  summaryPriceRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
    marginTop: 2,
  },
  summaryPriceCell: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  summaryPriceHeading: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  summaryPriceValue: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  errorText: {
    marginTop: 12,
    marginBottom: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: authOnboardingColors.error,
  },
  primaryButton: {
    marginTop: 14,
  },
  /** CTA under oppsummeringskortet (steg 4). */
  completePrimaryButtonBelow: {
    marginTop: 30,
    alignSelf: 'stretch',
  },
})
