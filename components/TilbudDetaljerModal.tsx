import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TextInput,
  type LayoutChangeEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { sendTilbudEpost } from '../lib/resend'
import { hentFirma, supabase } from '../lib/supabase'
import { TilbudsForhåndsvisning } from './TilbudsForhåndsvisning'
import type { Forespørsel, Firma } from '../types'

interface Props {
  tilbud: Forespørsel | null
  visible: boolean
  onClose: () => void
  onOppdatert: () => void
}

function statusBannerFarger(status: string): {
  bg: string
  tekst: string
  dot: string
  label: string
} {
  switch (status.toLowerCase()) {
    case 'godkjent':
      return { bg: '#F0FDF4', tekst: '#166534', dot: '#16A34A', label: 'Godkjent' }
    case 'avslatt':
      return { bg: '#FEF2F2', tekst: '#991B1B', dot: '#DC2626', label: 'Avslått' }
    case 'paminnelse':
      return { bg: '#EFF6FF', tekst: '#1D4ED8', dot: '#2563EB', label: 'Påminnelse' }
    case 'siste':
      return { bg: '#FFF7ED', tekst: '#9A3412', dot: '#D97706', label: 'Siste påminnelse' }
    case 'avventer':
      return { bg: '#F3F4F6', tekst: '#374151', dot: '#6B7280', label: 'Avventer' }
    case 'sendt':
    default:
      return { bg: '#F3F4F6', tekst: '#374151', dot: '#6B7280', label: 'Sendt' }
  }
}

function rensTelefonnummer(telefon?: string) {
  if (!telefon) return ''
  return telefon.replace(/[^\d+]/g, '')
}

function byggOppdatertTilbudstekst(tekst: string, prisEksMva: number) {
  const mva = Math.round(prisEksMva * 0.25)
  const totalt = prisEksMva + mva
  const formatKr = (belop: number) => `kr ${belop.toLocaleString('nb-NO')}`
  const linjer = tekst.split('\n')

  return linjer
    .map(linje => {
      const trimmet = linje.trim()

      if (/^Arbeid eks\. mva:/i.test(trimmet)) {
        return `Arbeid eks. mva:    ${formatKr(prisEksMva)}  `
      }

      if (/^MVA 25%:/i.test(trimmet)) {
        return `MVA 25%:            ${formatKr(mva)}  `
      }

      if (/^Totalt inkl\. mva:/i.test(trimmet)) {
        return `Totalt inkl. mva:   ${formatKr(totalt)}`
      }

      return linje
    })
    .join('\n')
}

