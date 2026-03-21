import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface Props {
  showNotification?: boolean
}

export default function TopBar({ showNotification = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>DORG</Text>
      <TouchableOpacity style={styles.notifWrapper}>
        <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
        {showNotification && <View style={styles.notifDot} />}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  logo: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  notifWrapper: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
})
