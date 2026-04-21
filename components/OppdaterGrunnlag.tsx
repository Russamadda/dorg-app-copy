import React, { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'

type Props = {
  timer: number
  material: number
  timepris: number
  materialPaslag: number
  harAktivMaterialspesifisering: boolean
  onTimerChange: (value: number) => void
  onMaterialChange: (value: number) => void
}

const GREEN = '#2ECC8E'
const TRACK_BG = 'rgba(255,255,255,0.10)'
const THUMB = '#FFFFFF'

export function OppdaterGrunnlag({
  timer,
  material,
  timepris,
  materialPaslag,
  harAktivMaterialspesifisering,
  onTimerChange,
  onMaterialChange,
}: Props) {
  const sisteTimerRef = useRef(timer)
  const sisteMaterialRef = useRef(material)

  useEffect(() => {
    sisteTimerRef.current = timer
  }, [timer])

  useEffect(() => {
    sisteMaterialRef.current = material
  }, [material])

  const spillTick = () => {
    if (Platform.OS === 'ios') {
      void Haptics.selectionAsync()
    }
  }

  const handleTimerChange = (value: number) => {
    const nesteVerdi = Math.round(value)
    if (nesteVerdi !== sisteTimerRef.current) {
      spillTick()
      sisteTimerRef.current = nesteVerdi
    }
    onTimerChange(nesteVerdi)
  }

  const handleMaterialChange = (value: number) => {
    if (harAktivMaterialspesifisering) return
    const nesteVerdi = Math.round(value / 500) * 500
    if (nesteVerdi !== sisteMaterialRef.current) {
      spillTick()
      sisteMaterialRef.current = nesteVerdi
    }
    onMaterialChange(nesteVerdi)
  }

  return (
    <View style={styles.wrap}>
      <SliderRow
        label="Timer"
        value={`${timer}`}
        unit="t"
        hint={`${timepris.toLocaleString('nb-NO')} kr/t`}
        minimumValue={0}
        maximumValue={40}
        step={1}
        currentValue={timer}
        onChange={handleTimerChange}
      />

      {harAktivMaterialspesifisering ? (
        <LockedMaterialRow
          value={material.toLocaleString('nb-NO')}
          currentValue={material}
        />
      ) : (
        <SliderRow
          label="Material"
          value={material.toLocaleString('nb-NO')}
          unit="kr"
          hint={`+${materialPaslag} % påslag`}
          minimumValue={0}
          maximumValue={60000}
          step={500}
          currentValue={material}
          onChange={handleMaterialChange}
        />
      )}
    </View>
  )
}

function LockedMaterialRow({
  value,
  currentValue,
}: {
  value: string
  currentValue: number
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.valueWrap}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Material</Text>
            <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.55)" />
          </View>
          <Text style={styles.value}>
            {value}
            <Text style={styles.unit}> kr</Text>
          </Text>
        </View>
        <Text style={styles.hint}>fra spesifikasjon</Text>
      </View>

      <Slider
        style={[styles.slider, { opacity: 0.4 }]}
        minimumValue={0}
        maximumValue={60000}
        step={500}
        value={currentValue}
        disabled={true}
        minimumTrackTintColor={GREEN}
        maximumTrackTintColor={TRACK_BG}
        thumbTintColor={THUMB}
      />
    </View>
  )
}

function SliderRow({
  label,
  value,
  unit,
  hint,
  minimumValue,
  maximumValue,
  step,
  currentValue,
  onChange,
}: {
  label: string
  value: string
  unit: string
  hint: string
  minimumValue: number
  maximumValue: number
  step: number
  currentValue: number
  onChange: (value: number) => void
}) {
  const [sliderValue, setSliderValue] = useState(currentValue)

  useEffect(() => {
    setSliderValue(currentValue)
  }, [currentValue])

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.valueWrap}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>
            {value}
            <Text style={styles.unit}> {unit}</Text>
          </Text>
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={sliderValue}
        onValueChange={(v) => {
          setSliderValue(v)
          onChange(v)
        }}
        minimumTrackTintColor={GREEN}
        maximumTrackTintColor={TRACK_BG}
        thumbTintColor={THUMB}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 18,
    marginBottom: 18,
  },
  row: {
    gap: 10,
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  valueWrap: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.55)',
  },
  value: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    lineHeight: 28,
    color: '#FFFFFF',
    letterSpacing: -0.35,
  },
  unit: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.55)',
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'right',
    paddingBottom: 4,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
})
