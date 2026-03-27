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
import { GrowthEntry } from '../types';
import { getGrowthRecords, addGrowthRecord, deleteGrowthRecord } from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { triggerAutoSync } from '../services/autoSync';
import { formatDisplayDate, generateId, todayIST } from '../utils/helpers';

const COLORS = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  accent2: '#FDCB6E',
};

export default function GrowthScreen({ navigation }: any) {
  const [records, setRecords] = useState<GrowthEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [headCirc, setHeadCirc] = useState('');
  const [notes, setNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadRecords = useCallback(async () => {
    const data = await getGrowthRecords();
    data.sort((a, b) => b.date.localeCompare(a.date));
    setRecords(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const openAddModal = () => {
    setWeight('');
    setHeight('');
    setHeadCirc('');
    setNotes('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!weight && !height && !headCirc) {
      Alert.alert('Error', 'Please enter at least one measurement');
      return;
    }

    await addGrowthRecord({
      id: generateId(),
      date: todayIST(),
      weightKg: weight ? Number(weight) : undefined,
      heightCm: height ? Number(height) : undefined,
      headCircumferenceCm: headCirc ? Number(headCirc) : undefined,
      notes: notes || undefined,
    });
    setShowModal(false);
    loadRecords();
    triggerAutoSync();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this growth record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGrowthRecord(id);
          loadRecords();
          triggerAutoSync();
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const latestRecord = records[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Growth Tracker</Text>
      </View>

      {/* Latest Measurements */}
      {latestRecord && (
        <View style={styles.latestSection}>
          <Text style={styles.sectionTitle}>Latest Measurements</Text>
          <Text style={styles.latestDate}>{formatDisplayDate(latestRecord.date)}</Text>
          <View style={styles.metricsRow}>
            {latestRecord.weightKg !== undefined && (
              <View style={styles.metricCard}>
                <Ionicons name="scale-outline" size={24} color={COLORS.primary} />
                <Text style={styles.metricValue}>{latestRecord.weightKg}</Text>
                <Text style={styles.metricLabel}>kg</Text>
              </View>
            )}
            {latestRecord.heightCm !== undefined && (
              <View style={styles.metricCard}>
                <Ionicons name="resize-outline" size={24} color={COLORS.accent2} />
                <Text style={styles.metricValue}>{latestRecord.heightCm}</Text>
                <Text style={styles.metricLabel}>cm</Text>
              </View>
            )}
            {latestRecord.headCircumferenceCm !== undefined && (
              <View style={styles.metricCard}>
                <Ionicons name="ellipse-outline" size={24} color={COLORS.secondary} />
                <Text style={styles.metricValue}>{latestRecord.headCircumferenceCm}</Text>
                <Text style={styles.metricLabel}>cm head</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* History */}
      <Text style={[styles.sectionTitle, { paddingHorizontal: 20, marginTop: 20 }]}>History</Text>
      <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trending-up-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No growth records yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your baby's first measurement</Text>
          </View>
        ) : (
          records.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={styles.historyCard}
              onLongPress={() => handleDelete(record.id)}
            >
              <Text style={styles.historyDate}>{formatDisplayDate(record.date)}</Text>
              <View style={styles.historyMetrics}>
                {record.weightKg !== undefined && (
                  <View style={styles.historyChip}>
                    <Text style={styles.historyChipText}>{record.weightKg} kg</Text>
                  </View>
                )}
                {record.heightCm !== undefined && (
                  <View style={[styles.historyChip, { backgroundColor: COLORS.accent2 + '20' }]}>
                    <Text style={[styles.historyChipText, { color: '#E17055' }]}>{record.heightCm} cm</Text>
                  </View>
                )}
                {record.headCircumferenceCm !== undefined && (
                  <View style={[styles.historyChip, { backgroundColor: COLORS.secondary + '20' }]}>
                    <Text style={[styles.historyChipText, { color: COLORS.secondary }]}>
                      HC: {record.headCircumferenceCm} cm
                    </Text>
                  </View>
                )}
              </View>
              {record.notes && <Text style={styles.historyNotes}>{record.notes}</Text>}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Growth</Text>

            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 3.5"
            />

            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 50"
            />

            <Text style={styles.inputLabel}>Head Circumference (cm)</Text>
            <TextInput
              style={styles.input}
              value={headCirc}
              onChangeText={setHeadCirc}
              keyboardType="decimal-pad"
              placeholder="e.g. 34"
            />

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Doctor visit, milestone, etc."
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
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
  header: {
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  latestSection: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  latestDate: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  metricLabel: { fontSize: 12, color: COLORS.textLight },
  list: { flex: 1, paddingHorizontal: 16 },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  historyDate: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  historyMetrics: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  historyChip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyChipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  historyNotes: { fontSize: 13, color: COLORS.textLight, marginTop: 8 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
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
    backgroundColor: COLORS.accent2,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent2,
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
  inputLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
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
