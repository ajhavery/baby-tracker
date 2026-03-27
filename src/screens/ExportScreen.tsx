import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_TOP_PADDING } from '../utils/platform';
import {
  getFeeds, getDiapers, getGrowthRecords,
  getTasks, getTaskCompletions, getVaccinations, getProfile,
} from '../storage';
import { formatDate, formatDisplayDate, formatDisplayTime, todayIST, nowIST } from '../utils/helpers';
import DateNavigator from '../components/DateNavigator';

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

type ReportType = 'feeds' | 'diapers' | 'growth' | 'tasks' | 'vaccinations' | 'all';

interface ReportOption {
  key: ReportType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  { key: 'feeds', label: 'Feeds', icon: 'nutrition', color: COLORS.accent3 },
  { key: 'diapers', label: 'Diapers', icon: 'layers', color: COLORS.accent1 },
  { key: 'growth', label: 'Growth', icon: 'trending-up', color: COLORS.accent2 },
  { key: 'tasks', label: 'Tasks / Medicine', icon: 'checkmark-circle', color: COLORS.primary },
  { key: 'vaccinations', label: 'Vaccinations', icon: 'medical', color: COLORS.secondary },
  { key: 'all', label: 'All Data', icon: 'document-text', color: COLORS.text },
];

export default function ExportScreen({ navigation }: any) {
  const today = todayIST();
  const weekAgo = (() => { const d = nowIST(); d.setDate(d.getDate() - 7); return formatDate(d); })();

  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);
  const [selectedType, setSelectedType] = useState<ReportType>('all');
  const [exporting, setExporting] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);

  const isInRange = (date: string) => date >= fromDate && date <= toDate;

  const generateReport = async (): Promise<string> => {
    const profile = await getProfile();
    let report = `Baby Tracker Report\n`;
    if (profile?.name) report += `Baby: ${profile.name}\n`;
    report += `Period: ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}\n`;
    report += `Generated: ${new Date().toLocaleString('en-IN')}\n`;
    report += `${'─'.repeat(40)}\n\n`;

    // Feeds
    if (selectedType === 'feeds' || selectedType === 'all') {
      const feeds = (await getFeeds()).filter((f) => isInRange(f.date)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      report += `FEEDS (${feeds.length} entries)\n${'─'.repeat(30)}\n`;

      let currentDate = '';
      let dayExpressed = 0;
      let dayFormula = 0;
      let dayLatchCount = 0;
      let dayLatchMins = 0;

      const flushDay = () => {
        if (currentDate) {
          const parts: string[] = [];
          if (dayExpressed > 0) parts.push(`${dayExpressed} mL expressed`);
          if (dayFormula > 0) parts.push(`${dayFormula} mL formula`);
          if (dayLatchCount > 0) parts.push(`${dayLatchCount}x latched (${dayLatchMins} min)`);
          report += `  Daily total: ${parts.join(', ')}\n\n`;
        }
      };

      for (const feed of feeds) {
        if (feed.date !== currentDate) {
          flushDay();
          currentDate = feed.date;
          dayExpressed = 0; dayFormula = 0; dayLatchCount = 0; dayLatchMins = 0;
          report += `${formatDisplayDate(feed.date)}\n`;
        }
        if (feed.type === 'expressed') {
          report += `  ${formatDisplayTime(feed.time)} - Expressed ${feed.amountMl} mL\n`;
          dayExpressed += feed.amountMl || 0;
        } else if (feed.type === 'formula') {
          report += `  ${formatDisplayTime(feed.time)} - Formula ${feed.amountMl} mL\n`;
          dayFormula += feed.amountMl || 0;
        } else {
          const dur = feed.durationMinutes ? ` (${feed.durationMinutes} min)` : '';
          const range = feed.startTime && feed.endTime ? ` ${formatDisplayTime(feed.startTime)}-${formatDisplayTime(feed.endTime)}` : '';
          report += `  ${formatDisplayTime(feed.time)} - Latched${dur}${range}\n`;
          dayLatchCount++;
          dayLatchMins += feed.durationMinutes || 0;
        }
      }
      flushDay();
      report += '\n';
    }

    // Diapers
    if (selectedType === 'diapers' || selectedType === 'all') {
      const diapers = (await getDiapers()).filter((d) => isInRange(d.date)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      report += `DIAPERS (${diapers.length} entries)\n${'─'.repeat(30)}\n`;

      let currentDate = '';
      let dayUrine = 0;
      let dayPotty = 0;

      const flushDay = () => {
        if (currentDate) {
          report += `  Daily total: ${dayUrine} urine, ${dayPotty} potty\n\n`;
        }
      };

      for (const d of diapers) {
        if (d.date !== currentDate) {
          flushDay();
          currentDate = d.date;
          dayUrine = 0; dayPotty = 0;
          report += `${formatDisplayDate(d.date)}\n`;
        }
        const type = d.type === 'urine' ? 'Urine' : d.type === 'potty' ? 'Potty' : 'Both';
        report += `  ${formatDisplayTime(d.time)} - ${type}${d.notes ? ` (${d.notes})` : ''}\n`;
        if (d.type === 'urine' || d.type === 'both') dayUrine++;
        if (d.type === 'potty' || d.type === 'both') dayPotty++;
      }
      flushDay();
      report += '\n';
    }

    // Growth
    if (selectedType === 'growth' || selectedType === 'all') {
      const growth = (await getGrowthRecords()).filter((g) => isInRange(g.date)).sort((a, b) => a.date.localeCompare(b.date));
      report += `GROWTH (${growth.length} entries)\n${'─'.repeat(30)}\n`;
      for (const g of growth) {
        const parts: string[] = [];
        if (g.weightKg) parts.push(`Weight: ${g.weightKg} kg`);
        if (g.heightCm) parts.push(`Height: ${g.heightCm} cm`);
        if (g.headCircumferenceCm) parts.push(`HC: ${g.headCircumferenceCm} cm`);
        report += `${formatDisplayDate(g.date)} - ${parts.join(', ')}${g.notes ? ` (${g.notes})` : ''}\n`;
      }
      report += '\n';
    }

    // Tasks
    if (selectedType === 'tasks' || selectedType === 'all') {
      const tasks = await getTasks();
      const completions = (await getTaskCompletions()).filter((c) => isInRange(c.date));
      report += `TASKS / MEDICINE (${completions.length} completions)\n${'─'.repeat(30)}\n`;

      let currentDate = '';
      const sorted = completions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      for (const c of sorted) {
        if (c.date !== currentDate) {
          currentDate = c.date;
          report += `${formatDisplayDate(c.date)}\n`;
        }
        const task = tasks.find((t) => t.id === c.taskId);
        report += `  ${c.time} - ${task?.name || 'Unknown task'}${c.notes ? ` (${c.notes})` : ''}\n`;
      }
      report += '\n';
    }

    // Vaccinations
    if (selectedType === 'vaccinations' || selectedType === 'all') {
      const vax = (await getVaccinations()).sort((a, b) => a.dateGiven.localeCompare(b.dateGiven));
      report += `VACCINATIONS (${vax.length} given)\n${'─'.repeat(30)}\n`;
      for (const v of vax) {
        report += `${formatDisplayDate(v.dateGiven)} - ${v.vaccineName}`;
        if (v.administeredBy) report += ` (by ${v.administeredBy})`;
        if (v.batchNumber) report += ` [Batch: ${v.batchNumber}]`;
        report += '\n';
      }
      report += '\n';
    }

    return report;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const report = await generateReport();
      setReportText(report);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate report');
    }
    setExporting(false);
  };

  const handleShare = async () => {
    if (!reportText) return;
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(reportText);
        Alert.alert('Copied!', 'Report copied to clipboard');
      } catch {
        // Fallback: download as file
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baby-tracker-report-${fromDate}-to-${toDate}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      await Share.share({ message: reportText });
    }
  };

  const handleDownloadCSV = async () => {
    if (Platform.OS !== 'web') return;

    setExporting(true);
    try {
      let csv = '';

      if (selectedType === 'feeds' || selectedType === 'all') {
        const feeds = (await getFeeds()).filter((f) => isInRange(f.date)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
        csv += 'Date,Time,Type,Amount (mL),Duration (min),Start Time,End Time\n';
        for (const f of feeds) {
          csv += `${f.date},${f.time},${f.type},${f.amountMl || ''},${f.durationMinutes || ''},${f.startTime || ''},${f.endTime || ''}\n`;
        }
      }

      if (selectedType === 'diapers' || selectedType === 'all') {
        const diapers = (await getDiapers()).filter((d) => isInRange(d.date)).sort((a, b) => a.date.localeCompare(b.date));
        if (csv) csv += '\n';
        csv += 'Date,Time,Type,Notes\n';
        for (const d of diapers) {
          csv += `${d.date},${d.time},${d.type},"${d.notes || ''}"\n`;
        }
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baby-tracker-${selectedType}-${fromDate}-to-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Report</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Date Range */}
        <Text style={styles.sectionLabel}>DATE RANGE</Text>
        <View style={styles.dateRangeCard}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <DateNavigator selectedDate={fromDate} onDateChange={setFromDate} style={styles.datePicker} />
          </View>
          <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <DateNavigator selectedDate={toDate} onDateChange={setToDate} style={styles.datePicker} />
          </View>
        </View>

        {/* Report Type */}
        <Text style={styles.sectionLabel}>REPORT TYPE</Text>
        <View style={styles.typeGrid}>
          {REPORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.typeCard, selectedType === opt.key && styles.typeCardActive]}
              onPress={() => setSelectedType(opt.key)}
            >
              <Ionicons name={opt.icon} size={22} color={selectedType === opt.key ? '#fff' : opt.color} />
              <Text style={[styles.typeLabel, selectedType === opt.key && styles.typeLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Report Preview */}
        {reportText && (
          <View style={styles.reportSection}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Report Preview</Text>
              <View style={styles.reportActions}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.shareBtnText}>Copy</Text>
                </TouchableOpacity>
                {Platform.OS === 'web' && (
                  <TouchableOpacity style={styles.shareBtn} onPress={handleDownloadCSV}>
                    <Ionicons name="download-outline" size={16} color={COLORS.accent1} />
                    <Text style={[styles.shareBtnText, { color: COLORS.accent1 }]}>CSV</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="share-outline" size={16} color={COLORS.secondary} />
                  <Text style={[styles.shareBtnText, { color: COLORS.secondary }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.reportBox} nestedScrollEnabled>
              <Text style={styles.reportText}>{reportText}</Text>
            </ScrollView>
          </View>
        )}

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
    letterSpacing: 0.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 4,
  },
  dateRangeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 16,
  },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  datePicker: { backgroundColor: COLORS.background, borderRadius: 10, paddingVertical: 6 },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
  },
  typeCard: {
    width: '31%',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  typeCardActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  typeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  typeLabelActive: { color: '#fff' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, marginBottom: 20,
  },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  reportSection: { marginBottom: 20 },
  reportHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  reportActions: { flexDirection: 'row', gap: 8 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.background, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  shareBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  reportBox: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    maxHeight: 400,
  },
  reportText: {
    fontSize: 13, color: COLORS.text, fontFamily: 'monospace', lineHeight: 20,
  },
});
