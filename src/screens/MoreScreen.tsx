import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_TOP_PADDING } from '../utils/platform';
import {
  signInWithGoogle, signOut, getStoredToken, getGoogleUserInfo,
  getLastSyncTime, GoogleUser,
} from '../services/googleDrive';
import { fullSync } from '../services/syncService';

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
};

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  color: string;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'trending-up', label: 'Growth', subtitle: 'Weight, height, head circumference', color: COLORS.accent2, screen: 'Growth' },
  { icon: 'medical', label: 'Vaccinations', subtitle: 'Immunization schedule & records', color: COLORS.secondary, screen: 'Vaccinations' },
  { icon: 'camera', label: 'Photos & Videos', subtitle: 'Capture and upload to Google Drive', color: COLORS.accent3, screen: 'Media' },
  { icon: 'download-outline', label: 'Export Report', subtitle: 'Generate and share reports', color: COLORS.accent1, screen: 'Export' },
  { icon: 'person-circle', label: 'Baby Profile', subtitle: 'Name, DOB, blood group', color: COLORS.primary, screen: 'Profile' },
];

export default function MoreScreen({ navigation }: any) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        setIsSignedIn(true);
        const userInfo = await getGoogleUserInfo(token);
        setUser(userInfo);
      } else {
        setIsSignedIn(false);
        setUser(null);
      }
      const syncTime = await getLastSyncTime();
      setLastSync(syncTime);
    } catch {
      setIsSignedIn(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { checkAuth(); }, [checkAuth]));

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setIsSignedIn(true);
        setUser(result.user);
        // Auto-sync after sign in
        setSyncing(true);
        await fullSync();
        setSyncing(false);
        const syncTime = await getLastSyncTime();
        setLastSync(syncTime);
      } else {
        Alert.alert('Sign In Failed', 'Could not sign in with Google.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Sign in failed');
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Disconnect Google Drive? Your local data will remain.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await signOut();
          setIsSignedIn(false);
          setUser(null);
          setLastSync(null);
        },
      },
    ]);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await fullSync();
      if (result.success) {
        Alert.alert('Synced!', result.message);
      } else {
        Alert.alert('Sync Failed', result.message);
      }
      const syncTime = await getLastSyncTime();
      setLastSync(syncTime);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Sync failed');
    }
    setSyncing(false);
  };

  const formatSyncTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView style={styles.list}>
        {/* Google Drive Section */}
        <Text style={styles.sectionLabel}>GOOGLE DRIVE</Text>
        {isSignedIn ? (
          <View style={styles.driveCard}>
            <View style={styles.driveHeader}>
              <View style={styles.driveUserRow}>
                {user?.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.driveName}>{user?.name || 'Connected'}</Text>
                  <Text style={styles.driveEmail}>{user?.email}</Text>
                </View>
                <Ionicons name="cloud-done" size={20} color={COLORS.accent1} />
              </View>

              <View style={styles.driveInfo}>
                <Ionicons name="folder-open" size={14} color={COLORS.textLight} />
                <Text style={styles.driveInfoText}>
                  Data syncs to <Text style={{ fontWeight: '700' }}>BabyTracker</Text> folder
                </Text>
              </View>

              {lastSync && (
                <View style={styles.driveInfo}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.driveInfoText}>
                    Last synced: {formatSyncTime(lastSync)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.driveActions}>
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="sync" size={18} color={COLORS.primary} />
                )}
                <Text style={styles.syncBtnText}>
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.secondary} />
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.connectCard}
            onPress={handleSignIn}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4285F420' }]}>
              {loading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <Ionicons name="logo-google" size={24} color="#4285F4" />
              )}
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Connect Google Drive</Text>
              <Text style={styles.menuSubtitle}>
                Sync all data, backup photos & videos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D0D0D0" />
          </TouchableOpacity>
        )}

        {/* Features */}
        <Text style={styles.sectionLabel}>FEATURES</Text>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D0D0D0" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, paddingHorizontal: 20,
    backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 0.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 4,
  },
  // Google Drive card
  driveCard: {
    backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  driveHeader: { padding: 16 },
  driveUserRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  driveName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  driveEmail: { fontSize: 13, color: COLORS.textLight, marginTop: 1 },
  driveInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
  },
  driveInfoText: { fontSize: 13, color: COLORS.textLight },
  driveActions: {
    flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#E8E8E8',
  },
  syncBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    borderRightWidth: 0.5, borderRightColor: '#E8E8E8',
  },
  syncBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  signOutBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  signOutBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.secondary },
  // Connect card
  connectCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: '#4285F420', borderStyle: 'dashed',
  },
  // Menu items
  menuCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  iconCircle: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  menuSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
});
