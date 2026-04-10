import { memo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Props {
  absolute?: boolean
}

function TopBar({ absolute = true }: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, absolute && styles.containerAbsolute, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.logo}>DORG</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => router.push({ pathname: '/bedrift', params: { demoOnboarding: '1' } })}
          accessibilityLabel="Åpne onboarding-demo"
          activeOpacity={0.82}
        >
          <Ionicons name="play-outline" size={16} color="#181A20" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/bedrift')}
          accessibilityLabel="Bedrift"
          activeOpacity={0.82}
        >
          <Ionicons name="business-outline" size={18} color="#444444" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default memo(TopBar)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  containerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  logo: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
    letterSpacing: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
  },
  iconBtn: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
})
