import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: '#E8EDF5' },
      }}
    >
      <Stack.Screen name="velkommen" />
      <Stack.Screen
        name="index"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="reset-password" />
    </Stack>
  )
}
