import { StyleSheet, Text, View } from 'react-native'

export interface NotificationBadgeProps {
  count?: number
  visible?: boolean
}

export default function NotificationBadge({
  count,
  visible,
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

  return <View style={styles.dotBadge} pointerEvents="none" />
}

const styles = StyleSheet.create({
  dotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    position: 'absolute',
    top: -2,
    right: -2,
    borderWidth: 1.5,
    borderColor: '#F0EFE9',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    position: 'absolute',
    top: -6,
    right: -6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#F0EFE9',
  },
  countText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    lineHeight: 12,
    color: '#FFFFFF',
  },
})
