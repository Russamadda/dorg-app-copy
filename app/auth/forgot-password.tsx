import { Redirect } from 'expo-router'

export default function ForgotPasswordScreen() {
  return <Redirect href={{ pathname: '/auth', params: { panel: 'forgot-password' } }} />
}
