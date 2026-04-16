import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { hentFirma, hentLokalAuthSession, oppdaterFirma, lastOppLogo, loggUt } from '../lib/supabase'
import { getCachedFirma, setCachedFirma } from '../lib/firmaCache'
import { hentAutoPaminnelserEnabled, setAutoPaminnelserEnabled } from '../lib/paminnelseInnstillinger'
import { tjenesterForKategori } from '../constants/tjenester'
import type { Firma } from '../types'
import ToastMessage from '../components/ToastMessage'
import { getStackScreenScrollBottomPadding } from '../components/FloatingTabBar'
import LeggTilTjenesterModal from '../components/LeggTilTjenesterModal'
import { authOnboardingColors } from '../constants/authOnboardingTheme'

function kapitaliser(s?: string | null) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function hentInitialer(navn?: string | null) {
  if (!navn) return '?'
  return navn
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

const MAX_TJENESTER = 12
const MAX_AKTIVE_TJENESTER = 6
const TJENESTE_SLETT_ANIMASJON = {
  duration: 180,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
}

function normaliserAktiveTjenester(firma: Firma | null): string[] {
  const tjenester = firma?.tjenester ?? []
  const aktiveFraFirma = firma?.aktiveTjenester

  if (aktiveFraFirma !== undefined) {
    return aktiveFraFirma.filter(t => tjenester.includes(t)).slice(0, MAX_AKTIVE_TJENESTER)
  }

  return tjenester.slice(0, MAX_AKTIVE_TJENESTER)
}

function harTekstverdi(verdi?: string | null): boolean {
  return Boolean(verdi?.trim())
}

function erBedriftProfilDetaljerFullfort(firma: Firma | null): boolean {
  if (!firma) return false
  return (
    harTekstverdi(firma.orgNummer) &&
    harTekstverdi(firma.telefon) &&
    harTekstverdi(firma.epost) &&
    harTekstverdi(firma.adresse) &&
    harTekstverdi(firma.poststed)
  )
}

type BedriftProfilDraft = {
  firmanavn: string
  orgNummer: string
  telefon: string
  epost: string
  adresse: string
  poststed: string
  logoUrl: string
}

function byggBedriftProfilDraft(
  firma: Firma | null,
  registreringsEpost?: string
): BedriftProfilDraft {
  const registreringsEpostTrimmet = registreringsEpost?.trim() ?? ''
  const eksisterendeEpost = firma?.epost?.trim() ?? ''

  return {
    firmanavn: firma?.firmanavn ?? '',
    orgNummer: firma?.orgNummer ?? '',
    telefon: firma?.telefon ?? '',
    epost: eksisterendeEpost || registreringsEpostTrimmet,
    adresse: firma?.adresse ?? '',
    poststed: firma?.poststed ?? '',
    logoUrl: firma?.logoUrl ?? '',
  }
}

function erSammeBedriftProfilDraft(a: BedriftProfilDraft, b: BedriftProfilDraft): boolean {
  return (
    a.firmanavn === b.firmanavn &&
    a.orgNummer === b.orgNummer &&
    a.telefon === b.telefon &&
    a.epost === b.epost &&
    a.adresse === b.adresse &&
    a.poststed === b.poststed &&
    a.logoUrl === b.logoUrl
  )
}

export default function BedriftScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const cachedFirma = getCachedFirma()

  const [firma, setFirma] = useState<Firma | null>(cachedFirma)
  const [laster, setLaster] = useState(true)
  const [userId, setUserId] = useState('')
  const [registreringsEpost, setRegistreringsEpost] = useState('')
  const [visModal, setVisModal] = useState(false)
  const [profilDraft, setProfilDraft] = useState<BedriftProfilDraft>(() =>
    byggBedriftProfilDraft(cachedFirma)
  )
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error',
  })

  const [automatiskePaminnelser, setAutomatiskePaminnelser] = useState(false)
  const [visTjenesteSheet, setVisTjenesteSheet] = useState(false)
  const [redigerPrisModal, setRedigerPrisModal] = useState<'timepris' | 'paslag' | null>(null)
  const [prisInput, setPrisInput] = useState('')
  const [hovedLogoLastFeilet, setHovedLogoLastFeilet] = useState(false)

  const logoFeilToastForUrlRef = useRef<string | null>(null)
  const profilDraftRef = useRef(profilDraft)
  const visModalRef = useRef(visModal)
  const sistSynketProfilDraftRef = useRef<BedriftProfilDraft>(byggBedriftProfilDraft(cachedFirma))
  const alleTjenester = firma?.tjenester ?? []
  const aktiveTjenester = normaliserAktiveTjenester(firma)
  const visProfilFullforHint = !erBedriftProfilDetaljerFullfort(firma)
  const tilgjengeligeTjenester = useMemo(
    () => tjenesterForKategori(firma?.fagkategori),
    [firma?.fagkategori]
  )
  const persistertProfilDraft = useMemo(
    () => byggBedriftProfilDraft(firma, registreringsEpost),
    [firma, registreringsEpost]
  )

  function setFirmaOgCache(
    nesteFirma: Firma | null | ((forrige: Firma | null) => Firma | null)
  ) {
    setFirma(forrige => {
      const verdi =
        typeof nesteFirma === 'function'
          ? (nesteFirma as (forrige: Firma | null) => Firma | null)(forrige)
          : nesteFirma
      setCachedFirma(verdi)
      return verdi
    })
  }

  const lastData = useCallback(async () => {
    try {
      const session = await hentLokalAuthSession()
      if (!session) {
        setFirmaOgCache(null)
        setRegistreringsEpost('')
        return
      }
      setUserId(session.user.id)
      setRegistreringsEpost(session.user.email?.trim() ?? '')
      const firmaData = await hentFirma(session.user.id)
      if (firmaData) {
        setFirmaOgCache({
          ...firmaData,
          aktiveTjenester: normaliserAktiveTjenester(firmaData),
        })
      } else {
        setFirmaOgCache(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLaster(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLaster(true)
      void lastData()
    }, [lastData])
  )

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nesteStatus => {
      if (nesteStatus !== 'active') return
      setLaster(true)
      void lastData()
    })

    return () => {
      subscription.remove()
    }
  }, [lastData])

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  useEffect(() => {
    let avbrutt = false
    hentAutoPaminnelserEnabled().then(enabled => {
      if (!avbrutt) {
        setAutomatiskePaminnelser(enabled)
      }
    })
    return () => {
      avbrutt = true
    }
  }, [])

  useEffect(() => {
    void setAutoPaminnelserEnabled(automatiskePaminnelser)
  }, [automatiskePaminnelser])

  useEffect(() => {
    setHovedLogoLastFeilet(false)
    logoFeilToastForUrlRef.current = null
  }, [firma?.logoUrl])

  useEffect(() => {
    profilDraftRef.current = profilDraft
  }, [profilDraft])

  useEffect(() => {
    visModalRef.current = visModal
  }, [visModal])

  useEffect(() => {
    const forrigeSynketDraft = sistSynketProfilDraftRef.current
    const harUlagredeEndringer = !erSammeBedriftProfilDraft(
      profilDraftRef.current,
      forrigeSynketDraft
    )

    sistSynketProfilDraftRef.current = persistertProfilDraft

    if (visModalRef.current && harUlagredeEndringer) {
      return
    }

    setProfilDraft(forrige =>
      erSammeBedriftProfilDraft(forrige, persistertProfilDraft)
        ? forrige
        : persistertProfilDraft
    )
  }, [persistertProfilDraft])

  function visToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, message, type })
  }

  function oppdaterProfilDraft(
    oppdaterer: (forrige: BedriftProfilDraft) => BedriftProfilDraft
  ) {
    setProfilDraft(forrige => oppdaterer(forrige))
  }

  function handterTilbake() {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(tabs)')
  }

  async function fjernTjeneste(tjeneste: string) {
    if (!userId || !firma) return
    const oppdaterte = (firma.tjenester ?? []).filter(t => t !== tjeneste)
    const oppdaterteAktive = aktiveTjenester.filter(t => t !== tjeneste)
    const forrigeFirma = firma

    LayoutAnimation.configureNext(TJENESTE_SLETT_ANIMASJON)
    setFirmaOgCache(f => (f ? { ...f, tjenester: oppdaterte, aktiveTjenester: oppdaterteAktive } : f))

    try {
      await oppdaterFirma(userId, {
        tjenester: oppdaterte,
        aktiveTjenester: oppdaterteAktive,
      })
    } catch (e) {
      console.error(e)
      setFirmaOgCache(forrigeFirma)
    }
  }

  async function leggTilTjeneste(tjeneste: string): Promise<boolean> {
    const trimmetTjeneste = tjeneste.trim()
    if (!userId || !firma || !trimmetTjeneste) return false
    const gjeldende = firma.tjenester ?? []
    if (gjeldende.includes(trimmetTjeneste)) return false
    if (gjeldende.length >= MAX_TJENESTER) {
      visToast(`Du kan maks ha ${MAX_TJENESTER} tjenester i listen`, 'error')
      return false
    }
    const oppdaterte = [...gjeldende, trimmetTjeneste]
    const oppdaterteAktive =
      aktiveTjenester.length < MAX_AKTIVE_TJENESTER
        ? [...aktiveTjenester, trimmetTjeneste]
        : aktiveTjenester
    try {
      await oppdaterFirma(userId, {
        tjenester: oppdaterte,
        aktiveTjenester: oppdaterteAktive,
      })
      setFirmaOgCache(f =>
        f ? { ...f, tjenester: oppdaterte, aktiveTjenester: oppdaterteAktive } : f
      )
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async function toggleAktivTjeneste(tjeneste: string) {
    if (!userId || !firma) return

    const erAktiv = aktiveTjenester.includes(tjeneste)
    const forrigeFirma = firma

    if (erAktiv) {
      const oppdaterteAktive = aktiveTjenester.filter(t => t !== tjeneste)
      setFirmaOgCache(f => (f ? { ...f, aktiveTjenester: oppdaterteAktive } : f))
      try {
        await oppdaterFirma(userId, { aktiveTjenester: oppdaterteAktive })
      } catch (e) {
        console.error(e)
        setFirmaOgCache(forrigeFirma)
      }
      return
    }

    if (aktiveTjenester.length >= MAX_AKTIVE_TJENESTER) {
      visToast(`Du kan kun ha ${MAX_AKTIVE_TJENESTER} aktive tjenester`, 'error')
      return
    }

    const oppdaterteAktive = [...aktiveTjenester, tjeneste]
    setFirmaOgCache(f => (f ? { ...f, aktiveTjenester: oppdaterteAktive } : f))
    try {
      await oppdaterFirma(userId, { aktiveTjenester: oppdaterteAktive })
    } catch (e) {
      console.error(e)
      setFirmaOgCache(forrigeFirma)
    }
  }

  useEffect(() => {
    if (!firma) return

    const nesteAktive = normaliserAktiveTjenester(firma)
    const gjeldendeAktive = firma.aktiveTjenester ?? []

    if (
      nesteAktive.length !== gjeldendeAktive.length ||
      nesteAktive.some((t, index) => t !== gjeldendeAktive[index])
    ) {
      setFirmaOgCache(f => (f ? { ...f, aktiveTjenester: nesteAktive } : f))
    }
  }, [firma])

  async function lagrePris() {
    if (!userId || !redigerPrisModal) return
    const verdi = Number(prisInput)
    if (isNaN(verdi)) return
    try {
      if (redigerPrisModal === 'timepris') {
        await oppdaterFirma(userId, { timepris: verdi })
        setFirmaOgCache(f => (f ? { ...f, timepris: verdi } : f))
      } else {
        await oppdaterFirma(userId, { materialPaslag: verdi })
        setFirmaOgCache(f => (f ? { ...f, materialPaslag: verdi } : f))
      }
      setRedigerPrisModal(null)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleLoggUt() {
    await loggUt()
    router.replace('/auth')
  }

  if (laster) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#111111" style={styles.loadingIndicator} size="large" />
      </View>
    )
  }

  if (!firma) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#111111" style={styles.loadingIndicator} size="large" />
      </View>
    )
  }

  const initialer = hentInitialer(firma.firmanavn)
  const logoUri = firma.logoUrl?.trim() ?? ''
  const visHovedLogo =
    Boolean(logoUri && /^https?:\/\//i.test(logoUri) && !hovedLogoLastFeilet)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ToastMessage
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        layoutPreset="stack"
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View pointerEvents="none" style={styles.headerFrost}>
          <BlurView
            intensity={72}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.headerTint} />
        </View>

        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={handterTilbake}
            style={[styles.iconButton, styles.backButtonHeader]}
            activeOpacity={0.82}
            accessibilityLabel="Tilbake"
          >
            <Ionicons name="chevron-back" size={20} color="#444444" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Bedrift</Text>

          <View style={styles.settingsActionWrap}>
            {visProfilFullforHint ? (
              <TouchableOpacity
                onPress={() => setVisModal(true)}
                style={styles.profilHintPill}
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityLabel="Fullfør profilen"
              >
                <Text style={styles.profilHintPillLabel}>Fullfør profilen</Text>
                <Ionicons
                  name="settings-outline"
                  size={14}
                  color="#FFFFFF"
                  style={styles.profilHintGear}
                />
              </TouchableOpacity>
            ) : null}
            {!visProfilFullforHint ? (
              <TouchableOpacity
                onPress={() => setVisModal(true)}
                style={styles.iconButton}
                activeOpacity={0.82}
                accessibilityLabel="Innstillinger"
              >
                <Ionicons name="settings-outline" size={18} color="#444444" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 62,
            paddingBottom: getStackScreenScrollBottomPadding(insets.bottom),
          },
        ]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            {visHovedLogo ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.avatarImage}
                resizeMode="cover"
                accessibilityLabel="Firmalogo"
                onError={() => {
                  console.warn('[bedrift] Logo visning feilet (hovedside):', firma.logoUrl)
                  setHovedLogoLastFeilet(true)
                  const u = firma.logoUrl ?? ''
                  if (logoFeilToastForUrlRef.current !== u) {
                    logoFeilToastForUrlRef.current = u
                    visToast('Logo ble lagret, men kunne ikke vises ennå.', 'error')
                  }
                }}
              />
            ) : (
              <Text style={styles.avatarInitials}>{initialer}</Text>
            )}
          </View>
          <Text style={styles.companyName}>{firma.firmanavn}</Text>
          <Text style={styles.companyMeta}>
            {kapitaliser(firma.fagkategori)}
            {firma.orgNummer ? ` · Org.nr ${firma.orgNummer}` : ''}
          </Text>
        </View>

        <View style={styles.priceGrid}>
          <View style={styles.metricCard}>
            <TouchableOpacity
              style={styles.metricEdit}
              onPress={() => {
                setPrisInput((firma.timepris ?? 950).toString())
                setRedigerPrisModal('timepris')
              }}
              activeOpacity={0.82}
              accessibilityLabel="Rediger timepris"
            >
              <Ionicons name="pencil-outline" size={15} color="#888888" />
            </TouchableOpacity>

            <Text style={styles.metricLabel}>Timepris</Text>
            {redigerPrisModal === 'timepris' ? (
              <TextInput
                style={styles.metricInput}
                value={prisInput}
                onChangeText={setPrisInput}
                keyboardType="number-pad"
                autoFocus
                onBlur={lagrePris}
                onSubmitEditing={lagrePris}
              />
            ) : (
              <Text style={styles.metricValue}>{firma.timepris ?? 950} kr/t</Text>
            )}
          </View>

          <View style={styles.metricCard}>
            <TouchableOpacity
              style={styles.metricEdit}
              onPress={() => {
                setPrisInput((firma.materialPaslag ?? 15).toString())
                setRedigerPrisModal('paslag')
              }}
              activeOpacity={0.82}
              accessibilityLabel="Rediger materialpåslag"
            >
              <Ionicons name="pencil-outline" size={15} color="#888888" />
            </TouchableOpacity>

            <Text style={styles.metricLabel}>Materialpåslag</Text>
            {redigerPrisModal === 'paslag' ? (
              <TextInput
                style={styles.metricInput}
                value={prisInput}
                onChangeText={setPrisInput}
                keyboardType="number-pad"
                autoFocus
                onBlur={lagrePris}
                onSubmitEditing={lagrePris}
              />
            ) : (
              <Text style={styles.metricValue}>{firma.materialPaslag ?? 15}%</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Tjenester</Text>
        </View>

        <View style={styles.servicesCard}>
          {alleTjenester.map((t, index) => {
            const erAktiv = aktiveTjenester.includes(t)

            return (
              <TouchableOpacity
                key={t}
                onPress={() => toggleAktivTjeneste(t)}
                activeOpacity={0.86}
                style={[
                  styles.serviceRow,
                  index < alleTjenester.length - 1 && styles.serviceRowBorder,
                ]}
              >
                <View style={styles.serviceLeft}>
                  <View style={[styles.checkbox, erAktiv ? styles.checkboxActive : styles.checkboxInactive]}>
                    {erAktiv ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={[styles.serviceText, erAktiv ? styles.serviceTextActive : styles.serviceTextInactive]}>
                    {t}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => fjernTjeneste(t)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityLabel={`Slett ${t}`}
                >
                  <Ionicons name="trash-outline" size={18} color="#CC3333" />
                </TouchableOpacity>
              </TouchableOpacity>
            )
          })}

          <View style={styles.addServicesSection}>
            <TouchableOpacity
              onPress={() => setVisTjenesteSheet(true)}
              style={styles.addServicesButton}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Legg til tjenester"
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.addServicesButtonText}>Legg til tjenester</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Innstillinger</Text>
        </View>

        <View style={styles.settingsCard}>
          <SettingRow
            title="Automatiske påminnelser"
            subtitle="Dag 3 og dag 7"
            value={automatiskePaminnelser}
            onValueChange={setAutomatiskePaminnelser}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLoggUt} activeOpacity={0.84}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>
      </ScrollView>

      <RedigerModal
        visible={visModal}
        onClose={() => setVisModal(false)}
        firma={firma}
        draft={profilDraft}
        userId={userId}
        onDraftChange={oppdaterProfilDraft}
        onBrukerMerknad={visToast}
        onLagret={oppdatert => {
          const nesteDraft = byggBedriftProfilDraft(oppdatert, registreringsEpost)
          sistSynketProfilDraftRef.current = nesteDraft
          setProfilDraft(nesteDraft)
          setFirmaOgCache(oppdatert)
          setVisModal(false)
          visToast('Endringer lagret')
        }}
      />
      <LeggTilTjenesterModal
        visible={visTjenesteSheet}
        onClose={() => setVisTjenesteSheet(false)}
        tilgjengeligeTjenester={tilgjengeligeTjenester}
        valgteTjenester={alleTjenester}
        maxTjenester={MAX_TJENESTER}
        onAddService={leggTilTjeneste}
      />
    </SafeAreaView>
  )
}

