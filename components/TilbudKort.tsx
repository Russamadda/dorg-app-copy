import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import type { Forespørsel } from '../types'
import StatusBadge from './StatusBadge'

interface Props {
  tilbud: Forespørsel
  onPress?: () => void
}

function statusStripeFarge(status: string): string {
  switch (status.toLowerCase()) {
    case 'godkjent': return Colors.statusGodkjent
    case 'paminnelse': return Colors.statusPaminnelse
    case 'siste': return Colors.statusSiste
    case 'sendt': return Colors.statusSendt
    case 'avslatt': return Colors.statusAvslatt
    default: return Colors.textMuted
  }
}

export default function TilbudKort({ tilbud, onPress }: Props) {
  const dato = new Date(tilbud.opprettetDato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const belopFormatert = `kr ${tilbud.prisEksMva.toLocaleString('nb-NO')}`

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={onPress}>
      {/* Status stripe */}
      <View
        style={[
          styles.stripe,
          { backgroundColor: statusStripeFarge(tilbud.status) },
        ]}
      />

      <View style={styles.inner}>
        <View style={styles.rad1}>
          <Text style={styles.kundeNavn}>{tilbud.kundeNavn}</Text>
          <Text style={styles.belop}>{belopFormatert}</Text>
        </View>

        <View style={styles.rad2}>
          <Text style={styles.jobbBeskrivelse} numberOfLines={1}>
            {tilbud.jobbBeskrivelse}
          </Text>
          <StatusBadge status={tilbud.status} />
        </View>

        <View style={styles.rad3}>
          <Text style={styles.dato}>{dato}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  inner: {
    flex: 1,
    padding: 16,
    paddingLeft: 18,
    gap: 6,
  },
  rad1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kundeNavn: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  belop: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rad2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobbBeskrivelse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  rad3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dato: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
})
