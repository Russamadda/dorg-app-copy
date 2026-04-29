import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import {
  hentMaterialKatalogForTjeneste,
  sokMaterialKatalog,
  type MaterialKatalogItem,
} from '../lib/materialForslag'
import {
  beregnMaterialPrisDetaljer,
  beregnTilbudPrisLinjer,
} from '../lib/tilbudPris'
import {
  beregnMaterialLinjeTotal,
  byggMaterialSpesifiseringRad,
  formaterAntall,
  formaterAntallInput,
  formaterBelopInput,
  formaterKr,
  parseAntallInput,
  parseBelopInput,
  summerMaterialSpesifisering,
  type MaterialSpesifiseringRad,
} from '../lib/materialSpesifisering'

type Props = {
  valgtTjeneste: string
  valgtMaterialkostnad: number
  materialPaslag: number
  rader: MaterialSpesifiseringRad[]
  tilbudstekstHarMaterialoversikt: boolean
  onClose: () => void
  onApplyMaterialsum: (brukITilbudstekst: boolean) => void
  onDeleteRow: (id: string) => void
  onSaveRow: (row: MaterialSpesifiseringRad) => void
  onFjernFraTilbudstekst?: () => void
}

function formaterEnhetstittel(enhet: string): string {
  const flertall: Record<string, string> = {
    sekk: 'sekk(er)',
    plate: 'plater',
    spann: 'spann',
    rull: 'ruller',
    boks: 'bokser',
    stk: 'stk',
    pk: 'pk',
    m: 'm',
    'm²': 'm²',
    'm³': 'm³',
  }
  return flertall[enhet.toLowerCase()] ?? enhet
}

type AktivDraft = {
  id: string | null
  materialId: string | null
  navn: string
  enhet: string
  enhetErValgt: boolean
  antall: number
  prisPerEnhet: number
  erEksisterende: boolean
}

const MAX_SEARCH_RESULTS = 6
const MIN_CUSTOM_SEARCH_LENGTH = 2
const CUSTOM_UNIT_OPTIONS = ['stk', 'pk', 'm', 'm²', 'm³', 'spann', 'sekk', 'rull', 'plate', 'boks'] as const

function normaliserTekst(verdi: string): string {
  return verdi
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function quantityStepForUnit(enhet: string): number {
  return enhet === 'm' || enhet === 'm²' || enhet === 'm³' ? 0.5 : 1
}

function roundQuantity(verdi: number, enhet: string): number {
  const step = quantityStepForUnit(enhet)
  if (step === 1) return Math.max(1, Math.round(verdi))
  return Math.max(step, Math.round(verdi / step) * step)
}

function makeDraftFromItem(item: MaterialKatalogItem): AktivDraft {
  return {
    id: null,
    materialId: item.id,
    navn: item.navn,
    enhet: item.enhet,
    enhetErValgt: true,
    antall: quantityStepForUnit(item.enhet),
    prisPerEnhet: 0,
    erEksisterende: false,
  }
}

function makeDraftFromRow(rad: MaterialSpesifiseringRad): AktivDraft {
  return {
    id: rad.id,
    materialId: rad.materialId,
    navn: rad.navn,
    enhet: rad.enhet,
    enhetErValgt: true,
    antall: rad.antall,
    prisPerEnhet: rad.prisPerEnhet,
    erEksisterende: true,
  }
}

function makeCustomDraft(prefill = ''): AktivDraft {
  return {
    id: null,
    materialId: null,
    navn: prefill.trim(),
    enhet: 'stk',
    enhetErValgt: false,
    antall: 1,
    prisPerEnhet: 0,
    erEksisterende: false,
  }
}

function SearchResultRow({
  item,
  onPress,
}: {
  item: MaterialKatalogItem
  onPress: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.resultRow} activeOpacity={0.82}>
      <View style={styles.resultCopy}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.navn}
        </Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {`Pris per ${item.enhet}`}
        </Text>
      </View>
      <View style={styles.resultPlus}>
        <Ionicons name="add" size={16} color="#4ADE80" />
      </View>
    </TouchableOpacity>
  )
}

