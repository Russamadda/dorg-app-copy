import { Text, View, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { beregnTilbudPrisLinjer } from '../lib/tilbudPris'

export const TIMER_VERDIER = [
  0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40,
  48, 56, 64, 80, 100, 120, 160, 200,
]
export const MAT_VERDIER = [
  0, 500, 1000, 1500, 2000, 2500, 3000,
  4000, 5000, 6000, 8000, 10000, 15000,
  20000, 25000, 30000, 40000, 50000,
]
export const MATERIALER_VERDIER = MAT_VERDIER

interface Props {
  timer: number
  materialkostnad: number
  timepris: number
  materialPaslag: number
  onTimerChange: (t: number) => void
  onMaterialChange: (m: number) => void
}

export default function PrisKalkulator({
  timer,
  materialkostnad,
  timepris,
  materialPaslag,
  onTimerChange,
  onMaterialChange,
}: Props) {
  const prisLinjer = beregnTilbudPrisLinjer({
    timer,
    materialkostnad,
    timepris,
    materialPaslag,
  })
  const totalInklMva = prisLinjer.totalInklMva
  const arbeidInklMva = prisLinjer.arbeidInklMva
  const materialInklMva = prisLinjer.materialerInklMva
  const timerItemStyle = [styles.pickerItem, styles.timerPickerItem]
  const materialItemStyle = [styles.pickerItem, styles.materialPickerItem]

  return (
    <View style={styles.prisRad}>
      <View style={styles.prisKortWrap}>
        <Text style={styles.scrollLabel}>PRISESTIMAT</Text>
        <View style={styles.prisKort}>
          <View style={styles.prisDetaljRad}>
            <Text style={styles.prisDetaljLabel}>Arbeid</Text>
            <View style={styles.prisVerdiRad}>
              <Text style={styles.prisDetaljKr}>Kr</Text>
              <View style={styles.prisDetaljVerdiWrap}>
                <Text style={styles.prisDetaljVerdi}>
                  {arbeidInklMva.toLocaleString('no-NO')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.prisDetaljRad}>
            <Text style={styles.prisDetaljLabel}>Material</Text>
            <View style={styles.prisVerdiRad}>
              <Text style={styles.prisDetaljKr}>Kr</Text>
              <View style={styles.prisDetaljVerdiWrap}>
                <Text style={styles.prisDetaljVerdi}>
                  {materialInklMva.toLocaleString('no-NO')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.skillelinje} />
          <View style={styles.prisBelopRad}>
            <Text style={styles.prisBelopKr}>Kr</Text>
            <View style={[styles.prisDetaljVerdiWrap, styles.prisBelopPille]}>
              <Text style={styles.prisBelop}>
                {totalInklMva.toLocaleString('no-NO')}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.prisMva}>inkl. mva</Text>
      </View>

      <View style={styles.timerKort}>
        <Text style={styles.scrollLabel}>TIMER</Text>
        <Picker
          selectedValue={timer}
          onValueChange={(v) => onTimerChange(Number(v))}
          style={styles.picker}
          itemStyle={timerItemStyle}
        >
          {TIMER_VERDIER.map((v) => (
            <Picker.Item
              key={String(v)}
              label={v < 1 ? '½ t' : `${v} t`}
              value={v}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.materialKort}>
        <Text style={styles.scrollLabel}>MATERIALER</Text>
        <Picker
          selectedValue={materialkostnad}
          onValueChange={(v) => onMaterialChange(Number(v))}
          style={styles.picker}
          itemStyle={materialItemStyle}
        >
          {MAT_VERDIER.map((v) => (
            <Picker.Item
              key={String(v)}
              label={
                v === 0
                  ? '0 Kr'
                  : `${v.toLocaleString('no-NO')} Kr`
              }
              value={v}
            />
          ))}
        </Picker>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  prisRad: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
    marginVertical: 16,
  },
  prisKortWrap: {
    flex: 1.24,
  },
  prisKort: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    height: 130,
  },
  timerKort: {
    flex: 1.02,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingTop: 12,
    overflow: 'hidden',
  },
  materialKort: {
    flex: 0.98,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingTop: 12,
    overflow: 'hidden',
  },
  scrollLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  prisBelop: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1B4332',
    textAlign: 'right',
    marginBottom: 1,
  },
  prisMva: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 10,
    textAlign: 'center',
  },
  skillelinje: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 3,
    marginBottom: 8,
  },
  prisDetaljRad: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prisVerdiRad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  prisDetaljLabel: {
    width: 56,
    fontSize: 12,
    color: '#6B7280',
  },
  prisDetaljVerdiWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: '#F7FAF8',
    borderWidth: 1,
    borderColor: '#E2E8E4',
  },
  prisDetaljKr: {
    width: 20,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'left',
  },
  prisDetaljVerdi: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  prisBelopRad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prisBelopPille: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: '#F1F7F3',
    borderColor: '#D9E8DE',
  },
  prisBelopKr: {
    width: 26,
    fontSize: 19,
    fontWeight: '700',
    color: '#1B4332',
    textAlign: 'left',
    marginBottom: 0,
  },
  picker: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pickerItem: {
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  timerPickerItem: {
    fontSize: 15,
  },
  materialPickerItem: {
    fontSize: 13,
  },
})
