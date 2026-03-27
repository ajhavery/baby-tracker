import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  signInWithGoogle,
  signOut,
  uploadToDriveWeb,
  getStoredToken,
  getGoogleUserInfo,
  uploadToDrive,
  listDriveFiles,
  deleteDriveFile,
  GoogleUser,
  DriveFile,
} from '../services/googleDrive';

const COLORS = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  accent1: '#00B894',
  accent2: '#FDCB6E',
  accent3: '#74B9FF',
  danger: '#E17055',
};

const { width } = Dimensions.get('window');
const THUMB_SIZE = (width - 48 - 16) / 3;

export default function MediaScreen({ navigation }: any) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        setAccessToken(token);
        setIsSignedIn(true);
        const userInfo = await getGoogleUserInfo(token);
        setUser(userInfo);
      }
    } catch {
      // Not signed in
    }
  };

  // Load files when signed in
  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        loadFiles();
      }
    }, [accessToken])
  );

  const loadFiles = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const driveFiles = await listDriveFiles(accessToken);
      setFiles(driveFiles);
    } catch (e) {
      console.error('Failed to load files', e);
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
        setIsSignedIn(true);
      } else {
        Alert.alert('Sign In Failed', 'Could not sign in with Google. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Sign in failed');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Disconnect Google Drive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          setIsSignedIn(false);
          setUser(null);
          setAccessToken(null);
          setFiles([]);
        },
      },
    ]);
  };

  // Web file input helper
  const pickFilesWeb = (accept: string, capture?: string) => {
    return new Promise<File[]>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = !capture;
      if (capture) input.capture = capture;
      input.onchange = () => {
        const files = input.files ? Array.from(input.files) : [];
        resolve(files);
      };
      input.click();
    });
  };

  const takePhoto = async () => {
    setShowActionSheet(false);
    if (Platform.OS === 'web') {
      const files = await pickFilesWeb('image/*', 'environment');
      for (const file of files) await uploadWebFile(file);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadNativeFile(result.assets[0]);
    }
  };

  const takeVideo = async () => {
    setShowActionSheet(false);
    if (Platform.OS === 'web') {
      const files = await pickFilesWeb('video/*', 'environment');
      for (const file of files) await uploadWebFile(file);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to record videos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadNativeFile(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    setShowActionSheet(false);
    if (Platform.OS === 'web') {
      const files = await pickFilesWeb('image/*,video/*');
      for (const file of files) await uploadWebFile(file);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        await uploadNativeFile(asset);
      }
    }
  };

  // Web upload: File object → Drive
  const uploadWebFile = async (file: File) => {
    if (!accessToken) {
      Alert.alert('Not Connected', 'Please sign in to Google Drive first.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    const result = await uploadToDriveWeb(accessToken, file, (p) => setUploadProgress(p));
    setUploading(false);

    if (result) {
      Alert.alert('Uploaded!', `${file.name} saved to Google Drive`);
      loadFiles();
    } else {
      Alert.alert('Upload Failed', 'Could not upload to Google Drive.');
    }
  };

  // Native upload: ImagePicker asset → Drive
  const uploadNativeFile = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!accessToken) {
      Alert.alert('Not Connected', 'Please sign in to Google Drive first.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    const fileName = asset.fileName || `baby_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
    const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';

    const result = await uploadToDrive(
      accessToken,
      asset.uri,
      fileName,
      mimeType,
      (progress) => setUploadProgress(progress)
    );
    setUploading(false);

    if (result) {
      Alert.alert('Uploaded!', `${fileName} saved to Google Drive`);
      loadFiles();
    } else {
      Alert.alert('Upload Failed', 'Could not upload to Google Drive.');
    }
  };

  const handleFilePress = (file: DriveFile) => {
    setSelectedFile(file);
  };

  const handleDeleteFile = (file: DriveFile) => {
    Alert.alert('Delete', `Remove "${file.name}" from Google Drive?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!accessToken) return;
          const success = await deleteDriveFile(accessToken, file.id);
          if (success) {
            setFiles((prev) => prev.filter((f) => f.id !== file.id));
            setSelectedFile(null);
          } else {
            Alert.alert('Error', 'Could not delete file');
          }
        },
      },
    ]);
  };

  const openInDrive = (file: DriveFile) => {
    if (file.webViewLink) {
      Linking.openURL(file.webViewLink);
    }
  };

  const formatFileSize = (size?: string) => {
    if (!size) return '';
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (mimeType: string) => mimeType.startsWith('image/');
  const isVideoFile = (mimeType: string) => mimeType.startsWith('video/');

  // Not signed in - show connect screen
  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photos & Videos</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.connectSection}>
          <View style={styles.driveIconCircle}>
            <Ionicons name="cloud-outline" size={60} color={COLORS.primary} />
          </View>
          <Text style={styles.connectTitle}>Connect Google Drive</Text>
          <Text style={styles.connectSubtitle}>
            Save your baby's photos and videos directly to Google Drive for safe keeping
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.connectButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="camera" size={20} color={COLORS.accent3} />
              <Text style={styles.featureText}>Take photos & videos</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="images" size={20} color={COLORS.accent2} />
              <Text style={styles.featureText}>Upload from gallery</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cloud-upload" size={20} color={COLORS.accent1} />
              <Text style={styles.featureText}>Auto-save to Drive</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="folder" size={20} color={COLORS.secondary} />
              <Text style={styles.featureText}>Organized in BabyTracker folder</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Signed in - show media gallery
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, marginLeft: 12 }]}>Photos & Videos</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <View style={styles.userChip}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.userAvatar} />
            ) : (
              <Ionicons name="person-circle" size={24} color={COLORS.primary} />
            )}
            <Ionicons name="log-out-outline" size={16} color={COLORS.textLight} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.uploadBar}>
          <View style={[styles.uploadProgress, { width: `${uploadProgress * 100}%` }]} />
          <Text style={styles.uploadText}>Uploading to Drive...</Text>
        </View>
      )}

      {/* Drive Status */}
      <View style={styles.driveStatus}>
        <Ionicons name="cloud-done" size={16} color={COLORS.accent1} />
        <Text style={styles.driveStatusText}>
          Connected to Google Drive ({files.length} files)
        </Text>
        <TouchableOpacity onPress={loadFiles}>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Gallery Grid */}
      <ScrollView style={styles.gallery}>
        {loading && files.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading from Drive...</Text>
          </View>
        ) : files.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="images-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No photos or videos yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to capture or upload
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {files.map((file) => (
              <TouchableOpacity
                key={file.id}
                style={styles.gridItem}
                onPress={() => handleFilePress(file)}
                onLongPress={() => handleDeleteFile(file)}
              >
                {file.thumbnailLink ? (
                  <Image
                    source={{ uri: file.thumbnailLink }}
                    style={styles.thumbnail}
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.placeholderThumb]}>
                    <Ionicons
                      name={isVideoFile(file.mimeType) ? 'videocam' : 'image'}
                      size={24}
                      color={COLORS.textLight}
                    />
                  </View>
                )}
                {isVideoFile(file.mimeType) && (
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowActionSheet(true)}
        disabled={uploading}
      >
        <Ionicons name={uploading ? 'cloud-upload' : 'add'} size={28} color="#fff" />
      </TouchableOpacity>

      {/* Action Sheet */}
      <Modal visible={showActionSheet} transparent animationType="fade">
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Add Photo or Video</Text>

            <TouchableOpacity style={styles.actionItem} onPress={takePhoto}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.accent3 + '20' }]}>
                <Ionicons name="camera" size={22} color={COLORS.accent3} />
              </View>
              <View>
                <Text style={styles.actionItemText}>Take Photo</Text>
                <Text style={styles.actionItemSub}>Capture with camera</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={takeVideo}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                <Ionicons name="videocam" size={22} color={COLORS.secondary} />
              </View>
              <View>
                <Text style={styles.actionItemText}>Record Video</Text>
                <Text style={styles.actionItemSub}>Up to 2 minutes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={pickFromGallery}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.accent2 + '20' }]}>
                <Ionicons name="images" size={22} color={COLORS.accent2} />
              </View>
              <View>
                <Text style={styles.actionItemText}>Choose from Gallery</Text>
                <Text style={styles.actionItemSub}>Select up to 10 at once</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelAction}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* File Detail Modal */}
      <Modal visible={!!selectedFile} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailContent}>
            <TouchableOpacity
              style={styles.detailClose}
              onPress={() => setSelectedFile(null)}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {selectedFile && (
              <>
                {selectedFile.thumbnailLink ? (
                  <Image
                    source={{ uri: selectedFile.thumbnailLink.replace('=s220', '=s600') }}
                    style={styles.detailImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.detailImage, styles.placeholderThumb]}>
                    <Ionicons
                      name={isVideoFile(selectedFile.mimeType) ? 'videocam' : 'image'}
                      size={48}
                      color={COLORS.textLight}
                    />
                  </View>
                )}

                <Text style={styles.detailName}>{selectedFile.name}</Text>
                <Text style={styles.detailMeta}>
                  {new Date(selectedFile.createdTime).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {selectedFile.size ? ` • ${formatFileSize(selectedFile.size)}` : ''}
                </Text>

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailBtn, { backgroundColor: COLORS.primary }]}
                    onPress={() => openInDrive(selectedFile)}
                  >
                    <Ionicons name="open-outline" size={18} color="#fff" />
                    <Text style={styles.detailBtnText}>Open in Drive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailBtn, { backgroundColor: COLORS.danger }]}
                    onPress={() => handleDeleteFile(selectedFile)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.detailBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  userAvatar: { width: 24, height: 24, borderRadius: 12 },
  uploadBar: {
    height: 32,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary + '30',
  },
  uploadText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  driveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  driveStatusText: { flex: 1, fontSize: 13, color: COLORS.textLight },
  gallery: { flex: 1, padding: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: COLORS.textLight, fontSize: 14 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { color: COLORS.textLight, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#ccc', fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Connect screen
  connectSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  driveIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  featureList: { gap: 16, width: '100%' },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
  },
  featureText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  // Action sheet
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItemText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  actionItemSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  cancelAction: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelActionText: { fontSize: 16, fontWeight: '600', color: COLORS.textLight },
  // File detail
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },
  detailContent: {
    backgroundColor: COLORS.card,
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  detailClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  detailImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginVertical: 16,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  detailMeta: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
