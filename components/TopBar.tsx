import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'

interface Props {
  showNotification?: boolean
}

export default function TopBar({ showNotification = false }: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.4)',
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