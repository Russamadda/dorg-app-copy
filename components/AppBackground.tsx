import { memo } from 'react'
import { Image, StyleSheet, View } from 'react-native'

type AppBackgroundVariant = 'primary' | 'secondary'

const PRIMARY_BACKGROUND = require('../assets/backgrounds/ffflux.svg.png')
const SECONDARY_BACKGROUND = require('../assets/backgrounds/flux2.svg.png')

function AppBackground({
  variant = 'primary',
}: {
  variant?: AppBackgroundVariant
}) {
  const source = variant === 'secondary' ? SECONDARY_BACKGROUND : PRIMARY_BACKGROUND

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.base} />
      <Image source={source} style={styles.art} resizeMode="cover" />
    </View>
  )
}

export default memo(AppBackground)

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF1F6',
  },
  art: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
})
