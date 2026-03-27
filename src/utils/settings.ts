import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'baby_tracker_settings';

export interface AppSettings {
  dayStartHour: number; // 0-23, default 6 (6 AM)
}

const DEFAULT_SETTINGS: AppSettings = {
  dayStartHour: 6,
};

// In-memory cache so helpers don't need async calls
let cachedSettings: AppSettings = { ...DEFAULT_SETTINGS };

function storageGet(key: string): string | null {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return null; // For native, we load async on init
}

function storageSet(key: string, value: string): void {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
  }
}

// Load settings into cache (call on app start)
export async function loadSettings(): Promise<AppSettings> {
  try {
    let data: string | null = null;
    if (Platform.OS === 'web') {
      data = storageGet(SETTINGS_KEY);
    } else {
      data = await AsyncStorage.getItem(SETTINGS_KEY);
    }
    if (data) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch {}
  return cachedSettings;
}

// Save settings
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  cachedSettings = { ...cachedSettings, ...settings };
  const json = JSON.stringify(cachedSettings);
  if (Platform.OS === 'web') {
    storageSet(SETTINGS_KEY, json);
  } else {
    try { await AsyncStorage.setItem(SETTINGS_KEY, json); } catch {}
  }
}

// Get cached day start hour (synchronous, no async needed)
export function getDayStartHour(): number {
  // Try loading from localStorage synchronously on web
  if (Platform.OS === 'web' && cachedSettings.dayStartHour === DEFAULT_SETTINGS.dayStartHour) {
    const data = storageGet(SETTINGS_KEY);
    if (data) {
      try { cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) }; } catch {}
    }
  }
  return cachedSettings.dayStartHour;
}

export function getSettings(): AppSettings {
  return { ...cachedSettings };
}

// Initialize on module load for web
if (Platform.OS === 'web') {
  const data = storageGet(SETTINGS_KEY);
  if (data) {
    try { cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) }; } catch {}
  }
}
