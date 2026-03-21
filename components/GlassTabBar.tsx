import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { fabEmitter } from '../lib/fabEmitter'

const TABS = [
  {
    name: 'index',
    label: 'Forespørsler',
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

const EDGE_GAP = 5
const NAV_HEIGHT = 72
const FAB_GAP = 12
const BOTTOM_OFFSET = -4

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const animIndex = useRef(new Animated.Value(state.index)).current
  const [tabsWidth, setTabsWidth] = useState(0)

  useEffect(() => {
    Animated.spring(animIndex, {
      toValue: state.index,
      damping: 20,
      stiffness: 200,
      mass: 0.8,
      useNativeDriver: true,
    }).start()
  }, [state.index])

  const slotWidth = tabsWidth > 0 ? tabsWidth / 3 : 0
  const highlightW = slotWidth > 0 ? slotWidth : 0

  const translateX = animIndex.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 2].map(i => EDGE_GAP + i * slotWidth),
  })

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + BOTTOM_OFFSET }]}>
      <View style={styles.pill}>
        {tabsWidth > 0 && (
          <Animated.View
            style={[styles.highlight, { width: highlightW, transform: [{ translateX }] }]}
            pointerEvents="none"
          />
        )}

        <View
          style={styles.tabsRow}
          onLayout={e => setTabsWidth(e.nativeEvent.layout.width)}
        >
          {TABS.map((tab, index) => {
            const activeOpacity = animIndex.interpolate({
              inputRange: [index - 1, index, index + 1],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            })
            const inactiveOpacity = animIndex.interpolate({
              inputRange: [index - 1, index, index + 1],
              outputRange: [1, 0, 1],
              extrapolate: 'clamp',
            })

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: state.routes[index]?.key,
                    canPreventDefault: true,
                  })
                  if (!event.defaultPrevented) navigation.navigate(tab.name)
                }}
                activeOpacity={0.7}
                style={styles.tab}
              >
                <View style={styles.iconStack}>
                  <Animated.View style={[styles.iconLayer, { opacity: inactiveOpacity }]}>
                    <Ionicons
                      name={tab.icon}
                      size={24}
                      color="rgba(255,255,255,0.45)"
                    />
                  </Animated.View>
                  <Animated.View style={[styles.iconLayer, { opacity: activeOpacity }]}>
                    <Ionicons
                      name={tab.iconActive}
                      size={24}
                      color="#FFFFFF"
                    />
                  </Animated.View>
                </View>

                <View style={styles.labelStack}>
                  <Text style={[styles.label, styles.labelPlaceholder]}>
                    {tab.label}
                  </Text>
                  <Animated.Text
                    style={[styles.label, styles.labelInactive, { opacity: inactiveOpacity }]}
                  >
                    {tab.label}
                  </Animated.Text>
                  <Animated.Text
                    style={[styles.label, styles.labelActive, { opacity: activeOpacity }]}
                  >
                    {tab.label}
                  </Animated.Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <TouchableOpacity
        style={styles.addCircle}
        onPress={() => fabEmitter.emit()}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: FAB_GAP,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: NAV_HEIGHT,
    paddingVertical: EDGE_GAP,
    paddingHorizontal: EDGE_GAP,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 24, 15, 0.82)',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: EDGE_GAP,
    bottom: EDGE_GAP,
    borderRadius: 999,
    backgroundColor: 'rgba(27, 67, 50, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 130, 0.35)',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  iconStack: {
    width: 24,
    height: 24,
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelStack: {
    minHeight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    textAlign: 'center',
  },
  labelPlaceholder: {
    opacity: 0,
  },
  labelInactive: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_400Regular',
  },
  labelActive: {
    position: 'absolute',
    color: '#FFFFFF',
    fontFamily: 'DMSans_500Medium',
  },
  addCircle: {
    width: NAV_HEIGHT,
    height: NAV_HEIGHT,
    borderRadius: NAV_HEIGHT / 2,
    backgroundColor: 'rgba(8, 24, 15, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 130, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
})
