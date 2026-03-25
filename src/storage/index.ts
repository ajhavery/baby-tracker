import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedEntry, DiaperEntry, GrowthEntry, BabyProfile } from '../types';

const KEYS = {
  FEEDS: 'baby_tracker_feeds',
  DIAPERS: 'baby_tracker_diapers',
  GROWTH: 'baby_tracker_growth',
  PROFILE: 'baby_tracker_profile',
};

// In-memory fallback when AsyncStorage native module isn't available (Expo Go)
const memoryStore: Record<string, string> = {};
let useMemory = false;

async function storageGet(key: string): Promise<string | null> {
  if (useMemory) return memoryStore[key] ?? null;
  try {
    return await AsyncStorage.getItem(key);
  } catch (e: any) {
    if (e?.message?.includes('Native module') || e?.message?.includes('null')) {
      console.warn('AsyncStorage native module unavailable, using in-memory fallback');
      useMemory = true;
      return memoryStore[key] ?? null;
    }
    throw e;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (useMemory) {
    memoryStore[key] = value;
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.message?.includes('Native module') || e?.message?.includes('null')) {
      useMemory = true;
      memoryStore[key] = value;
      return;
    }
    throw e;
  }
}

async function storageRemove(key: string): Promise<void> {
  if (useMemory) {
    delete memoryStore[key];
    return;
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch (e: any) {
    if (e?.message?.includes('Native module') || e?.message?.includes('null')) {
      useMemory = true;
      delete memoryStore[key];
      return;
    }
    throw e;
  }
}

// Generic helpers
async function getItems<T>(key: string): Promise<T[]> {
  const data = await storageGet(key);
  return data ? JSON.parse(data) : [];
}

async function saveItems<T>(key: string, items: T[]): Promise<void> {
  await storageSet(key, JSON.stringify(items));
}

// Feed entries
export async function getFeeds(): Promise<FeedEntry[]> {
  return getItems<FeedEntry>(KEYS.FEEDS);
}

export async function getFeedsByDate(date: string): Promise<FeedEntry[]> {
  const feeds = await getFeeds();
  return feeds.filter((f) => f.date === date).sort((a, b) => a.time.localeCompare(b.time));
}

export async function addFeed(entry: FeedEntry): Promise<void> {
  const feeds = await getFeeds();
  feeds.push(entry);
  await saveItems(KEYS.FEEDS, feeds);
}

export async function deleteFeed(id: string): Promise<void> {
  const feeds = await getFeeds();
  await saveItems(KEYS.FEEDS, feeds.filter((f) => f.id !== id));
}

// Diaper entries
export async function getDiapers(): Promise<DiaperEntry[]> {
  return getItems<DiaperEntry>(KEYS.DIAPERS);
}

export async function getDiapersByDate(date: string): Promise<DiaperEntry[]> {
  const diapers = await getDiapers();
  return diapers.filter((d) => d.date === date).sort((a, b) => a.time.localeCompare(b.time));
}

export async function addDiaper(entry: DiaperEntry): Promise<void> {
  const diapers = await getDiapers();
  diapers.push(entry);
  await saveItems(KEYS.DIAPERS, diapers);
}

export async function deleteDiaper(id: string): Promise<void> {
  const diapers = await getDiapers();
  await saveItems(KEYS.DIAPERS, diapers.filter((d) => d.id !== id));
}

// Growth entries
export async function getGrowthRecords(): Promise<GrowthEntry[]> {
  return getItems<GrowthEntry>(KEYS.GROWTH);
}

export async function addGrowthRecord(entry: GrowthEntry): Promise<void> {
  const records = await getGrowthRecords();
  records.push(entry);
  await saveItems(KEYS.GROWTH, records);
}

export async function deleteGrowthRecord(id: string): Promise<void> {
  const records = await getGrowthRecords();
  await saveItems(KEYS.GROWTH, records.filter((r) => r.id !== id));
}

// Baby profile
export async function getProfile(): Promise<BabyProfile | null> {
  const data = await storageGet(KEYS.PROFILE);
  return data ? JSON.parse(data) : null;
}

export async function saveProfile(profile: BabyProfile): Promise<void> {
  await storageSet(KEYS.PROFILE, JSON.stringify(profile));
}

// Export all data for sync
export async function exportAllData(): Promise<{
  feeds: FeedEntry[];
  diapers: DiaperEntry[];
  growth: GrowthEntry[];
  profile: BabyProfile | null;
  exportedAt: string;
}> {
  const [feeds, diapers, growth, profile] = await Promise.all([
    getFeeds(),
    getDiapers(),
    getGrowthRecords(),
    getProfile(),
  ]);
  return { feeds, diapers, growth, profile, exportedAt: new Date().toISOString() };
}

// Import all data from sync
export async function importAllData(data: {
  feeds?: FeedEntry[];
  diapers?: DiaperEntry[];
  growth?: GrowthEntry[];
  profile?: BabyProfile | null;
}): Promise<{ feeds: number; diapers: number; growth: number }> {
  // Merge strategy: combine by id, newer data wins
  const existingFeeds = await getFeeds();
  const existingDiapers = await getDiapers();
  const existingGrowth = await getGrowthRecords();

  const mergedFeeds = mergeById(existingFeeds, data.feeds || []);
  const mergedDiapers = mergeById(existingDiapers, data.diapers || []);
  const mergedGrowth = mergeById(existingGrowth, data.growth || []);

  await saveItems(KEYS.FEEDS, mergedFeeds);
  await saveItems(KEYS.DIAPERS, mergedDiapers);
  await saveItems(KEYS.GROWTH, mergedGrowth);

  // Profile: incoming wins if present
  if (data.profile) {
    await saveProfile(data.profile);
  }

  return {
    feeds: mergedFeeds.length,
    diapers: mergedDiapers.length,
    growth: mergedGrowth.length,
  };
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item); // incoming overwrites
  return Array.from(map.values());
}

// Seed data
export async function seedSampleData(): Promise<void> {
  const existing = await getFeeds();
  if (existing.length > 0) return; // Already seeded

  const sampleFeeds: FeedEntry[] = [
    { id: '1', date: '2026-03-23', time: '07:00', type: 'expressed', amountMl: 55 },
    { id: '2', date: '2026-03-23', time: '07:15', type: 'latched', startTime: '07:15', endTime: '07:20', durationMinutes: 5 },
    { id: '3', date: '2026-03-23', time: '09:00', type: 'expressed', amountMl: 80 },
    { id: '4', date: '2026-03-23', time: '11:40', type: 'expressed', amountMl: 80 },
    { id: '5', date: '2026-03-23', time: '14:25', type: 'expressed', amountMl: 70 },
    { id: '6', date: '2026-03-23', time: '16:10', type: 'latched', startTime: '16:10', endTime: '16:22', durationMinutes: 12 },
    { id: '7', date: '2026-03-23', time: '17:00', type: 'expressed', amountMl: 60 },
    { id: '8', date: '2026-03-23', time: '18:22', type: 'latched', startTime: '18:22', endTime: '18:33', durationMinutes: 11 },
  ];

  await saveItems(KEYS.FEEDS, sampleFeeds);
}
