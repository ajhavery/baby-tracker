import { getStoredToken } from './googleDrive';
import { syncToCloud } from './syncService';

// Debounced auto-sync: pushes local data to Drive after a data change
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function triggerAutoSync(delayMs: number = 5000) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const token = await getStoredToken();
      if (!token) return; // Not connected, skip
      await syncToCloud();
      console.log('Auto-sync completed');
    } catch (e) {
      console.warn('Auto-sync failed:', e);
    }
  }, delayMs);
}
