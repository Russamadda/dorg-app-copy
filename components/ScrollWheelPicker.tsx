import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Colors } from '../constants/colors'

interface Props {
  label: string
  value: number
  onChange: (val: number) => void
  values: number[]
  suffix: string
}

export default function ScrollWheelPicker({ label, value, onChange, values, suffix }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={value}
          onValueChange={(v) => onChange(Number(v))}
          style={styles.picker}
          itemStyle={styles.item}
        >
          {values.map(v => (
            <Picker.Item
              key={v}
              label={`${v.toLocaleString('nb-NO')} ${suffix}`}
              value={v}
            />
          ))}
        </Picker>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    overflow: 'hidden',
    height: 120,
  },
  picker: {
    height: 120,
  },
  item: {
    fontSize: 15,
    color: '#111827',
    height: 120,
  },
})
