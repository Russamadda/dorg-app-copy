import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'

interface Props {
  showNotification?: boolean
}

export default function TopBar({ showNotification = false }: Props) {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>DORG</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          {showNotification && <View style={styles.notifDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.navigate('/(tabs)/bedrift')}
        >
          <Ionicons name="business-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    position: 'relative',
    padding: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
})
