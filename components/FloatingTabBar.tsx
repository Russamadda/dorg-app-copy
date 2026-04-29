import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { fabEmitter } from '../lib/fabEmitter'
import { useBadgeCount } from '../lib/notificationState'
import { tabBarEmitter } from '../lib/tabBarEmitter'
import NotificationBadge from './NotificationBadge'
import { Colors } from '../constants/colors'

const ACTIVE_COLOR = Colors.primary
const INACTIVE_COLOR = '#888888'
const GLASS_OVERLAY = 'rgba(255,255,255,0.18)'
const GLASS_EDGE = 'rgba(255,255,255,0.12)'
const GLASS_BLUR_INTENSITY = 72
const FAB_SIZE = 68
const FAB_RING = 8
const FAB_TOTAL_SIZE = FAB_SIZE + FAB_RING
const FAB_LIFT = 18

/** Space above the floating tab bar + FAB (toast sits here on tab screens). */
const TOAST_OFFSET_ABOVE_FLOATING_UI = 76 + FAB_LIFT + 10

/** Extra clearance above home indicator for toasts on stack/modal screens (no tab bar). */
const STACK_TOAST_CLEARANCE_PT = 16

/** Scroll content breathing room below safe area when there is no floating tab bar. */
const STACK_SCROLL_EXTRA_BELOW_SAFE_PT = 32

export function getFloatingTabBarPadding(bottomInset: number): number {
  return Math.max(bottomInset, 8) + TOAST_OFFSET_ABOVE_FLOATING_UI
}

export function getFloatingToastBottomOffset(): number {
  return TOAST_OFFSET_ABOVE_FLOATING_UI
}

/** Toast bottom offset for screens without the floating tab bar (e.g. Bedrift stack). */
export function getStackToastBottomOffset(bottomInset: number): number {
  return Math.max(bottomInset, 8) + STACK_TOAST_CLEARANCE_PT
}

/** ScrollView `paddingBottom` for stack screens without the floating tab bar. */
export function getStackScreenScrollBottomPadding(bottomInset: number): number {
  return Math.max(bottomInset, 12) + STACK_SCROLL_EXTRA_BELOW_SAFE_PT
}

type SideTabProps = {
  active: boolean
  icon: keyof typeof MaterialIcons.glyphMap
  label: string
  onPress: () => void
  badgeVisible?: boolean
}

const SideTab = memo(function SideTab({
  active,
  icon,
  label,
  onPress,
  badgeVisible = false,
}: SideTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <MaterialIcons
          name={icon}
          size={24}
          color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        {badgeVisible ? <NotificationBadge visible variant="attention" /> : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  )
})

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const [tabBarVisible, setTabBarVisible] = useState(tabBarEmitter.getVisible())
  const badgeCount = useBadgeCount()

  useEffect(() => {
    return tabBarEmitter.on(setTabBarVisible)
  }, [])

  const leftRouteIndex = useMemo(
    () => state.routes.findIndex(route => route.name === 'index'),
    [state.routes]
  )
  const rightRouteIndex = useMemo(
    () => state.routes.findIndex(route => route.name === 'tilbud'),
    [state.routes]
  )

  const navigateTo = useCallback(
    (routeIndex: number) => {
      const route = state.routes[routeIndex]
      if (!route) {
        return
      }
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })

      if (!event.defaultPrevented) {
        navigation.navigate(route.name as never)
      }
    },
    [navigation, state.routes]
  )

  const onFabPress = useCallback(() => {
    const aktiv = state.routes[state.index]
    fabEmitter.emit(aktiv?.name)
  }, [state.index, state.routes])

  const onPressVenstre = useCallback(() => {
    if (leftRouteIndex !== -1) {
      navigateTo(leftRouteIndex)
    }
  }, [leftRouteIndex, navigateTo])

  const onPressHøyre = useCallback(() => {
    if (rightRouteIndex !== -1) {
      navigateTo(rightRouteIndex)
    }
  }, [rightRouteIndex, navigateTo])

  if (!tabBarVisible) return null

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View
        style={[
          styles.wrapper,
        ]}
      >
        <View
          style={styles.barSurface}
        >
          <BlurView intensity={GLASS_BLUR_INTENSITY} tint="light" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.barTint} />
          <View pointerEvents="none" style={styles.barHighlightBottom} />

          {leftRouteIndex !== -1 ? (
            <SideTab
              active={state.index === leftRouteIndex}
              icon="mail"
              label="Forespørsler"
              onPress={onPressVenstre}
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
              badgeVisible={badgeCount > 0}
              onPress={onPressHøyre}
            />
          ) : (
            <View style={styles.sideSpacer} />
          )}
        </View>

        <View style={styles.fabShell} pointerEvents="box-none">
          <Pressable
            onPress={onFabPress}
            style={({ pressed }) => [styles.fabButton, pressed && styles.fabButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Opprett nytt tilbud"
          >
            <MaterialIcons name="add" size={34} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  wrapper: {
    paddingHorizontal: 0,
    overflow: 'visible',
  },
  barSurface: {
    marginTop: FAB_LIFT,
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
    zIndex: 1,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  barTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GLASS_OVERLAY,
  },
  barHighlightBottom: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 6,
    height: 1,
    backgroundColor: GLASS_EDGE,
  },
  tabButton: {
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    top: -4,
    paddingVertical: 0,
  },
  iconWrap: {
    position: 'relative',
  },
  tabButtonPressed: {
    opacity: 0.82,
  },
  sideSpacer: {
    minWidth: 108,
  },
  centerSpacer: {
    width: 116,
  },
  tabLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 15,
    color: INACTIVE_COLOR,
  },
  tabLabelActive: {
    fontFamily: 'DMSans_700Bold',
    color: ACTIVE_COLOR,
  },
  fabShell: {
    position: 'absolute',
    top: -3,
    left: '50%',
    width: FAB_TOTAL_SIZE,
    height: FAB_TOTAL_SIZE,
    marginLeft: -(FAB_TOTAL_SIZE / 2),
    borderRadius: FAB_TOTAL_SIZE / 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  fabButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  fabButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
})
