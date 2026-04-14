import type { ReactNode } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import AppBackground from '../AppBackground'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'

type Props = {
  children: ReactNode
  header: ReactNode
  /** Ekstra plass nederst (primærknapp + tastatur). */
  extraScrollHeight?: number
}

export default function OnboardingShell({ children, header, extraScrollHeight = 120 }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: authOnboardingColors.bg, zIndex: 999 }}>
      <AppBackground variant="secondary" />
      <SafeAreaView style={{ flex: 1, zIndex: 1 }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {header}
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid
          extraScrollHeight={extraScrollHeight}
          enableResetScrollToCoords={false}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  )
}
