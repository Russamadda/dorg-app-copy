import type { ReactNode } from 'react'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'

type Props = {
  children: ReactNode
}

export default function OnboardingShell({ children }: Props) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          <View style={styles.content}>{children}</View>
        </Pressable>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 18,
    paddingBottom: 14,
  },
})
