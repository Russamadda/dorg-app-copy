import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../constants/colors'
import { fabEmitter } from '../lib/fabEmitter'

const TABS = [
  {
    name: 'index',
    label: 'Leads',
    icon: 'mail-outline' as const,
    iconActive: 'mail' as const,
  },
  {
    name: 'tilbud',
    label: 'Tilbud',
    icon: 'send-outline' as const,
    iconActive: 'send' as const,
  },
  {
    name: 'bedrift',
    label: 'Bedrift',
    icon: 'business-outline' as const,
    iconActive: 'business' as const,
  },
]

const BAR_HEIGHT = 56
const EDGE_CURVE_WIDTH = 32
const INDENT_DEPTH = 6
const TOP_PATH_STEPS = 120
const BUBBLE_INSET = 4
const FAB_SIZE = 58

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const [width, setWidth] = useState(0)
  const bubbleTranslateX = useRef(new Animated.Value(0)).current
  const currentBubbleXRef = useRef(0)

  const floatingBottom = Math.max(insets.bottom - 18, 0)
  const totalHeight = BAR_HEIGHT
  const zoneWidth = width > 0 ? width / 3 : 0

  useEffect(() => {
    if (zoneWidth === 0 || width === 0) return

    const nextBubbleX = zoneWidth * state.index + BUBBLE_INSET
    const currentBubbleX = currentBubbleXRef.current

    if (currentBubbleX === 0 && state.index === 0) {
      bubbleTranslateX.setValue(nextBubbleX)
      currentBubbleXRef.current = nextBubbleX
      return
    }

    const animation = Animated.spring(bubbleTranslateX, {
      toValue: nextBubbleX,
      damping: 20,
      mass: 0.8,
      stiffness: 220,
      overshootClamping: false,
      restDisplacementThreshold: 0.1,
      restSpeedThreshold: 0.1,
      useNativeDriver: true,
    })

    animation.start()

    return () => animation.stop()
  }, [bubbleTranslateX, state.index, width, zoneWidth])

  useEffect(() => {
    const id = bubbleTranslateX.addListener(({ value }) => {
      currentBubbleXRef.current = value
    })

    return () => bubbleTranslateX.removeListener(id)
  }, [bubbleTranslateX])

  const barPath = useMemo(() => {
    if (width === 0) return ''
    return buildBarPath(width, totalHeight)
  }, [totalHeight, width])

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width
    if (nextWidth !== width) {
      setWidth(nextWidth)
    }
  }

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View
        style={[styles.wrapper, { left: 28, right: 28, bottom: floatingBottom }]}
        pointerEvents="box-none"
        onLayout={handleLayout}
      >
        <View style={[styles.barShadow, { height: totalHeight }]}>
          <View style={[styles.barShell, { height: totalHeight }]}>
            {width > 0 ? (
              <Svg
                width={width}
                height={totalHeight}
                style={styles.canvasLayer}
              >
                <Path
                  d={barPath}
                  fill="#FFFFFF"
                  stroke="rgba(0,0,0,0.07)"
                  strokeWidth={0.5}
                />
              </Svg>
            ) : null}

            {width > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeBubble,
                  {
                    width: zoneWidth - BUBBLE_INSET * 2,
                    transform: [{ translateX: bubbleTranslateX }],
                  },
                ]}
              />
            ) : null}

            <View style={[styles.tabsRow, { height: BAR_HEIGHT }]}>
              {state.routes.map((route, index) => {
                const tab = TABS.find(item => item.name === route.name) ?? TABS[index]
                if (!tab) return null

                const descriptor = descriptors[route.key]
                const isFocused = state.index === index
                const label =
                  typeof descriptor.options.tabBarLabel === 'string'
                    ? descriptor.options.tabBarLabel
                    : typeof descriptor.options.title === 'string'
                      ? descriptor.options.title
                      : tab.label

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  })

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params)
                  }
                }

                const onLongPress = () => {
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  })
                }

                return (
                  <TouchableOpacity
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
                    testID={descriptor.options.tabBarButtonTestID}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    activeOpacity={0.85}
                    style={styles.tab}
                  >
                    <Ionicons
                      name={isFocused ? tab.iconActive : tab.icon}
                      size={25}
                      color={isFocused ? '#FFFFFF' : Colors.textSecondary}
                    />
                    <Text style={[styles.label, isFocused && styles.labelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Nytt tilbud"
        activeOpacity={0.9}
        onPress={() => fabEmitter.emit()}
        style={[styles.fabButton, { bottom: floatingBottom + totalHeight + 16 }]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

function buildBarPath(width: number, height: number) {
  const sampledTop = sampleTopEdge(width, TOP_PATH_STEPS)

  const topCommands = sampledTop
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${round(point.x)} ${round(point.y)}`)
    .join(' ')

  return [
    topCommands,
    `L ${round(width)} ${round(height)}`,
    `L 0 ${round(height)}`,
    'Z',
  ].join(' ')
}

function sampleTopEdge(width: number, steps: number) {
  const points: { x: number; y: number }[] = []

  for (let index = 0; index <= steps; index += 1) {
    const x = (width * index) / steps
    points.push({ x, y: getTopEdgeY(width, x) })
  }

  return points
}

function getTopEdgeY(width: number, x: number) {
  let y = 0

  y = Math.max(y, getEdgeCurveY(x, 0))
  y = Math.max(y, getEdgeCurveY(x, width))

  return y
}

function getEdgeCurveY(x: number, edgeX: number) {
  const start = edgeX === 0 ? 0 : edgeX - EDGE_CURVE_WIDTH
  const end = edgeX === 0 ? EDGE_CURVE_WIDTH : edgeX

  if (x < start || x > end) return 0

  if (edgeX === 0) {
    const t = clamp((x - start) / (end - start), 0, 1)
    return cubicBezier1D(INDENT_DEPTH, INDENT_DEPTH * 0.15, 0, 0, t)
  }

  const t = clamp((x - start) / (end - start), 0, 1)
  return cubicBezier1D(0, 0, INDENT_DEPTH * 0.15, INDENT_DEPTH, t)
}

function cubicBezier1D(p0: number, p1: number, p2: number, p3: number, t: number) {
  const invT = 1 - t
  return (
    invT * invT * invT * p0
    + 3 * invT * invT * t * p1
    + 3 * invT * t * t * p2
    + t * t * t * p3
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function round(value: number) {
  return Number(value.toFixed(2))
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    position: 'absolute',
  },
  barShadow: {
    position: 'relative',
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 28,
  },
  barShell: {
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  canvasLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    height: '100%',
    minWidth: 0,
    zIndex: 1,
  },
  activeBubble: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 24,
    backgroundColor: '#2E7D53',
  },
  fabButton: {
    position: 'absolute',
    right: 18,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#2E7D53',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
  },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_500Medium',
  },
})
