import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'

interface Props {
  status: string
}

function getStatusFarger(status: string): { dot: string; tekst: string; label: string } {
  switch (status.toLowerCase()) {
    case 'godkjent':
      return { dot: Colors.statusGodkjent, tekst: Colors.statusGodkjent, label: 'GODKJENT' }
    case 'paminnelse':
      return { dot: Colors.statusPaminnelse, tekst: Colors.statusPaminnelse, label: 'PÅMINNELSE' }
    case 'siste':
      return { dot: Colors.statusSiste, tekst: Colors.statusSiste, label: 'SISTE SJANSE' }
    case 'sendt':
      return { dot: Colors.statusSendt, tekst: Colors.statusSendt, label: 'SENDT' }
    case 'avslatt':
      return { dot: Colors.statusAvslatt, tekst: Colors.statusAvslatt, label: 'AVSLÅTT' }
    case 'avventer':
    default:
      return { dot: Colors.textMuted, tekst: Colors.textMuted, label: 'AVVENTER' }
  }
}

export default function StatusBadge({ status }: Props) {
  const farger = getStatusFarger(status)

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: farger.dot }]} />
      <Text style={[styles.tekst, { color: farger.tekst }]}>{farger.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.3,
  },
})
