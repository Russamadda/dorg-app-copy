import { View, StyleSheet, type TextStyle, type StyleProp, type ViewStyle } from 'react-native'
import { Picker } from '@react-native-picker/picker'

interface Props {
  value: number
  onChange: (val: number) => void
  values: number[]
  suffix: string
  formatLabel?: (v: number) => string
  itemStyle?: StyleProp<TextStyle>
  wrapperStyle?: StyleProp<ViewStyle>
  itemColor?: string
}

export default function ScrollWheelPicker({
  value,
  onChange,
  values,
  suffix,
  formatLabel,
  itemStyle,
  wrapperStyle,
  itemColor,
}: Props) {
  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(Number(v))}
        style={styles.picker}
        itemStyle={[styles.item, itemColor ? { color: itemColor } : null, itemStyle]}
      >
        {values.map((v) => (
          <Picker.Item
            key={String(v)}
            label={formatLabel ? formatLabel(v) : `${v.toLocaleString('nb-NO')} ${suffix}`}
            value={v}
          />
        ))}
      </Picker>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    flex: 1,
  },
  item: {
    fontSize: 13,
    color: '#111827',
    height: 130,
  },
})