function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string
  subtitle: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#CCCCCC', true: '#111111' }}
        thumbColor="#FFFFFF"
      />
    </View>
  )
}

function RedigerModal({
  visible,
  onClose,
  firma,
  draft,
  userId,
  onDraftChange,
  onLagret,
  onBrukerMerknad,
}: {
  visible: boolean
  onClose: () => void
  firma: Firma | null
  draft: BedriftProfilDraft
  userId: string
  onDraftChange: (oppdaterer: (forrige: BedriftProfilDraft) => BedriftProfilDraft) => void
  onLagret: (f: Firma) => void
  onBrukerMerknad?: (message: string, type: 'success' | 'error') => void
}) {
  const [lagrer, setLagrer] = useState(false)
  const logoForhandsvisningFeiletForUrlRef = useRef<string | null>(null)

  useEffect(() => {
    logoForhandsvisningFeiletForUrlRef.current = null
  }, [draft.logoUrl])

  async function velgLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0] && userId) {
      try {
        const url = await lastOppLogo(result.assets[0].uri, userId)
        onDraftChange(forrige => ({ ...forrige, logoUrl: url }))
      } catch (e) {
        console.error('[bedrift] Logo-opplasting feilet:', e)
        onBrukerMerknad?.('Kunne ikke laste opp logo. Prøv igjen.', 'error')
      }
    }
  }

  async function lagre() {
    if (!userId) return
    setLagrer(true)
    try {
      await oppdaterFirma(userId, {
        firmanavn: draft.firmanavn,
        orgNummer: draft.orgNummer,
        telefon: draft.telefon,
        epost: draft.epost,
        adresse: draft.adresse,
        poststed: draft.poststed,
        logoUrl: draft.logoUrl,
      })
      onLagret({
        ...(firma ?? { id: '', userId }),
        id: firma?.id ?? '',
        userId,
        firmanavn: draft.firmanavn,
        orgNummer: draft.orgNummer,
        telefon: draft.telefon,
        epost: draft.epost,
        adresse: draft.adresse,
        poststed: draft.poststed,
        logoUrl: draft.logoUrl,
        timepris: firma?.timepris,
        materialPaslag: firma?.materialPaslag,
        fagkategori: firma?.fagkategori,
        tjenester: firma?.tjenester,
        aktiveTjenester: firma?.aktiveTjenester,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLagrer(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.flex}
        >
          <View style={modalStyles.header}>
            <View style={modalStyles.headerSideSpacer} />
            <Text style={modalStyles.title}>Bedriftsprofil</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton} activeOpacity={0.82}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content} showsVerticalScrollIndicator={false}>
            <View style={modalStyles.logoSection}>
              <TouchableOpacity style={modalStyles.logoBox} onPress={velgLogo} activeOpacity={0.86}>
                {draft.logoUrl ? (
                  <Image
                    source={{ uri: draft.logoUrl }}
                    style={modalStyles.logoImage}
                    resizeMode="cover"
                    onError={() => {
                      console.warn(
                        '[bedrift] Logo forhåndsvisning feilet (modal):',
                        draft.logoUrl
                      )
                      if (logoForhandsvisningFeiletForUrlRef.current !== draft.logoUrl) {
                        logoForhandsvisningFeiletForUrlRef.current = draft.logoUrl
                        onBrukerMerknad?.(
                          'Logo ble lagret, men kunne ikke vises ennå.',
                          'error'
                        )
                      }
                    }}
                  />
                ) : (
                  <>
                    <Ionicons name="add-outline" size={28} color="#7B818C" />
                    <Text style={modalStyles.logoText}>Legg til logo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={modalStyles.sectionGroup}>
              <Text style={modalStyles.sectionTitle}>Bedriftsinformasjon</Text>
              <FeltInput
                label="Firmanavn"
                value={draft.firmanavn}
                onChangeText={verdi =>
                  onDraftChange(forrige => ({ ...forrige, firmanavn: verdi }))
                }
              />
              <FeltInput
                label="Orgnr"
                value={draft.orgNummer}
                onChangeText={verdi =>
                  onDraftChange(forrige => ({ ...forrige, orgNummer: verdi }))
                }
                keyboardType="number-pad"
              />
              <FeltInput
                label="Bedrift telefon"
                value={draft.telefon}
                onChangeText={verdi =>
                  onDraftChange(forrige => ({ ...forrige, telefon: verdi }))
                }
                keyboardType="phone-pad"
              />
              <FeltInput
                label="Bedrift epost"
                value={draft.epost}
                onChangeText={verdi => onDraftChange(forrige => ({ ...forrige, epost: verdi }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={modalStyles.sectionDividerWrap} pointerEvents="none">
              <LinearGradient
                colors={[
                  'rgba(74,222,128,0)',
                  'rgba(74,222,128,0.05)',
                  'rgba(74,222,128,0.2)',
                  'rgba(74,222,128,0.4)',
                  'rgba(74,222,128,0.2)',
                  'rgba(74,222,128,0.05)',
                  'rgba(74,222,128,0)',
                ]}
                locations={[0, 0.18, 0.38, 0.5, 0.62, 0.82, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={modalStyles.sectionDivider}
              />
            </View>

            <View style={modalStyles.sectionGroup}>
              <Text style={modalStyles.sectionTitle}>Adresseinfo</Text>
              <FeltInput
                label="Bedriftsadresse"
                value={draft.adresse}
                onChangeText={verdi =>
                  onDraftChange(forrige => ({ ...forrige, adresse: verdi }))
                }
                autoCapitalize="words"
              />
              <FeltInput
                label="Poststed"
                value={draft.poststed}
                onChangeText={verdi =>
                  onDraftChange(forrige => ({ ...forrige, poststed: verdi }))
                }
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[modalStyles.saveButton, lagrer && modalStyles.saveButtonDisabled]}
              onPress={lagre}
              disabled={lagrer}
              activeOpacity={0.86}
            >
              {lagrer ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <LinearGradient
                  colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={modalStyles.saveButtonGradient}
                >
                  <Text style={modalStyles.saveButtonText}>Lagre endringer</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

function FeltInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) {
  return (
    <View style={modalStyles.fieldGroup}>
      <Text style={modalStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={modalStyles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        placeholderTextColor="#AAAAAA"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingIndicator: {
    marginTop: 100,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerFrost: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238,241,246,0.1)',
  },
  headerBar: {
    minHeight: 32,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  headerTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#111111',
    textAlign: 'center',
  },
  settingsActionWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backButtonHeader: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  profilHintPill: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.48)',
    backgroundColor: 'rgba(24,100,58,0.96)',
    minHeight: 32,
    paddingHorizontal: 11,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilHintGear: {
    marginTop: -0.25,
  },
  profilHintPillLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DDDFE4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitials: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: '#444444',
  },
  companyName: {
    marginTop: 10,
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: '#111111',
    textAlign: 'center',
  },
  companyMeta: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
    textAlign: 'center',
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  metricEdit: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#888888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
  },
  metricInput: {
    padding: 0,
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: '#111111',
  },
  sectionHeader: {
    paddingTop: 24,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#888888',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  servicesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 4,
    paddingBottom: 12,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1B4332',
  },
  checkboxInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
  },
  serviceText: {
    fontSize: 15,
  },
  serviceTextActive: {
    fontFamily: 'DMSans_500Medium',
    color: '#111111',
  },
  serviceTextInactive: {
    fontFamily: 'DMSans_400Regular',
    color: '#AAAAAA',
  },
  deleteButton: {
    padding: 6,
  },
  addServicesSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  addServicesButton: {
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: authOnboardingColors.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addServicesButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#111111',
  },
  settingSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#111111',
  },
})

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#000000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerSideSpacer: {
    width: 38,
    height: 38,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 92,
    paddingBottom: 24,
  },
  logoSection: {
    marginBottom: 18,
    alignItems: 'center',
  },
  sectionGroup: {
    marginBottom: 14,
  },
  sectionTitle: {
    marginBottom: 10,
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.75,
    textAlign: 'center',
  },
  sectionDividerWrap: {
    marginTop: 2,
    marginBottom: 14,
    marginHorizontal: -6,
  },
  sectionDivider: {
    height: 2,
    borderRadius: 1,
    width: '100%',
  },
  logoBox: {
    width: 124,
    height: 124,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1A1A1C',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  logoImage: {
    width: 124,
    height: 124,
  },
  logoText: {
    marginBottom: 6,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.52)',
  },
  fieldGroup: {
    marginBottom: 11,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 7,
    marginLeft: 6,
  },
  fieldInput: {
    minHeight: 56,
    backgroundColor: '#1A1A1C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 2,
  },
  saveButtonGradient: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
})
