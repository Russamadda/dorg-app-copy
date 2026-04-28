import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import AppBackground from '../../components/AppBackground'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'

const MOCKUP_IMAGE = require('../../assets/intro-mockup.png')
const DORG_PUBLIC_BASE_URL =
  process.env.EXPO_PUBLIC_DORG_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') || 'https://dorg.work'

export default function VelkommenScreen() {
  const router = useRouter()
  const { height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  async function åpneRegistrering() {
    try {
      await Linking.openURL(`${DORG_PUBLIC_BASE_URL}/registrer`)
    } catch (e) {
      console.warn('[velkommen] Kunne ikke åpne nettadresse:', e)
    }
  }

  return (
    <View style={styles.root}>
      <AppBackground />
      <StatusBar style="dark" />
      {/* Only top edge — bottom inset applied manually to scrollContent so it
          doesn't double-stack with React Navigation's automatic scroll insets */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
        >
          <Text style={styles.brand}>DORG</Text>

          <View style={[styles.heroWrap, { height: screenHeight * 0.52 }]}>
            {/* Shadow must live on a View — shadows on Image are ignored on iOS */}
            <View style={styles.mockupShadow}>
              <Image
                source={MOCKUP_IMAGE}
                style={styles.mockupImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.headline}>Lag tilbud på 60 sekunder.</Text>
          <Text style={styles.subheading}>Rett fra mobilen.</Text>

          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
            onPress={() => void åpneRegistrering()}
            accessibilityRole="button"
            accessibilityLabel="Registrer på nett"
          >
            <Text style={styles.ctaLabel}>Registrer på nett</Text>
          </Pressable>

          <Text style={styles.helperText}>14 dagers gratis prøveperiode</Text>

          <Pressable
            style={styles.loginLinkWrap}
            onPress={() => router.push('/auth')}
            accessibilityRole="button"
          >
            <Text style={styles.loginLink}>
              Har du allerede konto?{' '}
              <Text style={styles.loginLinkBold}>Logg inn</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authOnboardingColors.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  brand: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 50,
    lineHeight: 56,
    letterSpacing: 2,
    color: '#111111',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 0,
    position: 'relative',
  },
  mockupShadow: {
    width: '72%',
    height: '100%',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    transform: [],
  },
  mockupImage: {
    width: '100%',
    height: '100%',
  },
  headline: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 33,
    lineHeight: 40,
    color: '#111111',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    lineHeight: 24,
    color: authOnboardingColors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    width: '78%',
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: '#1B4332',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  ctaLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  helperText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: authOnboardingColors.textSubtle,
    textAlign: 'center',
    marginBottom: 16,
  },
  loginLinkWrap: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  loginLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#111111',
    textAlign: 'center',
  },
  loginLinkBold: {
    fontFamily: 'DMSans_700Bold',
    color: '#1B4332',
  },
})
