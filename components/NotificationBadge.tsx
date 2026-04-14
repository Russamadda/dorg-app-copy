import { StyleSheet, Text, View } from 'react-native'
import { Colors } from '../constants/colors'

export interface NotificationBadgeProps {
  count?: number
  visible?: boolean
  /** default = nøytral prikk; attention = varm oransje (tilbud-handling). */
  variant?: 'default' | 'attention'
}

export default function NotificationBadge({
  count,
  visible,
  variant = 'default',
}: NotificationBadgeProps) {
  const visMedTeller = typeof count === 'number'
  const skalVises = visMedTeller ? count > 0 : Boolean(visible)

  if (!skalVises) return null

  if (visMedTeller) {
    const label = count! > 99 ? '99+' : count!.toString()

    return (
      <View style={styles.countBadge} pointerEvents="none">
        <Text style={styles.countText}>{label}</Text>
      </View>
    )
  }

  const dotFill =
    variant === 'attention'
      ? Colors.notificationAttentionDot
      : Colors.notificationBadgeDot
  const dotRing =
    variant === 'attention'
      ? Colors.notificationAttentionBorder
      : Colors.notificationBadgeBorder

  return (
    <View
      style={[styles.dotBadge, { backgroundColor: dotFill, borderColor: dotRing }]}
      pointerEvents="none"
    />
  )
}

const styles = StyleSheet.create({
  dotBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: -3,
    right: -3,
    borderWidth: 1.5,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.notificationBadge,
    position: 'absolute',
    top: -6,
    right: -6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.notificationBadgeBorder,
  },
  countText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    lineHeight: 12,
    color: Colors.notificationBadgeText,
  },
})
