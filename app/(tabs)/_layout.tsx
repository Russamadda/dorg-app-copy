import { Tabs } from 'expo-router'
import { GlassTabBar } from '../../components/GlassTabBar'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    />
  )
}
