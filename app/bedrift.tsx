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
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { supabase, hentFirma, oppdaterFirma, lastOppLogo, loggUt } from '../lib/supabase'
import { getCachedFirma, setCachedFirma } from '../lib/firmaCache'
import { hentAutoPaminnelserEnabled, setAutoPaminnelserEnabled } from '../lib/paminnelseInnstillinger'
import { tjenesterForKategori } from '../constants/tjenester'
import type { Firma } from '../types'
import ToastMessage from '../components/ToastMessage'
import Onboarding from '../components/Onboarding'
import { getFloatingTabBarPadding } from '../components/FloatingTabBar'
import AppBackground from '../components/AppBackground'

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

export default function BedriftScreen() {
  const router = useRouter()
  const { demoOnboarding } = useLocalSearchParams<{ demoOnboarding?: string | string[] }>()
  const insets = useSafeAreaInsets()
  const cachedFirma = getCachedFirma()
  const visDemoOnboarding = Array.isArray(demoOnboarding)
    ? demoOnboarding.includes('1') || demoOnboarding.includes('true')
    : demoOnboarding === '1' || demoOnboarding === 'true'

  const [firma, setFirma] = useState<Firma | null>(cachedFirma)
  const [laster, setLaster] = useState(true)
  const [userId, setUserId] = useState('')
  const [visModal, setVisModal] = useState(false)
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error',
  })

  const [automatiskePaminnelser, setAutomatiskePaminnelser] = useState(false)
  const [epostVarsler, setEpostVarsler] = useState(true)
  const [søkeTekst, setSøkeTekst] = useState('')
  const [søkeAktiv, setSøkeAktiv] = useState(false)
  const [redigerPrisModal, setRedigerPrisModal] = useState<'timepris' | 'paslag' | null>(null)
  const [prisInput, setPrisInput] = useState('')

  const scrollViewRef = useRef<ScrollView>(null)
  const alleTjenester = firma?.tjenester ?? []
  const aktiveTjenester = normaliserAktiveTjenester(firma)

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

  const filtrerteTjenester = useMemo(() => {
    if (!søkeTekst.trim()) return []
    const q = søkeTekst.toLowerCase()
    const pool = tjenesterForKategori(firma?.fagkategori)
    return pool.filter(
      t => t.toLowerCase().includes(q) && !(firma?.tjenester ?? []).includes(t)
    )
  }, [søkeTekst, firma?.tjenester, firma?.fagkategori])

  const lastData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setFirmaOgCache(null)
        return
      }
      setUserId(session.user.id)
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

  function visToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, message, type })
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

  async function leggTilTjeneste(tjeneste: string) {
    if (!userId || !firma || !tjeneste.trim()) return
    const gjeldende = firma.tjenester ?? []
    if (gjeldende.includes(tjeneste)) return
    if (gjeldende.length >= MAX_TJENESTER) {
      visToast(`Du kan maks ha ${MAX_TJENESTER} tjenester i listen`, 'error')
      return
    }
    const oppdaterte = [...gjeldende, tjeneste]
    const oppdaterteAktive =
      aktiveTjenester.length < MAX_AKTIVE_TJENESTER
        ? [...aktiveTjenester, tjeneste]
        : aktiveTjenester
    try {
      await oppdaterFirma(userId, {
        tjenester: oppdaterte,
        aktiveTjenester: oppdaterteAktive,
      })
      setFirmaOgCache(f =>
        f ? { ...f, tjenester: oppdaterte, aktiveTjenester: oppdaterteAktive } : f
      )
    } catch (e) {
      console.error(e)
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
    router.replace('/auth/login')
  }

  if (laster) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#111111" style={styles.loadingIndicator} size="large" />
      </View>
    )
  }

  if (
    visDemoOnboarding ||
    !firma?.fagkategori ||
    firma.fagkategori.trim() === '' ||
    (firma.tjenester?.length ?? 0) === 0
  ) {
    return (
      <Onboarding
        userId={userId}
        firma={firma}
        demoMode={visDemoOnboarding}
        onAvbryt={visDemoOnboarding ? () => router.back() : undefined}
        onFerdig={oppdatert => {
          setFirmaOgCache(oppdatert)
        }}
      />
    )
  }

  const initialer = hentInitialer(firma.firmanavn)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AppBackground />
      <ToastMessage
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
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
            onPress={() => router.back()}
            style={styles.iconButton}
            activeOpacity={0.82}
            accessibilityLabel="Tilbake"
          >
            <Ionicons name="chevron-back" size={20} color="#444444" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Bedrift</Text>

          <TouchableOpacity
            onPress={() => setVisModal(true)}
            style={styles.iconButton}
            activeOpacity={0.82}
            accessibilityLabel="Innstillinger"
          >
            <Ionicons name="settings-outline" size={18} color="#444444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 62,
            paddingBottom: getFloatingTabBarPadding(insets.bottom),
          },
        ]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initialer}</Text>
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

          <View style={styles.searchSection}>
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={16} color="#888888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Søk etter tjeneste..."
                placeholderTextColor="#AAAAAA"
                value={søkeTekst}
                onChangeText={setSøkeTekst}
                onFocus={() => {
                  setSøkeAktiv(true)
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
                }}
                onBlur={() => {
                  if (!søkeTekst) setSøkeAktiv(false)
                }}
                maxLength={30}
                returnKeyType="done"
              />

              {søkeTekst.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    leggTilTjeneste(søkeTekst.trim())
                    setSøkeTekst('')
                    setSøkeAktiv(false)
                    Keyboard.dismiss()
                  }}
                  style={styles.addButton}
                  accessibilityLabel="Legg til tjeneste"
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {søkeAktiv && søkeTekst.length > 0 && filtrerteTjenester.length > 0 ? (
              <View style={styles.searchResults}>
                {filtrerteTjenester.slice(0, 5).map((t, index) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => {
                      leggTilTjeneste(t)
                      setSøkeTekst('')
                      setSøkeAktiv(false)
                      Keyboard.dismiss()
                    }}
                    style={[
                      styles.searchResultRow,
                      index < Math.min(filtrerteTjenester.length, 5) - 1 && styles.searchResultBorder,
                    ]}
                    activeOpacity={0.86}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#111111" />
                    <Text style={styles.searchResultText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
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
          <View style={styles.settingDivider} />
          <SettingRow
            title="E-postvarsler"
            subtitle="Ved nye forespørsler"
            value={epostVarsler}
            onValueChange={setEpostVarsler}
          />
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Standard gyldighet</Text>
              <Text style={styles.settingSubtitle}>14 dager</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888888" />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLoggUt} activeOpacity={0.84}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} activeOpacity={0.84}>
          <Text style={styles.deleteAccountText}>Slett konto</Text>
        </TouchableOpacity>
      </ScrollView>

      <RedigerModal
        visible={visModal}
        onClose={() => setVisModal(false)}
        firma={firma}
        userId={userId}
        onLagret={oppdatert => {
          setFirmaOgCache(oppdatert)
          setVisModal(false)
          visToast('Endringer lagret')
        }}
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
  userId,
  onLagret,
}: {
  visible: boolean
  onClose: () => void
  firma: Firma | null
  userId: string
  onLagret: (f: Firma) => void
}) {
  const [firmanavn, setFirmanavn] = useState(firma?.firmanavn ?? '')
  const [orgNummer, setOrgNummer] = useState(firma?.orgNummer ?? '')
  const [telefon, setTelefon] = useState(firma?.telefon ?? '')
  const [epost, setEpost] = useState(firma?.epost ?? '')
  const [adresse, setAdresse] = useState(firma?.adresse ?? '')
  const [poststed, setPoststed] = useState(firma?.poststed ?? '')
  const [logoUrl, setLogoUrl] = useState(firma?.logoUrl ?? '')
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    if (visible && firma) {
      setFirmanavn(firma.firmanavn ?? '')
      setOrgNummer(firma.orgNummer ?? '')
      setTelefon(firma.telefon ?? '')
      setEpost(firma.epost ?? '')
      setAdresse(firma.adresse ?? '')
      setPoststed(firma.poststed ?? '')
      setLogoUrl(firma.logoUrl ?? '')
    }
  }, [visible, firma])

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
        setLogoUrl(url)
      } catch (e) {
        console.error(e)
      }
    }
  }

  async function lagre() {
    if (!userId) return
    setLagrer(true)
    try {
      await oppdaterFirma(userId, {
        firmanavn,
        orgNummer,
        telefon,
        epost,
        adresse,
        poststed,
        logoUrl,
      })
      onLagret({
        ...(firma ?? { id: '', userId }),
        id: firma?.id ?? '',
        userId,
        firmanavn,
        orgNummer,
        telefon,
        epost,
        adresse,
        poststed,
        logoUrl,
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
      <SafeAreaView style={modalStyles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.flex}
        >
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Bedriftsprofil</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton} activeOpacity={0.82}>
              <Ionicons name="close" size={18} color="#444444" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={modalStyles.logoBox} onPress={velgLogo} activeOpacity={0.86}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={modalStyles.logoImage} />
              ) : (
                <>
                  <Ionicons name="add-outline" size={28} color="#888888" />
                  <Text style={modalStyles.logoText}>Last opp logo</Text>
                </>
              )}
            </TouchableOpacity>

            <FeltInput label="FIRMANAVN" value={firmanavn} onChangeText={setFirmanavn} />
            <FeltInput
              label="ORG.NUMMER"
              value={orgNummer}
              onChangeText={setOrgNummer}
              keyboardType="number-pad"
            />
            <FeltInput
              label="TELEFON"
              value={telefon}
              onChangeText={setTelefon}
              keyboardType="phone-pad"
            />
            <FeltInput
              label="E-POST"
              value={epost}
              onChangeText={setEpost}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FeltInput
              label="ADRESSE"
              value={adresse}
              onChangeText={setAdresse}
              autoCapitalize="words"
            />
            <FeltInput
              label="POSTSTED"
              value={poststed}
              onChangeText={setPoststed}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[modalStyles.saveButton, lagrer && modalStyles.saveButtonDisabled]}
              onPress={lagre}
              disabled={lagrer}
              activeOpacity={0.86}
            >
              {lagrer ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={modalStyles.saveButtonText}>Lagre endringer</Text>
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
    backgroundColor: '#EEF1F6',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#EEF1F6',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#111111',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
    backgroundColor: '#111111',
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#111111',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchResultBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  searchResultText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
    color: '#111111',
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
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
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
  deleteAccountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  deleteAccountText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
})

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F6',
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
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: '#111111',
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
    paddingTop: 84,
    paddingBottom: 40,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  logoText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#888888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldInput: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#111111',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButton: {
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
})
