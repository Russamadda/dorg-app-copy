import { useEffect, useState } from 'react'
import {
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import {
  supabase,
  hentFirma,
  oppdaterFirma,
  hentPrishistorikk,
  lastOppLogo,
  loggUt,
} from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import type { Firma } from '../../types'
import TopBar from '../../components/TopBar'
import ToastMessage from '../../components/ToastMessage'
import { getFloatingTabBarPadding } from '../../components/FloatingTabBar'

export default function BedriftScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [firma, setFirma] = useState<Firma | null>(null)
  const [laster, setLaster] = useState(true)
  const [userId, setUserId] = useState('')
  const [visModal, setVisModal] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Priser (inline redigering)
  const [redigererTimepris, setRedigererTimepris] = useState(false)
  const [redigererPaslag, setRedigererPaslag] = useState(false)
  const [timeprisVerdi, setTimeprisVerdi] = useState('')
  const [paslagVerdi, setPaslagVerdi] = useState('')

  // Innstillinger
  const [automatiskePaminnelser, setAutomatiskePaminnelser] = useState(false)
  const [epostVarsler, setEpostVarsler] = useState(true)

  async function lastData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)
      const firmaData = await hentFirma(session.user.id)
      if (firmaData) {
        setFirma(firmaData)
        setTimeprisVerdi(firmaData.timepris?.toString() ?? '')
        setPaslagVerdi(firmaData.materialPaslag?.toString() ?? '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLaster(false)
    }
  }

  useEffect(() => { lastData() }, [])

  function visToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, message, type })
  }

  async function lagrePris(felt: 'timepris' | 'paslag') {
    if (!userId) return
    try {
      if (felt === 'timepris') {
        await oppdaterFirma(userId, { timepris: Number(timeprisVerdi) })
        setFirma(f => f ? { ...f, timepris: Number(timeprisVerdi) } : f)
        setRedigererTimepris(false)
      } else {
        await oppdaterFirma(userId, { materialPaslag: Number(paslagVerdi) })
        setFirma(f => f ? { ...f, materialPaslag: Number(paslagVerdi) } : f)
        setRedigererPaslag(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleLoggUt() {
    await loggUt()
    router.replace('/auth/login')
  }

  function hentInitialer(navn: string): string {
    const ord = navn.trim().split(' ')
    if (ord.length >= 2) return (ord[0][0] + ord[1][0]).toUpperCase()
    return navn.slice(0, 2).toUpperCase()
  }

  if (laster) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TopBar />
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <ToastMessage
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: getFloatingTabBarPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Min bedrift</Text>

        {/* ── FIRMAKORT ── */}
        <View style={styles.kort}>
          <View style={styles.firmaRad}>
            {/* Logo sirkel */}
            <View style={styles.logoSirkel}>
              {firma?.logoUrl ? (
                <Image source={{ uri: firma.logoUrl }} style={styles.logoImage} />
              ) : (
                <Text style={styles.initialer}>
                  {hentInitialer(firma?.firmanavn ?? 'D')}
                </Text>
              )}
            </View>

            {/* Info */}
            <View style={styles.firmaInfo}>
              <Text style={styles.firmanavn}>{firma?.firmanavn ?? '–'}</Text>
              <Text style={styles.firmaMeta}>
                {firma?.orgNummer ? `Org. ${firma.orgNummer}` : 'Org. ikke angitt'}
              </Text>
              {firma?.epost ? (
                <Text style={styles.firmaMeta}>{firma.epost}</Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity onPress={() => setVisModal(true)} style={styles.redigerLenke}>
            <Text style={styles.redigerTekst}>Rediger bedriftsprofil →</Text>
          </TouchableOpacity>
        </View>

        {/* ── PRISKORT ── */}
        <View style={[styles.kort, { marginTop: 12 }]}>
          <Text style={styles.kortTittel}>Priser</Text>
          <View style={styles.prisRad}>
            {/* Timepris */}
            <TouchableOpacity
              style={styles.prisKolonne}
              onPress={() => setRedigererTimepris(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.prisLabel}>TIMEPRIS</Text>
              {redigererTimepris ? (
                <TextInput
                  style={styles.prisInput}
                  value={timeprisVerdi}
                  onChangeText={setTimeprisVerdi}
                  keyboardType="number-pad"
                  autoFocus
                  onBlur={() => lagrePris('timepris')}
                  onSubmitEditing={() => lagrePris('timepris')}
                />
              ) : (
                <Text style={styles.prisVerdi}>{timeprisVerdi || '–'} kr/t</Text>
              )}
            </TouchableOpacity>

            <View style={styles.prisDivider} />

            {/* Materialpåslag */}
            <TouchableOpacity
              style={styles.prisKolonne}
              onPress={() => setRedigererPaslag(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.prisLabel}>MATERIALPÅSLAG</Text>
              {redigererPaslag ? (
                <TextInput
                  style={styles.prisInput}
                  value={paslagVerdi}
                  onChangeText={setPaslagVerdi}
                  keyboardType="number-pad"
                  autoFocus
                  onBlur={() => lagrePris('paslag')}
                  onSubmitEditing={() => lagrePris('paslag')}
                />
              ) : (
                <Text style={styles.prisVerdi}>{paslagVerdi || '–'}%</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── INNSTILLINGER ── */}
        <View style={[styles.innstillingerKort, { marginTop: 12 }]}>
          <View style={[styles.innstillingRad, styles.radBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.innstillingNavn}>Automatiske påminnelser</Text>
              <Text style={styles.innstillingBeskrivelse}>Dag 3 og dag 7</Text>
            </View>
            <Switch
              value={automatiskePaminnelser}
              onValueChange={setAutomatiskePaminnelser}
              trackColor={{ false: Colors.surfaceBorder, true: Colors.accent }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.innstillingRad, styles.radBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.innstillingNavn}>E-postvarsler</Text>
              <Text style={styles.innstillingBeskrivelse}>Ved nye forespørsler</Text>
            </View>
            <Switch
              value={epostVarsler}
              onValueChange={setEpostVarsler}
              trackColor={{ false: Colors.surfaceBorder, true: Colors.accent }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.innstillingRad}>
            <Text style={styles.innstillingNavn}>Standard gyldighet</Text>
            <TouchableOpacity>
              <Text style={styles.innstillingVerdi}>14 dager ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── LOGG UT ── */}
        <TouchableOpacity style={styles.loggUtKnapp} onPress={handleLoggUt}>
          <View style={styles.loggUtInner}>
            <Text style={styles.loggUtTekst}>Logg ut</Text>
          </View>
        </TouchableOpacity>

        {/* ── SLETT KONTO ── */}
        <TouchableOpacity style={styles.slettKonto}>
          <Text style={styles.slettKontoTekst}>Slett konto</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── REDIGER MODAL ── */}
      <RedigerModal
        visible={visModal}
        onClose={() => setVisModal(false)}
        firma={firma}
        userId={userId}
        onLagret={(oppdatert) => {
          setFirma(oppdatert)
          setVisModal(false)
          visToast('Endringer lagret')
        }}
      />
    </SafeAreaView>
  )
}

// ─── Rediger Modal ────────────────────────────────────────────────────────────

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      await oppdaterFirma(userId, { firmanavn, orgNummer, telefon, epost, adresse, poststed, logoUrl })
      onLagret({
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
          style={{ flex: 1 }}
        >
          <View style={modalStyles.header}>
            <Text style={modalStyles.tittel}>Bedriftsprofil</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.lukkTekst}>Lukk</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content}>
            {/* Logo */}
            <TouchableOpacity style={modalStyles.logoBoks} onPress={velgLogo}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={modalStyles.logoImage} />
              ) : (
                <>
                  <Ionicons name="add-outline" size={28} color={Colors.textMuted} />
                  <Text style={modalStyles.logoTekst}>Last opp logo</Text>
                </>
              )}
            </TouchableOpacity>

            <FeltInput label="FIRMANAVN" value={firmanavn} onChangeText={setFirmanavn} />
            <FeltInput label="ORG.NUMMER" value={orgNummer} onChangeText={setOrgNummer} keyboardType="number-pad" />
            <FeltInput label="TELEFON" value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" />
            <FeltInput label="E-POST" value={epost} onChangeText={setEpost} keyboardType="email-address" autoCapitalize="none" />
            <FeltInput label="ADRESSE" value={adresse} onChangeText={setAdresse} autoCapitalize="words" />
            <FeltInput label="POSTSTED" value={poststed} onChangeText={setPoststed} autoCapitalize="words" />

            <TouchableOpacity
              style={[modalStyles.lagreKnapp, lagrer && { opacity: 0.7 }]}
              onPress={lagre}
              disabled={lagrer}
            >
              {lagrer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.lagreKnappTekst}>Lagre endringer</Text>
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
    <View style={modalStyles.feltGroup}>
      <Text style={modalStyles.feltLabel}>{label}</Text>
      <TextInput
        style={modalStyles.feltInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16 },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 16,
  },
  kort: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    padding: 20,
  },
  firmaRad: { flexDirection: 'row', alignItems: 'flex-start' },
  logoSirkel: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 60, height: 60 },
  initialer: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    color: '#fff',
  },
  firmaInfo: { flex: 1, marginLeft: 16 },
  firmanavn: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: Colors.primary,
    marginBottom: 3,
  },
  firmaMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 1,
  },
  redigerLenke: { marginTop: 14 },
  redigerTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },
  kortTittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  prisRad: { flexDirection: 'row' },
  prisKolonne: { flex: 1, paddingVertical: 4 },
  prisDivider: { width: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: 16 },
  prisLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  prisVerdi: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: Colors.primary,
  },
  prisInput: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: Colors.primary,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
  },
  innstillingerKort: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  innstillingRad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  radBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  innstillingNavn: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  innstillingBeskrivelse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  innstillingVerdi: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  loggUtKnapp: { marginTop: 32, alignItems: 'center' },
  loggUtInner: {
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  loggUtTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  slettKonto: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  slettKontoTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.danger,
  },
})

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tittel: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  lukkTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.accent,
  },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  logoBoks: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#FAFAF9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  logoImage: { width: 120, height: 120 },
  logoTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  feltGroup: { marginBottom: 14 },
  feltLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  feltInput: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#111827',
  },
  lagreKnapp: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  lagreKnappTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },
})
