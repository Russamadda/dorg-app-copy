import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'dorg:auto_paminnelser_enabled'

export async function hentAutoPaminnelserEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw === null) return false
    return raw === '1' || raw === 'true'
  } catch {
    return false
  }
}

export async function setAutoPaminnelserEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, enabled ? '1' : '0')
  } catch {
    // Best-effort: innstillingen skal aldri krasje appen.
  }
}

