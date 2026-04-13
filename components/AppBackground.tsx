import { memo } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import {
  BRAND_BACKGROUND_BASE_COLOR,
  BRAND_BACKGROUND_IMAGE,
} from '../lib/backgroundConfig'

type AppBackgroundVariant = 'primary' | 'secondary'

/** Onboarding m.m. — egen illustrasjon, ikke merke-bakgrunnen. */
const SECONDARY_BACKGROUND = require('../assets/backgrounds/flux2.svg.png')

function AppBackground({ variant = 'primary' }: { variant?: AppBackgroundVariant }) {
  const isBrand = variant === 'primary'
  const source = isBrand ? BRAND_BACKGROUND_IMAGE : SECONDARY_BACKGROUND
  const baseColor = isBrand ? BRAND_BACKGROUND_BASE_COLOR : '#EEF1F6'

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={[styles.base, { backgroundColor: baseColor }]} />
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
  },
  art: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
})
