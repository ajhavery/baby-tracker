import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Vaccine, VaccinationRecord } from '../types';
import { getVaccinations, addVaccination, deleteVaccination, getProfile } from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { triggerAutoSync } from '../services/autoSync';
import { formatDisplayDate, generateId, getAgeDays } from '../utils/helpers';

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

// Indian (IAP) vaccination schedule
const VACCINE_SCHEDULE: Vaccine[] = [
  // Birth
  { id: 'bcg', name: 'BCG', category: 'Birth', scheduledWeek: 0, description: 'Bacillus Calmette-Guerin' },
  { id: 'opv0', name: 'OPV-0', category: 'Birth', scheduledWeek: 0, description: 'Oral Polio Vaccine - Birth dose' },
  { id: 'hepb1', name: 'Hepatitis B-1', category: 'Birth', scheduledWeek: 0, description: 'Hepatitis B - Birth dose' },
  // 6 Weeks
  { id: 'dtap1', name: 'DTaP-1', category: '6 Weeks', scheduledWeek: 6, description: 'Diphtheria, Tetanus, Pertussis' },
  { id: 'ipv1', name: 'IPV-1', category: '6 Weeks', scheduledWeek: 6, description: 'Inactivated Polio Vaccine' },
  { id: 'hepb2', name: 'Hepatitis B-2', category: '6 Weeks', scheduledWeek: 6 },
  { id: 'hib1', name: 'Hib-1', category: '6 Weeks', scheduledWeek: 6, description: 'Haemophilus influenzae type b' },
  { id: 'rv1', name: 'Rotavirus-1', category: '6 Weeks', scheduledWeek: 6 },
  { id: 'pcv1', name: 'PCV-1', category: '6 Weeks', scheduledWeek: 6, description: 'Pneumococcal Conjugate Vaccine' },
  // 10 Weeks
  { id: 'dtap2', name: 'DTaP-2', category: '10 Weeks', scheduledWeek: 10 },
  { id: 'ipv2', name: 'IPV-2', category: '10 Weeks', scheduledWeek: 10 },
  { id: 'hib2', name: 'Hib-2', category: '10 Weeks', scheduledWeek: 10 },
  { id: 'rv2', name: 'Rotavirus-2', category: '10 Weeks', scheduledWeek: 10 },
  // 14 Weeks
  { id: 'dtap3', name: 'DTaP-3', category: '14 Weeks', scheduledWeek: 14 },
  { id: 'ipv3', name: 'IPV-3', category: '14 Weeks', scheduledWeek: 14 },
  { id: 'hepb3', name: 'Hepatitis B-3', category: '14 Weeks', scheduledWeek: 14 },
  { id: 'hib3', name: 'Hib-3', category: '14 Weeks', scheduledWeek: 14 },
  { id: 'rv3', name: 'Rotavirus-3', category: '14 Weeks', scheduledWeek: 14 },
  { id: 'pcv2', name: 'PCV-2', category: '14 Weeks', scheduledWeek: 14 },
  // 6 Months
  { id: 'opv1', name: 'OPV-1', category: '6 Months', scheduledWeek: 26 },
  { id: 'flu1', name: 'Influenza-1', category: '6 Months', scheduledWeek: 26 },
  // 9 Months
  { id: 'mmr1', name: 'MMR-1', category: '9 Months', scheduledWeek: 39, description: 'Measles, Mumps, Rubella' },
  { id: 'pcv_b', name: 'PCV Booster', category: '9 Months', scheduledWeek: 39 },
  // 12 Months
  { id: 'hepa1', name: 'Hepatitis A-1', category: '12 Months', scheduledWeek: 52 },
  // 15 Months
  { id: 'mmr2', name: 'MMR-2', category: '15 Months', scheduledWeek: 65 },
  { id: 'var1', name: 'Varicella-1', category: '15 Months', scheduledWeek: 65 },
  // 16-18 Months
  { id: 'dtap_b1', name: 'DTaP Booster-1', category: '16-18 Months', scheduledWeek: 72 },
  { id: 'ipv_b1', name: 'IPV Booster-1', category: '16-18 Months', scheduledWeek: 72 },
  { id: 'hib_b', name: 'Hib Booster', category: '16-18 Months', scheduledWeek: 72 },
  { id: 'hepa2', name: 'Hepatitis A-2', category: '18 Months', scheduledWeek: 78 },
  // 4-6 Years
  { id: 'dtap_b2', name: 'DTaP Booster-2', category: '4-6 Years', scheduledWeek: 260 },
  { id: 'ipv_b2', name: 'IPV Booster-2', category: '4-6 Years', scheduledWeek: 260 },
  { id: 'mmr3', name: 'MMR-3', category: '4-6 Years', scheduledWeek: 260 },
  { id: 'var2', name: 'Varicella-2', category: '4-6 Years', scheduledWeek: 260 },
];

