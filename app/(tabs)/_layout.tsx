import { StyleSheet, View } from 'react-native'
import { Tabs } from 'expo-router'
import { FloatingTabBar } from '../../components/FloatingTabBar'
import AppBackground from '../../components/AppBackground'

export default function TabsLayout() {
  return (
    <View style={styles.shell}>
      <AppBackground />
      <View style={styles.tabsFill}>
        <Tabs
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="tilbud" />
        </Tabs>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabsFill: {
    flex: 1,
  },
})
