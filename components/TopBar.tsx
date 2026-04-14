import { memo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { requestOfferFlowRecordingDemo } from '../lib/demoRecording/offerFlowDemoBus'
import { isOfferFlowRecordingDemoEnabled } from '../lib/demoRecording/offerFlowDemoFlags'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Padding below status bar (inside TopBar). */
export const TOP_BAR_EXTRA_TOP = 6
/** Bottom padding of the bar row. */
export const TOP_BAR_PADDING_BOTTOM = 6
/** Min height of the logo/actions row (matches icon hit areas). */
export const TOP_BAR_ROW_MIN = 36

/** Total height from screen top to bottom of TopBar when `absolute={false}` — use for list underlap. */
export function getTopBarOuterHeight(insetsTop: number) {
  return insetsTop + TOP_BAR_EXTRA_TOP + TOP_BAR_ROW_MIN + TOP_BAR_PADDING_BOTTOM
}

interface Props {
  absolute?: boolean
}

function TopBar({ absolute = true }: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.container,
        absolute && styles.containerAbsolute,
        { paddingTop: insets.top + TOP_BAR_EXTRA_TOP, paddingBottom: TOP_BAR_PADDING_BOTTOM },
      ]}
    >
      <Text style={styles.logo}>DORG</Text>
      <View style={styles.actions}>
        {isOfferFlowRecordingDemoEnabled() ? (
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              router.push('/(tabs)/tilbud')
              setTimeout(() => {
                requestOfferFlowRecordingDemo()
              }, 280)
            }}
            accessibilityLabel="Start opptaksdemo tilbudsflyt"
            activeOpacity={0.82}
          >
            <Ionicons name="videocam-outline" size={17} color="#166534" />
          </TouchableOpacity>
        ) : null}
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
    minHeight: TOP_BAR_ROW_MIN,
    paddingHorizontal: 20,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
})
