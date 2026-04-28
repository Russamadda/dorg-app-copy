import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { authOnboardingColors } from '../constants/authOnboardingTheme'

type Props = {
  visible: boolean
  onClose: () => void
  onFullforProfil: () => void
}

export default function FullforBedriftsprofilModal({
  visible,
  onClose,
  onFullforProfil,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Fullfør bedriftsprofil</Text>
          <Text style={styles.body}>
            Vi trenger firmaadresse, telefon og e-post før du lager første tilbud.
            Da får kunden et ferdig og profesjonelt tilbud med riktige opplysninger.
          </Text>
          <Pressable
            onPress={onFullforProfil}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Fullfør profil"
          >
            <LinearGradient
              colors={['rgba(56,189,98,0.98)', 'rgba(24,100,58,0.99)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryText}>Fullfør profil</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(17,17,17,0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    padding: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authOnboardingColors.cta,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    lineHeight: 27,
    color: '#111111',
  },
  body: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#555555',
  },
  primaryButton: {
    marginTop: 22,
    borderRadius: 18,
    overflow: 'hidden',
  },
  primaryGradient: {
    minHeight: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.9,
  },
})
