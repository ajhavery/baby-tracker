import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, todayIST } from '../utils/helpers';

const COLORS = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
};

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
  style?: any;
}

// Shorter date format that fits on screen
function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
}

export default function DateNavigator({ selectedDate, onDateChange, style }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState(selectedDate);

  const today = todayIST();
  const isToday = selectedDate === today;

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const newDate = formatDate(d);
    if (newDate <= today) {
      onDateChange(newDate);
    }
  };

  const openPicker = () => {
    setPickerValue(selectedDate);
    setShowPicker(true);
  };

  const handlePickerDone = () => {
    if (!pickerValue || !pickerValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid', 'Enter date as YYYY-MM-DD');
      return;
    }
    if (pickerValue > today) {
      Alert.alert('Invalid', 'Cannot select a future date');
      return;
    }
    onDateChange(pickerValue);
    setShowPicker(false);
  };

  // Display label
  const dateLabel = isToday ? `Today, ${shortDate(selectedDate)}` : shortDate(selectedDate);

  return (
    <>
      <View style={[styles.container, style]}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={openPicker} style={styles.dateBtn}>
          <Text style={styles.dateText} numberOfLines={1}>{dateLabel}</Text>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={styles.arrowBtn}
          disabled={isToday}
        >
          <Ionicons name="chevron-forward" size={22} color={isToday ? '#D0D0D0' : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayDismiss}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Date</Text>

            <TextInput
              style={styles.dateInput}
              value={pickerValue}
              onChangeText={(val) => {
                setPickerValue(val);
              }}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
              maxLength={10}
            />

            {/* Quick date buttons */}
            <View style={styles.quickDates}>
              <TouchableOpacity
                style={[styles.quickBtn, isToday && styles.quickBtnActive]}
                onPress={() => { onDateChange(today); setShowPicker(false); }}
              >
                <Text style={[styles.quickBtnText, isToday && styles.quickBtnTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => {
                  const d = new Date(); d.setDate(d.getDate() - 1);
                  onDateChange(formatDate(d)); setShowPicker(false);
                }}
              >
                <Text style={styles.quickBtnText}>Yesterday</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => {
                  const d = new Date(); d.setDate(d.getDate() - 2);
                  onDateChange(formatDate(d)); setShowPicker(false);
                }}
              >
                <Text style={styles.quickBtnText}>2 days ago</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={handlePickerDone}>
                <Text style={styles.doneBtnText}>Go to Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  arrowBtn: {
    padding: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '08',
    maxWidth: 200,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
  },
  pickerSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  quickDates: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
  },
  quickBtnActive: {
    backgroundColor: COLORS.primary,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  quickBtnTextActive: {
    color: '#fff',
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