function MaterialSpesifiseringScreenInner({
  valgtTjeneste,
  valgtMaterialkostnad,
  materialPaslag,
  rader,
  tilbudstekstHarMaterialoversikt,
  onClose,
  onApplyMaterialsum,
  onDeleteRow,
  onSaveRow,
  onFjernFraTilbudstekst,
}: Props) {
  const [søkeTekst, setSøkeTekst] = useState('')
  const [aktivDraft, setAktivDraft] = useState<AktivDraft | null>(null)
  const [antallInput, setAntallInput] = useState('')
  const [visEnhetMeny, setVisEnhetMeny] = useState(false)
  const [visTilbudstekstDialog, setVisTilbudstekstDialog] = useState(false)
  const antallPop = useRef(new Animated.Value(1)).current
  const sokefeltRef = useRef<import('react-native').TextInput>(null)

  const normalisertSok = søkeTekst.trim()
  const katalog = useMemo(
    () => hentMaterialKatalogForTjeneste(valgtTjeneste),
    [valgtTjeneste]
  )
  const søkeresultater = useMemo(
    () => sokMaterialKatalog(normalisertSok, MAX_SEARCH_RESULTS),
    [normalisertSok]
  )
  const harEksaktTreff = useMemo(
    () =>
      katalog.some(item =>
        [item.navn, ...(item.aliases ?? [])].some(verdi => normaliserTekst(verdi) === normaliserTekst(normalisertSok))
      ),
    [katalog, normalisertSok]
  )
  const spesifisertMaterialsum = useMemo(
    () => summerMaterialSpesifisering(rader),
    [rader]
  )
  const spesifisertPrisDetaljer = useMemo(
    () =>
      beregnMaterialPrisDetaljer({
        materialkostnad: spesifisertMaterialsum,
        materialPaslag,
      }),
    [materialPaslag, spesifisertMaterialsum]
  )
  const estimertMaterialprisInklMva = useMemo(
    () =>
      beregnTilbudPrisLinjer({
        timer: 0,
        materialkostnad: valgtMaterialkostnad,
        timepris: 0,
        materialPaslag,
      }).materialerInklMva,
    [materialPaslag, valgtMaterialkostnad]
  )
  const aktivLinjeTotal = aktivDraft
    ? beregnMaterialLinjeTotal(aktivDraft.antall, aktivDraft.prisPerEnhet)
    : 0
  const kanLagreAktiv =
    !!aktivDraft &&
    aktivDraft.navn.trim().length > 0 &&
    aktivDraft.prisPerEnhet > 0 &&
    aktivLinjeTotal > 0
  const kanVelgeCustomEnhet = aktivDraft?.materialId === null

  useEffect(() => {
    setAntallInput(aktivDraft ? formaterAntallInput(aktivDraft.antall) : '')
  }, [aktivDraft])

  useEffect(() => {
    if (!kanVelgeCustomEnhet) {
      setVisEnhetMeny(false)
    }
  }, [kanVelgeCustomEnhet])

  function resetEditor() {
    setAktivDraft(null)
    setVisEnhetMeny(false)
  }

  function åpneFraMaterial(item: MaterialKatalogItem) {
    setAktivDraft(makeDraftFromItem(item))
    setSøkeTekst('')
  }

  function åpneCustom() {
    setAktivDraft(makeCustomDraft(normalisertSok))
    setSøkeTekst('')
  }

  function åpneFraRad(rad: MaterialSpesifiseringRad) {
    setAktivDraft(makeDraftFromRow(rad))
    setSøkeTekst('')
  }

  function oppdaterDraft(felter: Partial<AktivDraft>) {
    setAktivDraft(current => (current ? { ...current, ...felter } : current))
  }

  function velgCustomEnhet(enhet: string) {
    if (!aktivDraft || aktivDraft.materialId !== null) return
    const minsteAntall = quantityStepForUnit(enhet)
    const nesteAntall = roundQuantity(
      Math.max(minsteAntall, aktivDraft.antall || minsteAntall),
      enhet
    )
    oppdaterDraft({ enhet, antall: nesteAntall, enhetErValgt: true })
    setAntallInput(formaterAntallInput(nesteAntall))
    setVisEnhetMeny(false)
  }

  function spillAntallPop() {
    antallPop.stopAnimation()
    antallPop.setValue(1)
    Animated.sequence([
      Animated.timing(antallPop, {
        toValue: 1.12,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(antallPop, {
        toValue: 1,
        friction: 5,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }

  function justerAntall(delta: number) {
    if (!aktivDraft) return
    const nesteAntall = roundQuantity(aktivDraft.antall + delta, aktivDraft.enhet)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    oppdaterDraft({ antall: nesteAntall })
    setAntallInput(formaterAntallInput(nesteAntall))
    spillAntallPop()
  }

  function oppdaterAntall(verdi: string) {
    if (!aktivDraft) return
    const formatert = formaterAntallInput(verdi)
    setAntallInput(formatert)
    oppdaterDraft({ antall: parseAntallInput(formatert) })
  }

  function fullforAntallInput() {
    if (!aktivDraft) return
    const minsteAntall = quantityStepForUnit(aktivDraft.enhet)
    const nesteAntall = roundQuantity(
      Math.max(minsteAntall, parseAntallInput(antallInput) || minsteAntall),
      aktivDraft.enhet
    )
    oppdaterDraft({ antall: nesteAntall })
    setAntallInput(formaterAntallInput(nesteAntall))
  }

  function lagreAktivRad() {
    if (!aktivDraft || !kanLagreAktiv) return

    onSaveRow(
      byggMaterialSpesifiseringRad({
        id: aktivDraft.id ?? undefined,
        materialId: aktivDraft.materialId,
        navn: aktivDraft.navn,
        enhet: aktivDraft.enhet,
        antall: aktivDraft.antall,
        prisPerEnhet: aktivDraft.prisPerEnhet,
      })
    )
    resetEditor()
  }

  function slettRadOgLukk(id: string) {
    if (aktivDraft?.id === id) {
      resetEditor()
    }
    onDeleteRow(id)
  }

  const primærKnappDisabled = rader.length === 0
  const primærKnappTekst = 'Bekreft'

  function bekreftOppdatering() {
    if (!tilbudstekstHarMaterialoversikt) {
      setVisTilbudstekstDialog(true)
    } else {
      // Seksjon allerede i teksten — oppdater stille
      onApplyMaterialsum(true)
    }
  }

  function svarPåTilbudstekstDialog(brukITilbudstekst: boolean) {
    setVisTilbudstekstDialog(false)
    onApplyMaterialsum(brukITilbudstekst)
  }

  return (
    <>
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSideSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Spesifiser kostnader</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss()
            onClose()
          }}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={28}
        keyboardOpeningTime={0}
      >
        <View style={styles.section}>
          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={18} color="#98A2B3" />
            <TextInput
              ref={sokefeltRef}
              style={styles.searchInput}
              placeholder="Søk materiale"
              placeholderTextColor="#7C8795"
              value={søkeTekst}
              onChangeText={setSøkeTekst}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {normalisertSok.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSøkeTekst('')}
                style={styles.clearButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Tøm søk"
              >
                <Ionicons name="close-circle" size={18} color="#98A2B3" />
              </TouchableOpacity>
            ) : null}
          </View>
          {normalisertSok.length > 0 ? (
            <View style={styles.flatList}>
              {søkeresultater.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <SearchResultRow item={item} onPress={() => åpneFraMaterial(item)} />
                </View>
              ))}
              {normalisertSok.length >= MIN_CUSTOM_SEARCH_LENGTH && !harEksaktTreff ? (
                <>
                  {søkeresultater.length > 0 ? <View style={styles.rowDivider} /> : null}
                  <TouchableOpacity onPress={åpneCustom} style={styles.resultRow} activeOpacity={0.82}>
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {`Legg til "${normalisertSok}"`}
                      </Text>
                      <Text style={styles.resultMeta}>Egendefinert materiale</Text>
                    </View>
                    <View style={styles.resultPlus}>
                      <Ionicons name="add" size={16} color="#4ADE80" />
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          ) : null}

          {aktivDraft ? (
            <View style={styles.addPanel}>
              <LinearGradient
                colors={['rgba(0,255,150,0.055)', 'rgba(0,255,150,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addPanelTint}
              />
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderCopy}>
                  <Text
                    style={styles.panelTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.74}
                  >
                    {aktivDraft.navn}
                  </Text>
                </View>
                {kanVelgeCustomEnhet ? (
                  <View style={styles.unitMenuAnchor}>
                    <TouchableOpacity
                      onPress={() => setVisEnhetMeny(current => !current)}
                      activeOpacity={0.82}
                      style={styles.unitTrigger}
                    >
                      <Text style={styles.unitTriggerText}>
                        {aktivDraft.enhetErValgt ? aktivDraft.enhet.toUpperCase() : 'Velg enhet'}
                      </Text>
                      <Ionicons
                        name={visEnhetMeny ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="rgba(255,255,255,0.45)"
                      />
                    </TouchableOpacity>
                    {visEnhetMeny ? (
                      <View style={styles.unitMenu}>
                        {CUSTOM_UNIT_OPTIONS.map(unitOption => {
                          const erValgt = aktivDraft.enhet === unitOption
                          return (
                            <Pressable
                              key={unitOption}
                              onPress={() => velgCustomEnhet(unitOption)}
                              style={({ pressed }) => [
                                styles.unitMenuItem,
                                erValgt && styles.unitMenuItemSelected,
                                pressed && styles.unitMenuItemPressed,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.unitMenuText,
                                  erValgt && styles.unitMenuTextSelected,
                                ]}
                              >
                                {unitOption}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.unitWrap}>
                    <Ionicons name="cube-outline" size={15} color="rgba(255,255,255,0.46)" />
                    <Text style={styles.unitInlineText}>{aktivDraft.enhet}</Text>
                  </View>
                )}
              </View>
              <View style={styles.panelDivider} />

              <View style={styles.editorRow}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{`Pris per ${aktivDraft.enhet}`}</Text>
                  <View style={styles.priceField}>
                    <TextInput
                      style={styles.priceInput}
                      value={formaterBelopInput(aktivDraft.prisPerEnhet)}
                      onChangeText={value =>
                        oppdaterDraft({ prisPerEnhet: parseBelopInput(value) })
                      }
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#6B7280"
                      selectTextOnFocus
                    />
                    <Text style={styles.priceSuffix}>kr</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{formaterEnhetstittel(aktivDraft.enhet)}</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() =>
                        justerAntall(-quantityStepForUnit(aktivDraft.enhet))
                      }
                      style={({ pressed }) => [
                        styles.stepperButton,
                        pressed && styles.stepperButtonPressed,
                      ]}
                    >
                      <Ionicons name="remove" size={16} color="#F3F4F6" />
                    </Pressable>
                    <View style={styles.stepperValueWrap}>
                      <Animated.View style={{ transform: [{ scale: antallPop }] }}>
                        <TextInput
                          style={styles.quantityInput}
                          value={antallInput}
                          onChangeText={oppdaterAntall}
                          onBlur={fullforAntallInput}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                          returnKeyType="done"
                        />
                      </Animated.View>
                    </View>
                    <Pressable
                      onPress={() =>
                        justerAntall(quantityStepForUnit(aktivDraft.enhet))
                      }
                      style={({ pressed }) => [
                        styles.stepperButton,
                        pressed && styles.stepperButtonPressed,
                      ]}
                    >
                      <Ionicons name="add" size={16} color="#F3F4F6" />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.totalSection}>
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Totalt</Text>
                  <Text style={styles.totalValue}>{formaterKr(aktivLinjeTotal)}</Text>
                </View>
                <View style={styles.totalDivider} />
              </View>

              <View style={styles.panelActions}>
                <TouchableOpacity
                  onPress={lagreAktivRad}
                  disabled={!kanLagreAktiv}
                  activeOpacity={0.9}
                  style={styles.panelPrimaryTouch}
                >
                  {kanLagreAktiv ? (
                    <LinearGradient
                      colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.panelPrimaryButton}
                    >
                      <Text style={styles.panelPrimaryText}>
                        {aktivDraft.erEksisterende ? 'Oppdater' : 'Legg til'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.panelPrimaryButton, styles.panelPrimaryButtonDisabled]}>
                      <Text style={styles.panelPrimaryTextDisabled}>
                        {aktivDraft.erEksisterende ? 'Oppdater' : 'Legg til'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={resetEditor}
                  activeOpacity={0.8}
                  style={styles.panelCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Lukk"
                >
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.72)" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          {rader.length > 0 ? (
            <View style={styles.flatList}>
              {rader.map((rad, index) => (
                <View key={rad.id}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <View style={styles.invoiceRow}>
                    <Pressable
                      onPress={() => åpneFraRad(rad)}
                      style={({ pressed }) => [
                        styles.invoicePressable,
                        pressed && styles.invoicePressablePressed,
                      ]}
                    >
                      <View style={styles.invoiceCopy}>
                        <Text style={styles.invoiceTitle} numberOfLines={1}>
                          {rad.navn}
                        </Text>
                        <Text style={styles.invoiceMeta} numberOfLines={1}>
                          {`${formaterAntall(rad.antall)} ${rad.enhet} · ${formaterKr(rad.prisPerEnhet)} pr ${rad.enhet}`}
                        </Text>
                      </View>
                      <Text style={styles.invoiceTotal}>{formaterKr(rad.linjeTotal)}</Text>
                    </Pressable>
                    <TouchableOpacity
                      onPress={() => slettRadOgLukk(rad.id)}
                      style={styles.trashButton}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Slett ${rad.navn}`}
                    >
                      <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.leggTilMaterialButton}
            onPress={() => sokefeltRef.current?.focus()}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color="#aaaaaa" />
            <Text style={styles.leggTilMaterialTekst}>Legg til materiale</Text>
          </TouchableOpacity>
          {tilbudstekstHarMaterialoversikt && onFjernFraTilbudstekst ? (
            <TouchableOpacity
              onPress={onFjernFraTilbudstekst}
              activeOpacity={0.75}
              style={styles.fjernFraInlineButton}
            >
              <Text style={styles.fjernFraTekst}>Fjern fra tilbudstekst</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.footerDock}>
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['rgba(16,46,32,0.94)', 'rgba(6,18,12,0.98)']}
            start={{ x: 0.15, y: 1 }}
            end={{ x: 0.92, y: 0.08 }}
            style={styles.summaryCardGradient}
          />
          <View pointerEvents="none" style={styles.summaryCardGlow} />
          <View style={styles.summaryCardContent}>
            <View style={styles.summaryTopRow}>
              <Text style={styles.summaryTotalLabel}>Materialer inkl. mva</Text>
              <Text
                style={styles.summaryTotalValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {formaterKr(spesifisertPrisDetaljer.materialerInklMva)}
              </Text>
            </View>
            <View style={styles.summaryCardDivider} />
            <View style={styles.summaryDetailRow}>
              <Text style={styles.summaryDetailLabel}>Registrert eks. mva</Text>
              <Text
                style={styles.summaryDetailValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {formaterKr(spesifisertPrisDetaljer.registrertEksMva)}
              </Text>
            </View>
            <View style={styles.summaryDetailRow}>
              <Text style={styles.summaryDetailLabel}>{`Påslag (+${Math.round(materialPaslag)}% Påslag)`}</Text>
              <Text
                style={styles.summaryDetailValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {formaterKr(spesifisertPrisDetaljer.paslagBelop)}
              </Text>
            </View>
            <View style={styles.summaryEstimateRow}>
              <Text style={styles.summaryEstimateLabel}>Nåværende estimat inkl. mva</Text>
              <Text
                style={styles.summaryEstimateValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {formaterKr(estimertMaterialprisInklMva)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={bekreftOppdatering}
          disabled={primærKnappDisabled}
          activeOpacity={0.92}
        >
          {primærKnappDisabled ? (
            <View style={[styles.footerButton, styles.footerButtonDisabled]}>
              <Text style={styles.footerButtonDisabledText}>Bekreft</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.footerButton}
            >
              <Text style={styles.footerButtonText}>{primærKnappTekst}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    <Modal
      visible={visTilbudstekstDialog}
      transparent
      animationType="fade"
      onRequestClose={() => setVisTilbudstekstDialog(false)}
    >
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>Legg til i tilbudsteksten?</Text>
          <Text style={styles.confirmBody}>
            Ønsker du å legge til materialspesifikasjonen i tilbudsteksten?
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              onPress={() => svarPåTilbudstekstDialog(false)}
              activeOpacity={0.85}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>Nei</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => svarPåTilbudstekstDialog(true)}
              activeOpacity={0.85}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>Ja</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  confirmOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#141615',
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
  },
  confirmTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    lineHeight: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  confirmBody: {
    marginTop: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
  },
  confirmActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  confirmButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 19,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  header: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: '#FAFAFA',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  searchField: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#141519',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#F8FAFC',
  },
  leggTilMaterialButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.25)',
    backgroundColor: 'rgba(0, 200, 83, 0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  leggTilMaterialTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#aaaaaa',
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fjernFraInlineButton: {
    alignSelf: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  flatList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(74,222,128,0.16)',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(74,222,128,0.16)',
  },
  resultRow: {
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultCopy: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#F8FAFC',
  },
  resultMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.48)',
  },
  resultPlus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.18)',
  },
  addPanel: {
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,150,0.15)',
    backgroundColor: '#1C1E24',
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
  },
  addPanelTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelHeaderCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  panelTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: '#E8ECF2',
    letterSpacing: -0.3,
    textAlign: 'left',
  },
  unitWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 5,
  },
  unitMenuAnchor: {
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 2,
  },
  unitTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 5,
  },
  unitTriggerText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.58)',
  },
  unitInlineText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 16,
    color: '#D1D6DE',
    textTransform: 'uppercase',
  },
  panelDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: -4,
  },
  unitMenu: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#111318',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  unitMenuItem: {
    minHeight: 38,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#111318',
  },
  unitMenuItemSelected: {
    backgroundColor: 'rgba(74,222,128,0.14)',
  },
  unitMenuItemPressed: {
    opacity: 0.82,
  },
  unitMenuText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 16,
    color: '#D1D6DE',
    textTransform: 'uppercase',
  },
  unitMenuTextSelected: {
    color: '#E9FFF4',
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  fieldBlock: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: '#E8ECF2',
    textAlign: 'center',
  },
  priceField: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#0F1013',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    minHeight: 44,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  priceSuffix: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.48)',
  },
  stepper: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0F1013',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  stepperButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  stepperValueWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stepperValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 20,
    color: '#F8FAFC',
  },
  quantityInput: {
    minWidth: 56,
    paddingVertical: 0,
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 20,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  stepperUnit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.48)',
    textTransform: 'uppercase',
  },
  totalSection: {
    gap: 10,
  },
  totalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: '#E8ECF2',
  },
  totalValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  panelPrimaryTouch: {
    flex: 1,
  },
  panelPrimaryButton: {
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  panelPrimaryButtonDisabled: {
    backgroundColor: '#23262C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  panelPrimaryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 21,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  panelPrimaryTextDisabled: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 21,
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  panelCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoicePressable: {
    flex: 1,
    minHeight: 60,
    paddingVertical: 12,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  invoicePressablePressed: {
    opacity: 0.74,
  },
  invoiceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  invoiceTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#F8FAFC',
  },
  invoiceMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.46)',
  },
  invoiceTotal: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 22,
    color: '#F8FAFC',
    textAlign: 'right',
  },
  trashButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  footerDock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#000000',
  },
  summaryCard: {
    borderRadius: 18,
    minHeight: 96,
    overflow: 'hidden',
    marginBottom: 10,
  },
  summaryCardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  summaryCardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.14,
    elevation: 6,
  },
  summaryCardContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 96,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  summaryTotalLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#E4EBF3',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    paddingBottom: 0,
    transform: [{ translateY: -11 }],
  },
  summaryTotalValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  summaryCardDivider: {
    height: 1,
    backgroundColor: 'rgba(80,255,180,0.08)',
    marginTop: 2,
    marginBottom: 8,
  },
  summaryEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
  },
  summaryDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  summaryDetailLabel: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#D2D8E0',
  },
  summaryDetailValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  summaryEstimateLabel: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#D2D8E0',
    transform: [{ translateY: -2 }],
  },
  summaryEstimateValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  footerButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  footerButtonDisabled: {
    backgroundColor: '#23262C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  footerButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 21,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerButtonDisabledText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    lineHeight: 21,
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  fjernFraTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
})

const MaterialSpesifiseringScreen = memo(MaterialSpesifiseringScreenInner)

export default MaterialSpesifiseringScreen
