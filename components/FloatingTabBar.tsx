import { useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Svg, { Path } from 'react-native-svg'
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect'
import { fabEmitter } from '../lib/fabEmitter'

const ACTIVE_COLOR = '#2E7D53'
const INACTIVE_COLOR = '#94A3B8'
const FAB_SIZE = 56
const PILL_RADIUS = 24
const NOTCH_WIDTH = 80
const NOTCH_DEPTH = 20

export function getFloatingTabBarPadding(bottomInset: number): number {
  return Math.max(bottomInset, 4) + 96
}

type SideTabProps = {
  active: boolean
  icon: keyof typeof MaterialIcons.glyphMap
  label: string
  onPress: () => void
}

function SideTab({ active, icon, label, onPress }: SideTabProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sideButton, pressed && styles.sideButtonPressed]}
      onPress={onPress}
    >
      <MaterialIcons
        name={icon}
        size={24}
        color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
      />
      <Text style={[styles.sideLabel, active && styles.sideLabelActive]}>
        {label}
      </Text>
    </Pressable>
  )
}

function buildPillPath(width: number, height: number): string {
  const radius = Math.min(PILL_RADIUS, height / 2)
  const cx = width / 2
  const notchStart = cx - NOTCH_WIDTH / 2
  const notchEnd = cx + NOTCH_WIDTH / 2
  const bottom = height
  const right = width

  return [
    `M ${radius} 0`,
    `L ${notchStart} 0`,
    `C ${cx - 20} 0, ${cx - 16} ${NOTCH_DEPTH}, ${cx} ${NOTCH_DEPTH}`,
    `C ${cx + 16} ${NOTCH_DEPTH}, ${cx + 20} 0, ${notchEnd} 0`,
    `L ${right - radius} 0`,
    `Q ${right} 0, ${right} ${radius}`,
    `L ${right} ${bottom - radius}`,
    `Q ${right} ${bottom}, ${right - radius} ${bottom}`,
    `L ${radius} ${bottom}`,
    `Q 0 ${bottom}, 0 ${bottom - radius}`,
    `L 0 ${radius}`,
    `Q 0 0, ${radius} 0`,
    'Z',
  ].join(' ')
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const barWidth = Math.min(width * 0.9, 340)
  const bottomOffset = Math.max(insets.bottom, 4)
  const [barHeight, setBarHeight] = useState(0)

  const leftRouteIndex = state.routes.findIndex(route => route.name === 'index')
  const rightRouteIndex = state.routes.findIndex(route => route.name === 'tilbud')

  const canUseGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable()

  function handleBarLayout(event: LayoutChangeEvent) {
    setBarHeight(event.nativeEvent.layout.height)
  }

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View
        style={[
          styles.wrapper,
          { width: barWidth, bottom: bottomOffset, transform: [{ translateX: -(barWidth / 2) }] },
        ]}
      >
        <View style={styles.fabSlot} pointerEvents="box-none">
          <View pointerEvents="none" style={styles.fabGlow} />
          <View style={styles.fabShell}>
            <Pressable
              style={({ pressed }) => [
                styles.fabButton,
                pressed && styles.fabButtonPressed,
              ]}
              onPress={() => fabEmitter.emit()}
            >
              <MaterialIcons name="add" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.barShadow}>
          <View style={styles.barClip} onLayout={handleBarLayout}>
            {barHeight > 0 ? (
              <>
                {canUseGlass ? (
                  <GlassView
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      styles.glassPill,
                      { width: barWidth, height: barHeight },
                    ]}
                    glassEffectStyle="regular"
                    tintColor="transparent"
                  />
                ) : (
                  <View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      styles.fallbackPill,
                      { width: barWidth, height: barHeight },
                    ]}
                  />
                )}

                <Svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${barWidth} ${barHeight}`}
                  preserveAspectRatio="none"
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                >
                  <Path
                    d={buildPillPath(barWidth, barHeight)}
                    fill="transparent"
                  />
                  <Path
                    d={buildPillPath(barWidth, barHeight)}
                    fill="none"
                    stroke="rgba(255,255,255,0.26)"
                    strokeWidth={1}
                  />
                </Svg>

                <View pointerEvents="none" style={styles.highlightTop} />
                <View pointerEvents="none" style={styles.highlightBottom} />
              </>
            ) : null}

            <View style={styles.barOverlay}>
              {leftRouteIndex !== -1 ? (
                <SideTab
                  active={state.index === leftRouteIndex}
                  icon="mail"
                  label="Forespørsler"
                  onPress={() => {
                    const route = state.routes[leftRouteIndex]
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    })

                    if (!event.defaultPrevented) {
                      navigation.navigate(route.name as never)
                    }
                  }}
                />
              ) : (
                <View style={styles.sideSpacer} />
              )}

              <View style={styles.centerSpacer} />

              {rightRouteIndex !== -1 ? (
                <SideTab
                  active={state.index === rightRouteIndex}
                  icon="local-offer"
                  label="Tilbud"
                  onPress={() => {
                    const route = state.routes[rightRouteIndex]
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    })

                    if (!event.defaultPrevented) {
                      navigation.navigate(route.name as never)
                    }
                  }}
                />
              ) : (
                <View style={styles.sideSpacer} />
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    position: 'absolute',
    left: '50%',
    zIndex: 50,
  },
  fabSlot: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  fabGlow: {
    position: 'absolute',
    width: FAB_SIZE + 20,
    height: FAB_SIZE + 20,
    borderRadius: 999,
    backgroundColor: 'rgba(46,125,83,0.18)',
    shadowColor: '#2E7D53',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 2,
    transform: [{ translateY: 1 }],
  },
  barShadow: {
    overflow: 'visible',
    shadowColor: '#191C1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  barClip: {
    overflow: 'visible',
  },

  glassPill: {
    borderRadius: PILL_RADIUS,
  },
  fallbackPill: {
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  highlightTop: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  highlightBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 2,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },

  barOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 1,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  sideButton: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  sideButtonPressed: {
    transform: [{ scale: 0.9 }],
  },
  sideSpacer: {
    minWidth: 76,
  },
  centerSpacer: {
    width: FAB_SIZE + 18,
  },
  sideLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: INACTIVE_COLOR,
  },
  sideLabelActive: {
    color: ACTIVE_COLOR,
  },
  fabButton: {
    width: FAB_SIZE + 8,
    height: FAB_SIZE + 8,
    borderRadius: (FAB_SIZE + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE_COLOR,
    transform: [{ scale: 1.1 }],
    shadowColor: '#2E7D53',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  fabButtonPressed: {
    transform: [{ scale: 0.9 }],
  },
  fabShell: {
    padding: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: ACTIVE_COLOR,
  },
})
