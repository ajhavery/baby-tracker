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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FeedEntry, FeedType } from '../types';
import { getFeedsByDate, addFeed, deleteFeed } from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { triggerAutoSync } from '../services/autoSync';
import { formatDate, formatDisplayDate, formatDisplayTime, generateId } from '../utils/helpers';

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
  const [showModal, setShowModal] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>('expressed');
  const [amountMl, setAmountMl] = useState('');
  const [timeHour, setTimeHour] = useState('');
  const [timeMinute, setTimeMinute] = useState('');
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('');

  const loadFeeds = useCallback(async () => {
    const data = await getFeedsByDate(selectedDate);
    setFeeds(data);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadFeeds();
    }, [loadFeeds])
  );

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(new Date());

  const openAddModal = () => {
    const now = new Date();
    setTimeHour(now.getHours().toString().padStart(2, '0'));
    setTimeMinute(now.getMinutes().toString().padStart(2, '0'));
    setEndHour('');
    setEndMinute('');
    setAmountMl('');
    setFeedType('expressed');
    setShowModal(true);
  };

  const handleSave = async () => {
    const time = `${timeHour.padStart(2, '0')}:${timeMinute.padStart(2, '0')}`;

    if (feedType === 'expressed') {
      if (!amountMl || isNaN(Number(amountMl))) {
        Alert.alert('Error', 'Please enter a valid amount in mL');
        return;
      }
      await addFeed({
        id: generateId(),
        date: selectedDate,
        time,
        type: 'expressed',
        amountMl: Number(amountMl),
      });
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
      await addFeed({
        id: generateId(),
        date: selectedDate,
        time,
        type: 'latched',
        startTime: time,
        endTime,
        durationMinutes: duration,
      });
    }

    setShowModal(false);
    loadFeeds();
    triggerAutoSync();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this feed entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFeed(id);
          loadFeeds();
          triggerAutoSync();
        },
      },
    ]);
  };

  const totalExpressed = feeds
    .filter((f) => f.type === 'expressed')
    .reduce((sum, f) => sum + (f.amountMl || 0), 0);
  const latchCount = feeds.filter((f) => f.type === 'latched').length;
  const totalLatchMins = feeds
    .filter((f) => f.type === 'latched')
    .reduce((sum, f) => sum + (f.durationMinutes || 0), 0);

  return (
    <View style={styles.container}>
      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {isToday ? 'Today - ' : ''}{formatDisplayDate(selectedDate)}
        </Text>
        <TouchableOpacity onPress={() => changeDate(1)} disabled={isToday}>
          <Ionicons name="chevron-forward" size={24} color={isToday ? '#ccc' : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Text style={styles.chipText}>Total: {totalExpressed} mL expressed</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.chipText}>{latchCount}x latched ({totalLatchMins} min)</Text>
        </View>
      </View>

      {/* Feed List */}
      <ScrollView style={styles.list}>
        {feeds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No feeds recorded</Text>
          </View>
        ) : (
          feeds.map((feed) => (
            <TouchableOpacity
              key={feed.id}
              style={styles.feedCard}
              onLongPress={() => handleDelete(feed.id)}
            >
              <View
                style={[
                  styles.feedDot,
                  { backgroundColor: feed.type === 'expressed' ? COLORS.accent3 : COLORS.accent2 },
                ]}
              />
              <View style={styles.feedContent}>
                <Text style={styles.feedTime}>{formatDisplayTime(feed.time)}</Text>
                {feed.type === 'expressed' ? (
                  <Text style={styles.feedDetail}>Expressed milk - {feed.amountMl} mL</Text>
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
                  {feed.type === 'expressed' ? 'Bottle' : 'Latch'}
                </Text>
              </View>
            </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Add Feed</Text>

            {/* Feed Type Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  feedType === 'expressed' && styles.toggleActive,
                ]}
                onPress={() => setFeedType('expressed')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    feedType === 'expressed' && styles.toggleTextActive,
                  ]}
                >
                  Expressed Milk
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  feedType === 'latched' && styles.toggleActive,
                ]}
                onPress={() => setFeedType('latched')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    feedType === 'latched' && styles.toggleTextActive,
                  ]}
                >
                  Latched
                </Text>
              </TouchableOpacity>
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

            {feedType === 'expressed' ? (
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
    marginBottom: 8,
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
