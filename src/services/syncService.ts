import { exportAllData, importAllData } from '../storage';
import {
  getStoredToken,
  uploadDataBackup,
  downloadDataBackup,
  getLastSyncTime,
} from './googleDrive';

export interface SyncResult {
  success: boolean;
  direction: 'upload' | 'download' | 'both';
  message: string;
  counts?: { feeds: number; diapers: number; growth: number };
}

// Push local data to Google Drive
export async function syncToCloud(): Promise<SyncResult> {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, direction: 'upload', message: 'Not signed in to Google Drive' };
  }

  try {
    const data = await exportAllData();
    const uploaded = await uploadDataBackup(token, data);

    if (uploaded) {
      return {
        success: true,
        direction: 'upload',
        message: `Backed up ${data.feeds.length} feeds, ${data.diapers.length} diapers, ${data.growth.length} growth records`,
        counts: { feeds: data.feeds.length, diapers: data.diapers.length, growth: data.growth.length },
      };
    }
    return { success: false, direction: 'upload', message: 'Upload to Drive failed' };
  } catch (error: any) {
    return { success: false, direction: 'upload', message: error.message || 'Sync failed' };
  }
}

// Pull data from Google Drive and merge into local
export async function syncFromCloud(): Promise<SyncResult> {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, direction: 'download', message: 'Not signed in to Google Drive' };
  }

  try {
    const cloudData = await downloadDataBackup(token);

    if (!cloudData) {
      return { success: false, direction: 'download', message: 'No backup found on Google Drive' };
    }

    const typedData = cloudData as any;
    const counts = await importAllData({
      feeds: typedData.feeds,
      diapers: typedData.diapers,
      growth: typedData.growth,
      profile: typedData.profile,
    });

    return {
      success: true,
      direction: 'download',
      message: `Restored ${counts.feeds} feeds, ${counts.diapers} diapers, ${counts.growth} growth records`,
      counts,
    };
  } catch (error: any) {
    return { success: false, direction: 'download', message: error.message || 'Restore failed' };
  }
}

// Full two-way sync: download first (merge), then upload merged result
export async function fullSync(): Promise<SyncResult> {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, direction: 'both', message: 'Not signed in to Google Drive' };
  }

  try {
    // Step 1: Download and merge cloud data
    const cloudData = await downloadDataBackup(token);
    if (cloudData) {
      const typedData = cloudData as any;
      await importAllData({
        feeds: typedData.feeds,
        diapers: typedData.diapers,
        growth: typedData.growth,
        profile: typedData.profile,
      });
    }

    // Step 2: Upload merged data back
    const mergedData = await exportAllData();
    const uploaded = await uploadDataBackup(token, mergedData);

    if (uploaded) {
      return {
        success: true,
        direction: 'both',
        message: `Synced ${mergedData.feeds.length} feeds, ${mergedData.diapers.length} diapers, ${mergedData.growth.length} growth records`,
        counts: {
          feeds: mergedData.feeds.length,
          diapers: mergedData.diapers.length,
          growth: mergedData.growth.length,
        },
      };
    }

    return { success: false, direction: 'both', message: 'Upload after merge failed' };
  } catch (error: any) {
    return { success: false, direction: 'both', message: error.message || 'Sync failed' };
  }
}

export { getLastSyncTime };
