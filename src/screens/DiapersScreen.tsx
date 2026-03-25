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
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DiaperEntry, DiaperType } from '../types';
import { getDiapersByDate, addDiaper, deleteDiaper } from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { triggerAutoSync } from '../services/autoSync';
import {
  getStoredToken,
  uploadToDrive,
  uploadToDriveWeb,
} from '../services/googleDrive';
import { formatDate, formatDisplayDate, formatDisplayTime, generateId } from '../utils/helpers';

const COLORS = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  accent1: '#00B894',
  accent3: '#74B9FF',
};

export default function DiapersScreen() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [diapers, setDiapers] = useState<DiaperEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [diaperType, setDiaperType] = useState<DiaperType>('urine');
  const [timeHour, setTimeHour] = useState('');
  const [timeMinute, setTimeMinute] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadDiapers = useCallback(async () => {
    const data = await getDiapersByDate(selectedDate);
    setDiapers(data);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadDiapers();
    }, [loadDiapers])
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
    setDiaperType('urine');
    setNotes('');
    setPhotoUri(null);
    setPhotoFile(null);
    setShowModal(true);
  };

  const pickPhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          setPhotoFile(file);
          setPhotoUri(URL.createObjectURL(file));
        }
      };
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          setPhotoFile(file);
          setPhotoUri(URL.createObjectURL(file));
        }
      };
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhotoToDrive = async (): Promise<boolean> => {
    const token = await getStoredToken();
    if (!token) {
      Alert.alert('Not Connected', 'Connect Google Drive in the Media tab first.');
      return false;
    }

    const typeLabel = diaperType === 'urine' ? 'urine' : diaperType === 'potty' ? 'potty' : 'both';
    const timestamp = `${selectedDate}_${timeHour}${timeMinute}`;
    const fileName = `diaper_${typeLabel}_${timestamp}.jpg`;

    if (Platform.OS === 'web' && photoFile) {
      const result = await uploadToDriveWeb(token, photoFile);
      return !!result;
    } else if (photoUri) {
      const result = await uploadToDrive(token, photoUri, fileName, 'image/jpeg');
      return !!result;
    }
    return false;
  };

  const handleSave = async () => {
    const time = `${timeHour.padStart(2, '0')}:${timeMinute.padStart(2, '0')}`;

    // Upload photo if one was taken
    if (photoUri) {
      setUploading(true);
      const uploaded = await uploadPhotoToDrive();
      setUploading(false);
      if (!uploaded) {
        Alert.alert('Photo Upload Failed', 'Diaper entry saved but photo could not be uploaded to Drive.');
      }
    }

    await addDiaper({
      id: generateId(),
      date: selectedDate,
      time,
      type: diaperType,
      notes: notes || undefined,
    });
    setShowModal(false);
    loadDiapers();
    triggerAutoSync();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this diaper entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDiaper(id);
          loadDiapers();
          triggerAutoSync();
        },
      },
    ]);
  };

  const urineCount = diapers.filter((d) => d.type === 'urine' || d.type === 'both').length;
  const pottyCount = diapers.filter((d) => d.type === 'potty' || d.type === 'both').length;

  const getDiaperIcon = (type: DiaperType) => {
    switch (type) {
      case 'urine': return 'water-outline';
      case 'potty': return 'ellipse';
      case 'both': return 'layers';
    }
  };

  const getDiaperColor = (type: DiaperType) => {
    switch (type) {
      case 'urine': return COLORS.accent1;
      case 'potty': return COLORS.secondary;
      case 'both': return COLORS.primary;
    }
  };

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
        <View style={[styles.summaryChip, { backgroundColor: COLORS.accent1 + '20' }]}>
          <Ionicons name="water-outline" size={16} color={COLORS.accent1} />
          <Text style={[styles.chipText, { color: COLORS.accent1 }]}>Urine: {urineCount}</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: COLORS.secondary + '20' }]}>
          <Ionicons name="ellipse" size={16} color={COLORS.secondary} />
          <Text style={[styles.chipText, { color: COLORS.secondary }]}>Potty: {pottyCount}</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: COLORS.primary + '20' }]}>
          <Text style={[styles.chipText, { color: COLORS.primary }]}>Total: {diapers.length}</Text>
        </View>
      </View>

      {/* Diaper List */}
      <ScrollView style={styles.list}>
        {diapers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No diaper changes recorded</Text>
          </View>
        ) : (
          diapers.map((diaper) => (
            <TouchableOpacity
              key={diaper.id}
              style={styles.card}
              onLongPress={() => handleDelete(diaper.id)}
            >
              <View style={[styles.iconCircle, { backgroundColor: getDiaperColor(diaper.type) + '20' }]}>
                <Ionicons name={getDiaperIcon(diaper.type) as any} size={20} color={getDiaperColor(diaper.type)} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTime}>{formatDisplayTime(diaper.time)}</Text>
                <Text style={styles.cardType}>
                  {diaper.type === 'urine' ? 'Urine' : diaper.type === 'potty' ? 'Potty/Stool' : 'Both'}
                </Text>
                {diaper.notes && <Text style={styles.cardNotes}>{diaper.notes}</Text>}
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

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Diaper Change</Text>

            {/* Type Toggle */}
            <View style={styles.toggleRow}>
              {(['urine', 'potty', 'both'] as DiaperType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.toggleBtn, diaperType === type && styles.toggleActive]}
                  onPress={() => setDiaperType(type)}
                >
                  <Text style={[styles.toggleText, diaperType === type && styles.toggleTextActive]}>
                    {type === 'urine' ? 'Urine' : type === 'potty' ? 'Potty' : 'Both'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time */}
            <Text style={styles.inputLabel}>Time</Text>
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

            {/* Photo Upload */}
            <Text style={styles.inputLabel}>Photo (optional, uploads to Google Drive)</Text>
            {photoUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => { setPhotoUri(null); setPhotoFile(null); }}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                  <Ionicons name="camera" size={20} color={COLORS.accent3} />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
                  <Ionicons name="images" size={20} color={COLORS.accent1} />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any observations..."
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, uploading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {photoUri ? 'Save & Upload' : 'Save'}
                  </Text>
                )}
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 16 },
  card: {
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTime: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  cardType: { fontSize: 15, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  cardNotes: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { color: COLORS.textLight, fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: COLORS.accent1,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent1,
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
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoBtn: {
    marginLeft: 8,
    marginTop: -4,
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
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
