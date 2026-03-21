import { useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Markdown from 'react-native-markdown-display'
import { Colors } from '../constants/colors'
import { supabase } from '../lib/supabase'
import type { Forespørsel } from '../types'

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
    case 'sendt':
    default:
      return { bg: '#F3F4F6', tekst: '#374151', dot: '#6B7280', label: 'Sendt' }
  }
}

export default function TilbudDetaljerModal({ tilbud, visible, onClose, onOppdatert }: Props) {
  const [oppdaterer, setOppdaterer] = useState(false)

  if (!tilbud) return null

  const dato = new Date(tilbud.opprettetDato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const total = Math.round(tilbud.prisEksMva * 1.25)
  const mva = total - tilbud.prisEksMva
  const bannerFarger = statusBannerFarger(tilbud.status)

  async function oppdaterStatus(nyStatus: 'godkjent' | 'avslatt') {
    setOppdaterer(true)
    try {
      await supabase
        .from('tilbud')
        .update({ status: nyStatus })
        .eq('id', tilbud!.id)
      onOppdatert()
      onClose()
    } catch (e) {
      console.error('Feil ved statusoppdatering:', e)
    } finally {
      setOppdaterer(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTittel}>Tilbud</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.lukkTekst}>Lukk</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Statusbanner */}
          <View style={[styles.statusBanner, { backgroundColor: bannerFarger.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: bannerFarger.dot }]} />
            <Text style={[styles.statusNavn, { color: bannerFarger.tekst }]}>
              {bannerFarger.label}
            </Text>
            <Text style={[styles.statusDato, { color: bannerFarger.tekst }]}>· {dato}</Text>
          </View>

          {/* Tilbudsinfo-boks */}
          <View style={styles.infoBoks}>
            <InfoRad label="Kunde" verdi={tilbud.kundeNavn} />
            {tilbud.kundeEpost ? (
              <InfoRad label="E-post" verdi={tilbud.kundeEpost} />
            ) : null}
            <View style={styles.infoDivider} />
            <InfoRad
              label="Pris eks. MVA"
              verdi={`kr ${tilbud.prisEksMva.toLocaleString('nb-NO')}`}
            />
            <InfoRad
              label="MVA (25%)"
              verdi={`kr ${mva.toLocaleString('nb-NO')}`}
            />
            <InfoRad
              label="Totalt inkl. MVA"
              verdi={`kr ${total.toLocaleString('nb-NO')}`}
              bold
            />
          </View>

          {/* Tilbudstekst */}
          {tilbud.generertTekst ? (
            <>
              <Text style={styles.seksjonLabel}>TILBUDSTEKST</Text>
              <View style={styles.tekstBoks}>
                <Markdown style={markdownStyles}>{tilbud.generertTekst}</Markdown>
              </View>
            </>
          ) : null}

          {/* Handlinger — kun for sendte tilbud */}
          {tilbud.status === 'sendt' && (
            <View style={styles.handlinger}>
              <TouchableOpacity
                style={[styles.godkjentKnapp, oppdaterer && { opacity: 0.6 }]}
                onPress={() => oppdaterStatus('godkjent')}
                disabled={oppdaterer}
              >
                {oppdaterer ? (
                  <ActivityIndicator color="#166534" size="small" />
                ) : (
                  <Text style={styles.godkjentTekst}>Marker som godkjent</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avslattKnapp, oppdaterer && { opacity: 0.6 }]}
                onPress={() => oppdaterStatus('avslatt')}
                disabled={oppdaterer}
              >
                <Text style={styles.avslattTekst}>Marker som avslått</Text>
              </TouchableOpacity>
            </View>
          )}
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

const markdownStyles = {
  body: { fontSize: 14, color: '#111827', lineHeight: 22 },
  heading1: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: '#1B4332',
    marginBottom: 8,
  },
  heading2: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#1B4332',
    marginBottom: 6,
  },
  bullet_list: { marginLeft: 8 },
  list_item: { fontSize: 14, color: '#374151' },
  strong: { fontWeight: '700' as const },
  hr: { backgroundColor: '#E2E8E4', height: 1, marginVertical: 12 },
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

  content: { padding: 20, paddingBottom: 40 },

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
    marginBottom: 20,
    gap: 10,
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
  infoVerdiTung: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.primary,
  },
  infoDivider: { height: 1, backgroundColor: '#E2E8E4' },

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
    borderColor: '#E2E8E4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },

  handlinger: { gap: 10, marginTop: 4 },
  godkjentKnapp: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  godkjentTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#16A34A',
  },
  avslattKnapp: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avslattTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#DC2626',
  },
})
