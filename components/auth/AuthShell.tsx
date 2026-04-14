import type { ReactNode } from 'react'
import { View, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import AppBackground from '../AppBackground'
import { authOnboardingColors, authOnboardingTheme } from '../../constants/authOnboardingTheme'

type Props = {
  children: ReactNode
  /** Ekstra padding under innhold (f.eks. flytende knapp). */
  extraScrollHeight?: number
}

/**
 * Felles skall for auth: bakgrunn, safe area, tastatur-bevisst scrolling.
 */
export default function AuthShell({ children, extraScrollHeight = 24 }: Props) {
  return (
    <View style={authOnboardingTheme.screenBg}>
      <AppBackground variant="secondary" />
      <SafeAreaView style={{ flex: 1, zIndex: 1 }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid
          extraScrollHeight={extraScrollHeight}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: Platform.OS === 'ios' ? 20 : 16,
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  )
}

export { authOnboardingColors }
