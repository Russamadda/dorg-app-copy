import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
import { ImageBackground, StyleSheet, View } from 'react-native'
import {
  BACKGROUND_FALLBACK_COLOR,
  BRAND_BACKGROUND_IMAGE,
} from '../lib/backgroundConfig'

type Props = {
  children: ReactNode
}

/**
 * Fullskjerms ImageBackground med samme kilde som AppBackground (merke-bakgrunn).
 * Brukes der du trenger wrapper utenfor tab-skallet; faner bruker AppBackground i `(tabs)/_layout`.
 */
function BackgroundWrapperInner({ children }: Props) {
  const [imageFailed, setImageFailed] = useState(false)

  const source = useMemo(() => BRAND_BACKGROUND_IMAGE, [])

  const onError = useCallback(() => {
    setImageFailed(true)
  }, [])

  if (imageFailed) {
    return (
      <View style={[styles.fill, { backgroundColor: BACKGROUND_FALLBACK_COLOR }]}>{children}</View>
    )
  }

  return (
    <ImageBackground
      source={source}
      style={styles.fill}
      resizeMode="cover"
      imageStyle={styles.image}
      onError={onError}
    >
      <View style={styles.fill}>{children}</View>
    </ImageBackground>
  )
}

export const BackgroundWrapper = memo(BackgroundWrapperInner)

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  image: {
    // Dekker hele ImageBackground-området uten å forskyve barn
    width: '100%',
    height: '100%',
  },
})
