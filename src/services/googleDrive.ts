import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_WEB = '567529670007-i1a3dmi57q12cc00fp5oebisiippr61v.apps.googleusercontent.com';

const STORAGE_KEY = 'google_drive_token';
const FOLDER_NAME = 'BabyTracker';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  createdTime: string;
  size?: string;
}

// Get the redirect URI for the current platform
function getRedirectUri() {
  const uri = AuthSession.makeRedirectUri({
    scheme: 'babytracker',
  });
  console.log('📋 Redirect URI (add this to Google Cloud Console):', uri);
  return uri;
}

// Get stored token
export async function getStoredToken(): Promise<string | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Check if token is expired
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      // Try refresh
      if (parsed.refreshToken) {
        return await refreshAccessToken(parsed.refreshToken);
      }
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
}

// Store token
async function storeToken(accessToken: string, refreshToken?: string, expiresIn?: number) {
  const data = {
    accessToken,
    refreshToken,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Refresh access token
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID_WEB,
      }).toString(),
    });
    const data = await response.json();
    if (data.access_token) {
      await storeToken(data.access_token, refreshToken, data.expires_in);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<{ accessToken: string; user: GoogleUser } | null> {
  const redirectUri = getRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    usePKCE: false,
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.authentication) {
    const { accessToken } = result.authentication;
    const expiresIn = result.authentication.expiresIn;

    await storeToken(accessToken, undefined, expiresIn ?? 3600);

    // Get user info
    const user = await getGoogleUserInfo(accessToken);
    return { accessToken, user };
  }

  return null;
}

// Sign out
export async function signOut() {
  const token = await getStoredToken();
  if (token) {
    try {
      await fetch(`${discovery.revocationEndpoint}?token=${token}`, { method: 'POST' });
    } catch {}
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// Get user info
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return {
    name: data.name || 'User',
    email: data.email || '',
    picture: data.picture || '',
  };
}

// Find or create BabyTracker folder
async function getOrCreateFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const createData = await createResponse.json();
  return createData.id;
}

// Upload file to Google Drive
export async function uploadToDrive(
  accessToken: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<DriveFile | null> {
  try {
    const folderId = await getOrCreateFolder(accessToken);

    // Read file as base64
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
    });

    // Create multipart upload
    const boundary = 'baby_tracker_upload_boundary';
    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
    });

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${fileBase64}\r\n` +
      `--${boundary}--`;

    onProgress?.(0.5);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink,createdTime,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    onProgress?.(1);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Drive upload error:', errText);
      return null;
    }

    const data = await response.json();
    return data as DriveFile;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}

// Upload file from web (File object, no expo-file-system needed)
export async function uploadToDriveWeb(
  accessToken: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<DriveFile | null> {
  try {
    const folderId = await getOrCreateFolder(accessToken);

    const metadata = JSON.stringify({
      name: file.name,
      parents: [folderId],
    });

    const form = new FormData();
    form.append('metadata', new Blob([metadata], { type: 'application/json' }));
    form.append('file', file);

    onProgress?.(0.3);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink,createdTime,size',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    );

    onProgress?.(1);

    if (!response.ok) {
      console.error('Drive web upload error:', await response.text());
      return null;
    }

    return (await response.json()) as DriveFile;
  } catch (error) {
    console.error('Web upload failed:', error);
    return null;
  }
}

// List files in BabyTracker folder
export async function listDriveFiles(accessToken: string): Promise<DriveFile[]> {
  try {
    const folderId = await getOrCreateFolder(accessToken);
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,thumbnailLink,webViewLink,createdTime,size)&orderBy=createdTime desc&pageSize=50`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('List files failed:', error);
    return [];
  }
}

// ─── Data Sync ───────────────────────────────────────────────

const DATA_BACKUP_NAME = 'baby_tracker_data.json';
const SYNC_TIMESTAMP_KEY = 'baby_tracker_last_sync';

// Upload JSON data backup to Drive (creates or updates the single backup file)
export async function uploadDataBackup(
  accessToken: string,
  jsonData: object
): Promise<boolean> {
  try {
    const folderId = await getOrCreateFolder(accessToken);

    // Check if backup file already exists
    const existingFileId = await findDataBackupFile(accessToken, folderId);

    const boundary = 'baby_tracker_data_boundary';
    const metadata = JSON.stringify(
      existingFileId
        ? { name: DATA_BACKUP_NAME }
        : { name: DATA_BACKUP_NAME, parents: [folderId] }
    );
    const content = JSON.stringify(jsonData, null, 2);

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await fetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (response.ok) {
      await storeSyncTimestamp();
      return true;
    }

    console.error('Data backup upload failed:', await response.text());
    return false;
  } catch (error) {
    console.error('Data backup error:', error);
    return false;
  }
}

// Download JSON data backup from Drive
export async function downloadDataBackup(
  accessToken: string
): Promise<object | null> {
  try {
    const folderId = await getOrCreateFolder(accessToken);
    const fileId = await findDataBackupFile(accessToken, folderId);

    if (!fileId) return null;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error('Data restore error:', error);
    return null;
  }
}

// Find the backup file in the BabyTracker folder
async function findDataBackupFile(
  accessToken: string,
  folderId: string
): Promise<string | null> {
  const searchUrl =
    `https://www.googleapis.com/drive/v3/files?q=name='${DATA_BACKUP_NAME}' and '${folderId}' in parents and trashed=false&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`;

  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

// Get last sync info
async function storeSyncTimestamp(): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
  } catch {}
}

export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

// Delete file from Drive
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
