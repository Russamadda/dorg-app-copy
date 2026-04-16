import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

type Props = {
  subtitle?: string
}

function AuthBrandHeader({ subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>DORG</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export default memo(AuthBrandHeader)

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  brand: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: 2,
    color: '#111111',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
})