export default function VaccinationScreen({ navigation }: any) {
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [babyDob, setBabyDob] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState<Vaccine | null>(null);
  const [dateGiven, setDateGiven] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [administeredBy, setAdministeredBy] = useState('');
  const [vaxNotes, setVaxNotes] = useState('');

  const loadData = useCallback(async () => {
    const [vax, profile] = await Promise.all([getVaccinations(), getProfile()]);
    setRecords(vax);
    if (profile?.dateOfBirth) setBabyDob(profile.dateOfBirth);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const isGiven = (vaccineId: string) =>
    records.some((r) => r.vaccineId === vaccineId);

  const getRecord = (vaccineId: string) =>
    records.find((r) => r.vaccineId === vaccineId);

  const getDueStatus = (vaccine: Vaccine): 'past' | 'due' | 'upcoming' | 'given' => {
    if (isGiven(vaccine.id)) return 'given';
    if (!babyDob || !vaccine.scheduledWeek) return 'upcoming';
    const ageDays = getAgeDays(babyDob);
    const dueDays = vaccine.scheduledWeek * 7;
    if (ageDays >= dueDays + 14) return 'past'; // overdue
    if (ageDays >= dueDays - 7) return 'due'; // due now
    return 'upcoming';
  };

  const openMarkModal = (vaccine: Vaccine) => {
    setSelectedVaccine(vaccine);
    const today = new Date();
    setDateGiven(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setBatchNumber('');
    setAdministeredBy('');
    setVaxNotes('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedVaccine) return;
    if (!dateGiven.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Enter date as YYYY-MM-DD');
      return;
    }
    await addVaccination({
      id: generateId(),
      vaccineId: selectedVaccine.id,
      vaccineName: selectedVaccine.name,
      dateGiven,
      batchNumber: batchNumber || undefined,
      administeredBy: administeredBy || undefined,
      notes: vaxNotes || undefined,
    });
    setShowModal(false);
    loadData();
    triggerAutoSync();
  };

  const handleUnmark = (vaccineId: string) => {
    const record = getRecord(vaccineId);
    if (!record) return;
    Alert.alert('Remove', 'Unmark this vaccination?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await deleteVaccination(record.id);
          loadData();
          triggerAutoSync();
        },
      },
    ]);
  };

  // Group by category
  const categories = [...new Set(VACCINE_SCHEDULE.map((v) => v.category!))];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'given': return COLORS.accent1;
      case 'due': return COLORS.accent2;
      case 'past': return COLORS.secondary;
      default: return '#D0D0D0';
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'given': return 'checkmark-circle';
      case 'due': return 'alert-circle';
      case 'past': return 'warning';
      default: return 'ellipse-outline';
    }
  };

  const givenCount = VACCINE_SCHEDULE.filter((v) => isGiven(v.id)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1 }]}>Vaccinations</Text>
        <View style={styles.counterChip}>
          <Text style={styles.counterText}>{givenCount}/{VACCINE_SCHEDULE.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {categories.map((category) => {
          const vaccines = VACCINE_SCHEDULE.filter((v) => v.category === category);
          const allGiven = vaccines.every((v) => isGiven(v.id));
          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {allGiven && (
                  <Ionicons name="checkmark-done" size={18} color={COLORS.accent1} />
                )}
              </View>
              {vaccines.map((vaccine) => {
                const status = getDueStatus(vaccine);
                const record = getRecord(vaccine.id);
                return (
                  <TouchableOpacity
                    key={vaccine.id}
                    style={[styles.vaccineCard, status === 'given' && styles.vaccineGiven]}
                    onPress={() => {
                      if (status === 'given') {
                        handleUnmark(vaccine.id);
                      } else {
                        openMarkModal(vaccine);
                      }
                    }}
                  >
                    <Ionicons
                      name={getStatusIcon(status)}
                      size={24}
                      color={getStatusColor(status)}
                    />
                    <View style={styles.vaccineContent}>
                      <Text style={[styles.vaccineName, status === 'given' && styles.vaccineNameGiven]}>
                        {vaccine.name}
                      </Text>
                      {vaccine.description && (
                        <Text style={styles.vaccineDesc}>{vaccine.description}</Text>
                      )}
                      {status === 'given' && record && (
                        <Text style={styles.givenDate}>
                          Given: {formatDisplayDate(record.dateGiven)}
                          {record.administeredBy ? ` by ${record.administeredBy}` : ''}
                        </Text>
                      )}
                      {status === 'due' && (
                        <Text style={[styles.statusTag, { color: COLORS.accent2 }]}>Due now</Text>
                      )}
                      {status === 'past' && (
                        <Text style={[styles.statusTag, { color: COLORS.secondary }]}>Overdue</Text>
                      )}
                    </View>
                    {status !== 'given' && (
                      <TouchableOpacity
                        style={styles.markBtn}
                        onPress={() => openMarkModal(vaccine)}
                      >
                        <Text style={styles.markBtnText}>Mark</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Mark Vaccination Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Mark {selectedVaccine?.name} as Given
            </Text>

            <Text style={styles.inputLabel}>Date Given</Text>
            <TextInput
              style={styles.input}
              value={dateGiven}
              onChangeText={setDateGiven}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.inputLabel}>Batch Number (optional)</Text>
            <TextInput
              style={styles.input}
              value={batchNumber}
              onChangeText={setBatchNumber}
              placeholder="e.g. AB1234"
            />

            <Text style={styles.inputLabel}>Administered By (optional)</Text>
            <TextInput
              style={styles.input}
              value={administeredBy}
              onChangeText={setAdministeredBy}
              placeholder="Doctor / Hospital name"
            />

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={vaxNotes}
              onChangeText={setVaxNotes}
              placeholder="Any reactions, comments..."
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, paddingHorizontal: 20,
    backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  counterChip: {
    backgroundColor: COLORS.primary + '15', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  counterText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  categorySection: { marginBottom: 20 },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 8, paddingHorizontal: 4,
  },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vaccineCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, gap: 12,
  },
  vaccineGiven: { backgroundColor: '#F0FFF4' },
  vaccineContent: { flex: 1 },
  vaccineName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  vaccineNameGiven: { color: COLORS.accent1 },
  vaccineDesc: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  givenDate: { fontSize: 12, color: COLORS.accent1, marginTop: 4, fontWeight: '500' },
  statusTag: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  markBtn: {
    backgroundColor: COLORS.primary + '12', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  markBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  inputLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.background, borderRadius: 12, padding: 14,
    fontSize: 16, marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.textLight },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
