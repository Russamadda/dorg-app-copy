import type { ReactNode } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppBackground from '../AppBackground'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'

type Props = {
  children: ReactNode
  scroll?: boolean
}

export default function AuthShell({ children, scroll = true }: Props) {
  return (
    <View style={styles.root}>
      <AppBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bounces={false}
              automaticallyAdjustKeyboardInsets={false}
            >
              <View style={styles.content}>{children}</View>
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  )
}

export { authOnboardingColors }

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authOnboardingColors.bg,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
})
