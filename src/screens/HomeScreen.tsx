import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FeedEntry, DiaperEntry } from '../types';
import { getFeedsByDate, getDiapersByDate, getProfile, seedSampleData } from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { formatDate, formatDisplayDate, formatDisplayTime, getAgeString } from '../utils/helpers';
import { getStoredToken } from '../services/googleDrive';
import { fullSync, getLastSyncTime } from '../services/syncService';

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

export default function HomeScreen({ navigation }: any) {
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [diapers, setDiapers] = useState<DiaperEntry[]>([]);
  const [babyName, setBabyName] = useState('Baby');
  const [babyDob, setBabyDob] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await seedSampleData();
      const [feedData, diaperData, profile, token, syncTime] = await Promise.all([
        getFeedsByDate(selectedDate),
        getDiapersByDate(selectedDate),
        getProfile(),
        getStoredToken(),
        getLastSyncTime(),
      ]);
      setFeeds(feedData);
      setDiapers(diaperData);
      setIsDriveConnected(!!token);
      setLastSync(syncTime);
      if (profile) {
        setBabyName(profile.name);
        setBabyDob(profile.dateOfBirth);
      }
    } catch (e) {
      console.warn('Storage not ready, retrying...', e);
      setTimeout(() => loadData(), 500);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSync = async () => {
    if (!isDriveConnected) {
      Alert.alert('Not Connected', 'Go to the Media tab to connect your Google Drive first.');
      return;
    }
    setSyncing(true);
    try {
      const result = await fullSync();
      if (result.success) {
        Alert.alert('Synced!', result.message);
        await loadData(); // Reload with merged data
      } else {
        Alert.alert('Sync Failed', result.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Sync failed');
    }
    setSyncing(false);
  };

  const totalExpressed = feeds
    .filter((f) => f.type === 'expressed')
    .reduce((sum, f) => sum + (f.amountMl || 0), 0);
  const latchSessions = feeds.filter((f) => f.type === 'latched');
  const totalLatchMinutes = latchSessions.reduce((sum, f) => sum + (f.durationMinutes || 0), 0);
  const urineCount = diapers.filter((d) => d.type === 'urine' || d.type === 'both').length;
  const pottyCount = diapers.filter((d) => d.type === 'potty' || d.type === 'both').length;

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(new Date());

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello!</Text>
          <Text style={styles.babyName}>{babyName}'s Tracker</Text>
          {babyDob ? (
            <Text style={styles.ageText}>Age: {getAgeString(babyDob)}</Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: '#F0F0F0' }]}
              onPress={() => {
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) => {
                    regs.forEach((r) => r.unregister());
                  });
                  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                }
                window.location.reload();
              }}
            >
              <Ionicons name="refresh" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.syncButton,
              isDriveConnected ? styles.syncConnected : styles.syncDisconnected,
            ]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons
                name={isDriveConnected ? 'cloud-done' : 'cloud-offline-outline'}
                size={20}
                color={isDriveConnected ? COLORS.accent1 : COLORS.textLight}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Sync Status Bar */}
      {isDriveConnected && (
        <TouchableOpacity style={styles.syncBar} onPress={handleSync} disabled={syncing}>
          <Ionicons name="sync" size={14} color={COLORS.primary} />
          <Text style={styles.syncBarText}>
            {syncing
              ? 'Syncing...'
              : lastSync
              ? `Last synced: ${new Date(lastSync).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'Tap to sync with Google Drive'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {isToday ? 'Today' : ''} {formatDisplayDate(selectedDate)}
        </Text>
        <TouchableOpacity onPress={() => changeDate(1)} disabled={isToday}>
          <Ionicons name="chevron-forward" size={24} color={isToday ? '#ccc' : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards - tap to go to respective tab */}
      <View style={styles.summaryRow}>
        <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#EBF5FB' }]} onPress={() => navigation.navigate('Feeds')}>
          <Ionicons name="water" size={28} color={COLORS.accent3} />
          <Text style={styles.summaryValue}>{totalExpressed} mL</Text>
          <Text style={styles.summaryLabel}>Expressed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#FEF9E7' }]} onPress={() => navigation.navigate('Feeds')}>
          <Ionicons name="heart" size={28} color={COLORS.accent2} />
          <Text style={styles.summaryValue}>{latchSessions.length}x ({totalLatchMinutes}m)</Text>
          <Text style={styles.summaryLabel}>Latched</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#E8F8F5' }]} onPress={() => navigation.navigate('Diapers')}>
          <Ionicons name="water-outline" size={28} color={COLORS.accent1} />
          <Text style={styles.summaryValue}>{urineCount}</Text>
          <Text style={styles.summaryLabel}>Urine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#FDEDEC' }]} onPress={() => navigation.navigate('Diapers')}>
          <Ionicons name="ellipse" size={28} color={COLORS.secondary} />
          <Text style={styles.summaryValue}>{pottyCount}</Text>
          <Text style={styles.summaryLabel}>Potty</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.accent3 }]}
          onPress={() => navigation.navigate('Feeds')}
        >
          <Ionicons name="nutrition" size={24} color="#fff" />
          <Text style={styles.actionText}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.accent1 }]}
          onPress={() => navigation.navigate('Diapers')}
        >
          <Ionicons name="layers" size={24} color="#fff" />
          <Text style={styles.actionText}>Diaper</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.accent2 }]}
          onPress={() => navigation.navigate('Growth')}
        >
          <Ionicons name="trending-up" size={24} color="#fff" />
          <Text style={styles.actionText}>Growth</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Feed Timeline */}
      <Text style={styles.sectionTitle}>Feed Timeline</Text>
      {feeds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No feeds recorded for this day</Text>
        </View>
      ) : (
        feeds.map((feed) => (
          <View key={feed.id} style={styles.timelineCard}>
            <View style={styles.timelineTime}>
              <Text style={styles.timeText}>{formatDisplayTime(feed.time)}</Text>
            </View>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: feed.type === 'expressed' ? COLORS.accent3 : COLORS.accent2 },
              ]}
            />
            <View style={styles.timelineContent}>
              {feed.type === 'expressed' ? (
                <Text style={styles.timelineText}>
                  Expressed milk - <Text style={styles.bold}>{feed.amountMl} mL</Text>
                </Text>
              ) : (
                <Text style={styles.timelineText}>
                  Latched - <Text style={styles.bold}>{feed.durationMinutes} mins</Text>
                  {feed.startTime && feed.endTime
                    ? ` (${formatDisplayTime(feed.startTime)} - ${formatDisplayTime(feed.endTime)})`
                    : ''}
                </Text>
              )}
            </View>
          </View>
        ))
      )}

      {/* Diaper Timeline */}
      {diapers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Diaper Changes</Text>
          {diapers.map((diaper) => (
            <View key={diaper.id} style={styles.timelineCard}>
              <View style={styles.timelineTime}>
                <Text style={styles.timeText}>{formatDisplayTime(diaper.time)}</Text>
              </View>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor:
                      diaper.type === 'urine'
                        ? COLORS.accent1
                        : diaper.type === 'potty'
                        ? COLORS.secondary
                        : COLORS.primary,
                  },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>
                  {diaper.type === 'urine' ? 'Urine' : diaper.type === 'potty' ? 'Potty' : 'Both'}
                  {diaper.notes ? ` - ${diaper.notes}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>

    {/* Quick Entry FAB */}
    <TouchableOpacity
      style={styles.chatFab}
      onPress={() => navigation.navigate('Chat')}
    >
      <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
    </TouchableOpacity>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  chatFab: {
    position: 'absolute',
    bottom: 24,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP_PADDING,
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  babyName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  ageText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncConnected: {
    backgroundColor: '#E8F8F5',
  },
  syncDisconnected: {
    backgroundColor: '#F0F0F0',
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#EBF5FB',
  },
  syncBarText: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '500',
  },
  profileButton: {
    padding: 4,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineTime: {
    width: 75,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    fontSize: 14,
    color: COLORS.text,
  },
  bold: {
    fontWeight: '700',
  },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
});