export default function TilbudDetaljerModal({ tilbud, visible, onClose, onOppdatert }: Props) {
  const scrollRef = useRef<ScrollView>(null)
  const [prisBoksY, setPrisBoksY] = useState(0)
  const [justerPrisModus, setJusterPrisModus] = useState(false)
  const [nyPrisInput, setNyPrisInput] = useState('')
  const [oppdatertPris, setOppdatertPris] = useState<number | null>(null)
  const [lagresPris, setLagresPris] = useState(false)
  const [prisEndret, setPrisEndret] = useState(false)
  const [senderNyttTilbud, setSenderNyttTilbud] = useState(false)
  const [firma, setFirma] = useState<Firma | null>(null)

  const scrollTilPrisBoks = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(prisBoksY - 4, 0),
      animated: true,
    })
  }

  useEffect(() => {
    if (!visible || !tilbud) return

    setJusterPrisModus(false)
    setNyPrisInput('')
    setOppdatertPris(null)
    setLagresPris(false)
    setPrisEndret(false)
    setSenderNyttTilbud(false)
  }, [tilbud?.id, visible])

  useEffect(() => {
    if (!visible) return

    let avbrutt = false

    async function lastFirma() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (!avbrutt) {
            setFirma(null)
          }
          return
        }

        const firmaData = await hentFirma(user.id)
        if (!avbrutt) {
          setFirma(firmaData)
        }
      } catch (error) {
        console.error('Feil ved lasting av firma:', error)
      }
    }

    void lastFirma()

    return () => {
      avbrutt = true
    }
  }, [visible])

  useEffect(() => {
    if (!justerPrisModus) return

    const timer = setTimeout(() => {
      scrollTilPrisBoks()
    }, 220)

    return () => clearTimeout(timer)
  }, [justerPrisModus, prisBoksY])

  if (!tilbud) return null
  const aktivtTilbud = tilbud

  const dato = new Date(aktivtTilbud.opprettetDato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const bannerFarger = statusBannerFarger(aktivtTilbud.status)
  const gjeldendePris = oppdatertPris ?? aktivtTilbud.prisEksMva
  const mva = Math.round(gjeldendePris * 0.25)
  const totalt = gjeldendePris + mva
  const visningsTekst = byggOppdatertTilbudstekst(
    aktivtTilbud.generertTekst ?? '',
    gjeldendePris
  )

  const bekreftNyPris = async () => {
    const parsed = parseInt(nyPrisInput.replace(/\s/g, ''), 10)
    if (isNaN(parsed) || parsed <= 0) return

    setLagresPris(true)
    try {
      const { error } = await supabase
        .from('tilbud')
        .update({ pris_eks_mva: parsed })
        .eq('id', aktivtTilbud.id)

      if (error) {
        throw error
      }

      setOppdatertPris(parsed)
      setNyPrisInput(String(parsed))
      setPrisEndret(true)
      setJusterPrisModus(false)
    } catch (err) {
      console.error('Feil ved prisoppdatering:', err)
    } finally {
      setLagresPris(false)
    }
  }

  const sendNyttTilbud = async () => {
    if (!prisEndret || !oppdatertPris) return
    setSenderNyttTilbud(true)

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL

    try {
      if (backendUrl) {
        const response = await fetch(`${backendUrl}/api/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tilbud: {
              kundeNavn: aktivtTilbud.kundeNavn,
              kundeEpost: aktivtTilbud.kundeEpost,
              firmanavn: firma?.firmanavn ?? '',
              generertTekst: visningsTekst,
              prisEksMva: oppdatertPris,
            },
            pdfBase64: '',
          }),
        })

        if (!response.ok) {
          throw new Error(`Backend svarte med ${response.status}`)
        }
      } else {
        await sendTilbudEpost({
          tilEpost: aktivtTilbud.kundeEpost,
          kundeNavn: aktivtTilbud.kundeNavn,
          firmanavn: firma?.firmanavn ?? '',
          generertTekst: visningsTekst,
          prisEksMva: oppdatertPris,
        })
      }

      onOppdatert()
      onClose()
    } catch (err) {
      console.error('Feil ved sending:', err)
    } finally {
      setSenderNyttTilbud(false)
    }
  }

  async function åpneTelefon() {
    const nummer = rensTelefonnummer(aktivtTilbud.kundeTelefon)
    if (!nummer) return

    const url = `tel:${nummer}`
    const kanÅpne = await Linking.canOpenURL(url)
    if (kanÅpne) {
      await Linking.openURL(url)
    }
  }

  async function åpneEpost() {
    if (!aktivtTilbud.kundeEpost) return

    const url = `mailto:${aktivtTilbud.kundeEpost}`
    const kanÅpne = await Linking.canOpenURL(url)
    if (kanÅpne) {
      await Linking.openURL(url)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTittel}>Tilbud</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.lukkTekst}>Lukk</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.statusBanner, { backgroundColor: bannerFarger.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: bannerFarger.dot }]} />
            <Text style={[styles.statusNavn, { color: bannerFarger.tekst }]}>
              {bannerFarger.label}
            </Text>
            <Text style={[styles.statusDato, { color: bannerFarger.tekst }]}>· {dato}</Text>
          </View>

          <View style={styles.infoBoks}>
            <InfoRad label="Kunde" verdi={aktivtTilbud.kundeNavn} />
            {aktivtTilbud.kundeTelefon ? (
              <KontaktRad
                label="Telefon"
                verdi={aktivtTilbud.kundeTelefon}
                ikon="call-outline"
                onPress={åpneTelefon}
              />
            ) : null}
            {aktivtTilbud.kundeEpost ? (
              <KontaktRad
                label="E-post"
                verdi={aktivtTilbud.kundeEpost}
                ikon="mail-outline"
                onPress={åpneEpost}
              />
            ) : null}
          </View>

          <View
            style={styles.prisBoks}
            onLayout={(event: LayoutChangeEvent) => {
              setPrisBoksY(event.nativeEvent.layout.y)
            }}
          >
            <View style={styles.prisHeaderRad}>
              <Text style={styles.prisHeaderTittel}>PRIS</Text>
              <TouchableOpacity
                onPress={() => {
                  setJusterPrisModus(true)
                  setNyPrisInput(String(gjeldendePris))
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.prisJusterTekst}>Juster pris</Text>
              </TouchableOpacity>
            </View>

            <InfoRad label="Pris eks. MVA" verdi={`kr ${gjeldendePris.toLocaleString('nb-NO')}`} />
            <InfoRad label="MVA (25%)" verdi={`kr ${mva.toLocaleString('nb-NO')}`} />
            <InfoRad label="Totalt inkl. MVA" verdi={`kr ${totalt.toLocaleString('nb-NO')}`} bold />

            {justerPrisModus ? (
              <View style={styles.prisJusteringContainer}>
                <Text style={styles.prisLabel}>Ny pris eks. MVA</Text>
                <View style={styles.prisInputRad}>
                  <TextInput
                    style={styles.prisInput}
                    value={nyPrisInput}
                    onChangeText={setNyPrisInput}
                    keyboardType="number-pad"
                    autoFocus
                    selectTextOnFocus
                    placeholder="8000"
                    onFocus={() => {
                      setTimeout(() => {
                        scrollTilPrisBoks()
                      }, 160)
                    }}
                  />
                  <Text style={styles.prisInputSuffix}>kr</Text>
                </View>
                <View style={styles.prisKnappRad}>
                  <TouchableOpacity
                    style={styles.avbrytPrisKnapp}
                    onPress={() => setJusterPrisModus(false)}
                  >
                    <Text style={styles.avbrytPrisTekst}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bekreftPrisKnapp}
                    onPress={() => {
                      void bekreftNyPris()
                    }}
                    disabled={lagresPris}
                  >
                    {lagresPris ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.bekreftPrisTekst}>Bekreft</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.sendNyttTilbudKnapp,
              !prisEndret && styles.sendNyttTilbudKnappDisabled,
            ]}
            onPress={() => {
              void sendNyttTilbud()
            }}
            disabled={!prisEndret || senderNyttTilbud}
            activeOpacity={0.8}
          >
            {senderNyttTilbud ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                <Text style={styles.sendNyttTilbudTekst}>
                  Send nytt tilbud med oppdatert pris
                </Text>
              </>
            )}
          </TouchableOpacity>

          {aktivtTilbud.generertTekst ? (
            <>
              <Text
                style={[
                  styles.seksjonLabel,
                  { marginTop: prisEndret ? 22 : 12 },
                ]}
              >
                TILBUDSTEKST
              </Text>
              <View style={styles.tekstBoks}>
                <TilbudsForhåndsvisning tekst={visningsTekst} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function InfoRad({
  label,
  verdi,
  bold,
}: {
  label: string
  verdi: string
  bold?: boolean
}) {
  return (
    <View style={styles.infoRad}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoVerdi, bold && styles.infoVerdiTung]}>{verdi}</Text>
    </View>
  )
}

function KontaktRad({
  label,
  verdi,
  ikon,
  onPress,
}: {
  label: string
  verdi: string
  ikon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}) {
  return (
    <View style={styles.infoRad}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.kontaktVerdiWrap}>
        <Text style={styles.infoVerdi}>{verdi}</Text>
        <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.kontaktIkonKnapp}>
          <Ionicons name={ikon} size={18} color={Colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8E4',
    backgroundColor: Colors.background,
  },
  headerTittel: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  lukkTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.accent,
  },

  content: { padding: 20, paddingBottom: 12 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusNavn: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
  statusDato: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },

  infoBoks: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  prisBoks: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
    gap: 10,
  },
  prisHeaderRad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  prisHeaderTittel: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: '#6B7280',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  prisJusterTekst: {
    fontSize: 12,
    color: '#4CAF82',
    fontFamily: 'DMSans_500Medium',
  },
  infoRad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  infoVerdi: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  kontaktVerdiWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
    gap: 10,
  },
  kontaktIkonKnapp: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3FAF6',
    borderWidth: 1,
    borderColor: '#D8EEE2',
  },
  infoVerdiTung: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.primary,
  },

  prisJusteringContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  prisLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  prisInputRad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#1B4332',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 10,
  },
  prisInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
  },
  prisInputSuffix: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'DMSans_400Regular',
  },
  prisKnappRad: {
    flexDirection: 'row',
    gap: 8,
  },
  avbrytPrisKnapp: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avbrytPrisTekst: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#6B7280',
  },
  bekreftPrisKnapp: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bekreftPrisTekst: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#FFFFFF',
  },

  sendNyttTilbudKnapp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B4332',
    borderRadius: 12,
    height: 52,
    marginTop: 16,
    marginBottom: 4,
  },
  sendNyttTilbudKnappDisabled: {
    opacity: 0.35,
  },
  sendNyttTilbudTekst: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#FFFFFF',
  },
  seksjonLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tekstBoks: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderTopWidth: 3,
    borderTopColor: '#4CAF82',
    padding: 20,
  },
})
