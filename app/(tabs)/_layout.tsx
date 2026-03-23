import { Tabs } from 'expo-router'
import { FloatingTabBar } from '../../components/FloatingTabBar'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tilbud" />
      <Tabs.Screen name="bedrift" options={{ href: null }} />
    </Tabs>
  )
}
