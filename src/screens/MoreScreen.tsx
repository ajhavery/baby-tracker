import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_TOP_PADDING } from '../utils/platform';

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
  { icon: 'person-circle', label: 'Baby Profile', subtitle: 'Name, DOB, blood group', color: COLORS.primary, screen: 'Profile' },
];

export default function MoreScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView style={styles.list}>
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
