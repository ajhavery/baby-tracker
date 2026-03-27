import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FeedEntry, DiaperEntry, GrowthEntry, BabyProfile,
  DailyTask, TaskCompletion, VaccinationRecord,
} from '../types';

const KEYS = {
  FEEDS: 'baby_tracker_feeds',
  DIAPERS: 'baby_tracker_diapers',
  GROWTH: 'baby_tracker_growth',
  PROFILE: 'baby_tracker_profile',
  TASKS: 'baby_tracker_tasks',
  TASK_COMPLETIONS: 'baby_tracker_task_completions',
  VACCINATIONS: 'baby_tracker_vaccinations',
};

// On web/PWA, use localStorage directly (persistent and reliable).
// On native, use AsyncStorage.
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
}

// Generic helpers
async function getItems<T>(key: string): Promise<T[]> {
  const data = await storageGet(key);
  return data ? JSON.parse(data) : [];
}

async function saveItems<T>(key: string, items: T[]): Promise<void> {
  await storageSet(key, JSON.stringify(items));
}

// ─── Feed entries ───
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
export async function updateFeed(updated: FeedEntry): Promise<void> {
  const feeds = await getFeeds();
  const idx = feeds.findIndex((f) => f.id === updated.id);
  if (idx >= 0) feeds[idx] = updated;
  await saveItems(KEYS.FEEDS, feeds);
}
export async function deleteFeed(id: string): Promise<void> {
  const feeds = await getFeeds();
  await saveItems(KEYS.FEEDS, feeds.filter((f) => f.id !== id));
}

// ─── Diaper entries ───
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
export async function updateDiaper(updated: DiaperEntry): Promise<void> {
  const diapers = await getDiapers();
  const idx = diapers.findIndex((d) => d.id === updated.id);
  if (idx >= 0) diapers[idx] = updated;
  await saveItems(KEYS.DIAPERS, diapers);
}
export async function deleteDiaper(id: string): Promise<void> {
  const diapers = await getDiapers();
  await saveItems(KEYS.DIAPERS, diapers.filter((d) => d.id !== id));
}

// ─── Growth entries ───
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

// ─── Baby profile ───
export async function getProfile(): Promise<BabyProfile | null> {
  const data = await storageGet(KEYS.PROFILE);
  return data ? JSON.parse(data) : null;
}
export async function saveProfile(profile: BabyProfile): Promise<void> {
  await storageSet(KEYS.PROFILE, JSON.stringify(profile));
}

// ─── Daily Tasks ───
export async function getTasks(): Promise<DailyTask[]> {
  return getItems<DailyTask>(KEYS.TASKS);
}
export async function addTask(task: DailyTask): Promise<void> {
  const tasks = await getTasks();
  tasks.push(task);
  await saveItems(KEYS.TASKS, tasks);
}
export async function updateTask(updated: DailyTask): Promise<void> {
  const tasks = await getTasks();
  const idx = tasks.findIndex((t) => t.id === updated.id);
  if (idx >= 0) tasks[idx] = updated;
  await saveItems(KEYS.TASKS, tasks);
}
export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  await saveItems(KEYS.TASKS, tasks.filter((t) => t.id !== id));
  // Also delete completions for this task
  const completions = await getTaskCompletions();
  await saveItems(KEYS.TASK_COMPLETIONS, completions.filter((c) => c.taskId !== id));
}

export async function getTaskCompletions(): Promise<TaskCompletion[]> {
  return getItems<TaskCompletion>(KEYS.TASK_COMPLETIONS);
}
export async function getTaskCompletionsByDate(date: string): Promise<TaskCompletion[]> {
  const completions = await getTaskCompletions();
  return completions.filter((c) => c.date === date);
}
export async function addTaskCompletion(completion: TaskCompletion): Promise<void> {
  const completions = await getTaskCompletions();
  completions.push(completion);
  await saveItems(KEYS.TASK_COMPLETIONS, completions);
}
export async function removeTaskCompletion(taskId: string, date: string): Promise<void> {
  const completions = await getTaskCompletions();
  await saveItems(KEYS.TASK_COMPLETIONS, completions.filter((c) => !(c.taskId === taskId && c.date === date)));
}

// ─── Vaccination Records ───
export async function getVaccinations(): Promise<VaccinationRecord[]> {
  return getItems<VaccinationRecord>(KEYS.VACCINATIONS);
}
export async function addVaccination(record: VaccinationRecord): Promise<void> {
  const records = await getVaccinations();
  records.push(record);
  await saveItems(KEYS.VACCINATIONS, records);
}
export async function deleteVaccination(id: string): Promise<void> {
  const records = await getVaccinations();
  await saveItems(KEYS.VACCINATIONS, records.filter((r) => r.id !== id));
}

// ─── Export / Import (Google Drive sync) ───
export async function exportAllData() {
  const [feeds, diapers, growth, profile, tasks, taskCompletions, vaccinations] = await Promise.all([
    getFeeds(), getDiapers(), getGrowthRecords(), getProfile(),
    getTasks(), getTaskCompletions(), getVaccinations(),
  ]);
  return { feeds, diapers, growth, profile, tasks, taskCompletions, vaccinations, exportedAt: new Date().toISOString() };
}

export async function importAllData(data: {
  feeds?: FeedEntry[];
  diapers?: DiaperEntry[];
  growth?: GrowthEntry[];
  profile?: BabyProfile | null;
  tasks?: DailyTask[];
  taskCompletions?: TaskCompletion[];
  vaccinations?: VaccinationRecord[];
}) {
  const [existingFeeds, existingDiapers, existingGrowth, existingTasks, existingCompletions, existingVax] = await Promise.all([
    getFeeds(), getDiapers(), getGrowthRecords(), getTasks(), getTaskCompletions(), getVaccinations(),
  ]);

  const mergedFeeds = mergeById(existingFeeds, data.feeds || []);
  const mergedDiapers = mergeById(existingDiapers, data.diapers || []);
  const mergedGrowth = mergeById(existingGrowth, data.growth || []);
  const mergedTasks = mergeById(existingTasks, data.tasks || []);
  const mergedCompletions = mergeById(existingCompletions, data.taskCompletions || []);
  const mergedVax = mergeById(existingVax, data.vaccinations || []);

  await Promise.all([
    saveItems(KEYS.FEEDS, mergedFeeds),
    saveItems(KEYS.DIAPERS, mergedDiapers),
    saveItems(KEYS.GROWTH, mergedGrowth),
    saveItems(KEYS.TASKS, mergedTasks),
    saveItems(KEYS.TASK_COMPLETIONS, mergedCompletions),
    saveItems(KEYS.VACCINATIONS, mergedVax),
  ]);

  if (data.profile) await saveProfile(data.profile);

  return { feeds: mergedFeeds.length, diapers: mergedDiapers.length, growth: mergedGrowth.length };
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

// Seed data
export async function seedSampleData(): Promise<void> {
  const existing = await getFeeds();
  if (existing.length > 0) return;

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
