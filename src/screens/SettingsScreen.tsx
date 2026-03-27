import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { loadSettings, saveSettings, AppSettings } from '../utils/settings';

const COLORS = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  accent1: '#00B894',
};

const HOUR_OPTIONS = [
  { value: 0, label: '12:00 AM (Midnight)' },
  { value: 1, label: '1:00 AM' },
  { value: 2, label: '2:00 AM' },
  { value: 3, label: '3:00 AM' },
  { value: 4, label: '4:00 AM' },
  { value: 5, label: '5:00 AM' },
  { value: 6, label: '6:00 AM (Default)' },
  { value: 7, label: '7:00 AM' },
  { value: 8, label: '8:00 AM' },
];

export default function SettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState<AppSettings>({ dayStartHour: 6 });

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const handleDayStartChange = async (hour: number) => {
    await saveSettings({ dayStartHour: hour });
    setSettings((prev) => ({ ...prev, dayStartHour: hour }));
    Alert.alert(
      'Day Start Updated',
      `Your tracking day now starts at ${HOUR_OPTIONS.find((o) => o.value === hour)?.label}.\n\nEntries before this time will count as the previous day.`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionLabel}>DAY BOUNDARY</Text>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Set when your tracking day starts. Entries before this time will be grouped with the previous day.
            {'\n\n'}For example, if set to 6 AM, a feed at 2 AM on March 28 will appear under March 27.
          </Text>
        </View>

        <View style={styles.optionsList}>
          {HOUR_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                settings.dayStartHour === option.value && styles.optionActive,
              ]}
              onPress={() => handleDayStartChange(option.value)}
            >
              <Text style={[
                styles.optionLabel,
                settings.dayStartHour === option.value && styles.optionLabelActive,
              ]}>
                {option.label}
              </Text>
              {settings.dayStartHour === option.value && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.accent1} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4,
  },
  infoCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: COLORS.primary + '08', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.primary + '15',
  },
  infoText: {
    flex: 1, fontSize: 13, color: COLORS.textLight, lineHeight: 20,
  },
  optionsList: { gap: 6 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  optionActive: {
    borderColor: COLORS.accent1, backgroundColor: '#E8F8F5',
  },
  optionLabel: {
    fontSize: 15, fontWeight: '500', color: COLORS.text,
  },
  optionLabelActive: {
    fontWeight: '700', color: COLORS.accent1,
  },
});
