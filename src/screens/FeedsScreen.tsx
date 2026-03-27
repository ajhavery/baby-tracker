import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FeedEntry, FeedType } from '../types';
import SwipeableRow from '../components/SwipeableRow';
import { getFeedsByDate, addFeed, updateFeed, deleteFeed } from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { triggerAutoSync } from '../services/autoSync';
import { formatDate, formatDisplayTime, generateId } from '../utils/helpers';
import DateNavigator from '../components/DateNavigator';

const COLORS = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  accent3: '#74B9FF',
  accent2: '#FDCB6E',
};

export default function FeedsScreen() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>('expressed');
  const [amountMl, setAmountMl] = useState('');
  const [timeHour, setTimeHour] = useState('');
  const [timeMinute, setTimeMinute] = useState('');
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadFeeds = useCallback(async () => {
    const data = await getFeedsByDate(selectedDate);
    setFeeds(data);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadFeeds();
    }, [loadFeeds])
  );

  const openAddModal = () => {
    const now = new Date();
    setEditingId(null);
    setTimeHour(now.getHours().toString().padStart(2, '0'));
    setTimeMinute(now.getMinutes().toString().padStart(2, '0'));
    setEndHour('');
    setEndMinute('');
    setAmountMl('');
    setFeedType('expressed');
    setShowModal(true);
  };

  const openEditModal = (feed: FeedEntry) => {
    setEditingId(feed.id);
    setFeedType(feed.type);
    const [h, m] = feed.time.split(':');
    setTimeHour(h);
    setTimeMinute(m);
    if (feed.type === 'expressed') {
      setAmountMl(feed.amountMl?.toString() || '');
      setEndHour('');
      setEndMinute('');
    } else {
      setAmountMl('');
      if (feed.endTime) {
        const [eh, em] = feed.endTime.split(':');
        setEndHour(eh);
        setEndMinute(em);
      } else {
        setEndHour('');
        setEndMinute('');
      }
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const time = `${timeHour.padStart(2, '0')}:${timeMinute.padStart(2, '0')}`;
    const id = editingId || generateId();

    if (feedType === 'expressed' || feedType === 'formula') {
      if (!amountMl || isNaN(Number(amountMl))) {
        Alert.alert('Error', 'Please enter a valid amount in mL');
        return;
      }
      const entry: FeedEntry = { id, date: selectedDate, time, type: feedType, amountMl: Number(amountMl) };
      editingId ? await updateFeed(entry) : await addFeed(entry);
    } else {
      const endTime = endHour && endMinute
        ? `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`
        : undefined;
      let duration: number | undefined;
      if (endTime) {
        const startMins = Number(timeHour) * 60 + Number(timeMinute);
        const endMins = Number(endHour) * 60 + Number(endMinute);
        duration = endMins - startMins;
      }
      const entry: FeedEntry = { id, date: selectedDate, time, type: 'latched', startTime: time, endTime, durationMinutes: duration };
      editingId ? await updateFeed(entry) : await addFeed(entry);
    }

    setShowModal(false);
    setEditingId(null);
    loadFeeds();
    triggerAutoSync();
  };

  const handleDelete = async (id: string) => {
    await deleteFeed(id);
    loadFeeds();
    triggerAutoSync();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeeds();
    setRefreshing(false);
  };

  const totalExpressed = feeds
    .filter((f) => f.type === 'expressed')
    .reduce((sum, f) => sum + (f.amountMl || 0), 0);
  const totalFormula = feeds
    .filter((f) => f.type === 'formula')
    .reduce((sum, f) => sum + (f.amountMl || 0), 0);
  const latchCount = feeds.filter((f) => f.type === 'latched').length;
  const totalLatchMins = feeds
    .filter((f) => f.type === 'latched')
    .reduce((sum, f) => sum + (f.durationMinutes || 0), 0);

  return (
    <View style={styles.container}>
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        style={styles.dateNav}
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Text style={styles.chipText}>{totalExpressed} mL expressed</Text>
        </View>
        {totalFormula > 0 && (
          <View style={[styles.summaryChip, { backgroundColor: '#FF658415' }]}>
            <Text style={[styles.chipText, { color: '#FF6584' }]}>{totalFormula} mL formula</Text>
          </View>
        )}
        <View style={styles.summaryChip}>
          <Text style={styles.chipText}>{latchCount}x latched ({totalLatchMins}m)</Text>
        </View>
      </View>

      {/* Feed List */}
      <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {feeds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No feeds recorded</Text>
          </View>
        ) : (
          feeds.map((feed) => (
            <SwipeableRow
              key={feed.id}
              onEdit={() => openEditModal(feed)}
              onDelete={() => handleDelete(feed.id)}
            >
              <View style={styles.feedCard}>
                <View
                  style={[
                    styles.feedDot,
                    {
                      backgroundColor:
                        feed.type === 'expressed' ? COLORS.accent3
                        : feed.type === 'formula' ? COLORS.secondary
                        : COLORS.accent2,
                    },
                  ]}
                />
                <View style={styles.feedContent}>
                  <Text style={styles.feedTime}>{formatDisplayTime(feed.time)}</Text>
                  {feed.type === 'expressed' ? (
                    <Text style={styles.feedDetail}>Expressed milk - {feed.amountMl} mL</Text>
                  ) : feed.type === 'formula' ? (
                    <Text style={styles.feedDetail}>Formula milk - {feed.amountMl} mL</Text>
                  ) : (
                    <Text style={styles.feedDetail}>
                      Latched {feed.durationMinutes ? `for ${feed.durationMinutes} mins` : ''}
                      {feed.startTime && feed.endTime
                        ? `\n${formatDisplayTime(feed.startTime)} - ${formatDisplayTime(feed.endTime)}`
                        : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.feedTypeTag}>
                  <Text style={styles.feedTypeText}>
                    {feed.type === 'expressed' ? 'Bottle' : feed.type === 'formula' ? 'Formula' : 'Latch'}
                  </Text>
                </View>
              </View>
            </SwipeableRow>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Feed Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Feed' : 'Add Feed'}</Text>

            {/* Feed Type Toggle */}
            <View style={styles.toggleRow}>
              {([
                { key: 'expressed' as FeedType, label: 'Expressed' },
                { key: 'formula' as FeedType, label: 'Formula' },
                { key: 'latched' as FeedType, label: 'Latched' },
              ]).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.toggleBtn, feedType === key && styles.toggleActive]}
                  onPress={() => setFeedType(key)}
                >
                  <Text style={[styles.toggleText, feedType === key && styles.toggleTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Input */}
            <Text style={styles.inputLabel}>
              {feedType === 'latched' ? 'Start Time' : 'Time'}
            </Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={timeHour}
                onChangeText={setTimeHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={timeMinute}
                onChangeText={setTimeMinute}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
              />
            </View>

            {feedType === 'expressed' || feedType === 'formula' ? (
              <>
                <Text style={styles.inputLabel}>Amount (mL)</Text>
                <TextInput
                  style={styles.input}
                  value={amountMl}
                  onChangeText={setAmountMl}
                  keyboardType="number-pad"
                  placeholder="e.g. 80"
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>End Time</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={endHour}
                    onChangeText={setEndHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="HH"
                  />
                  <Text style={styles.timeSep}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={endMinute}
                    onChangeText={setEndMinute}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                  />
                </View>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingTop: HEADER_TOP_PADDING,
    backgroundColor: COLORS.card,
    gap: 16,
  },
  dateText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  summaryChip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 16 },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  feedDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  feedContent: { flex: 1 },
  feedTime: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  feedDetail: { fontSize: 15, color: COLORS.text, marginTop: 2 },
  feedTypeTag: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedTypeText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.textLight, fontSize: 14 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  toggleTextActive: { color: '#fff' },
  inputLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  timeInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    width: 60,
    textAlign: 'center',
    fontWeight: '600',
  },
  timeSep: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.textLight },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
