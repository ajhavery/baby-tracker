import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BabyProfile } from '../types';
import { getProfile, saveProfile } from '../storage';
import { triggerAutoSync } from '../services/autoSync';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { getAgeString } from '../utils/helpers';

const COLORS = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
};

export default function ProfileScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | undefined>();
  const [bloodGroup, setBloodGroup] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const profile = await getProfile();
        if (profile) {
          setName(profile.name);
          setDob(profile.dateOfBirth);
          setGender(profile.gender);
          setBloodGroup(profile.bloodGroup || '');
        } else {
          setIsEditing(true);
        }
      })();
    }, [])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter baby\'s name');
      return;
    }
    if (!dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Please enter date of birth as YYYY-MM-DD');
      return;
    }

    const profile: BabyProfile = {
      name: name.trim(),
      dateOfBirth: dob,
      gender,
      bloodGroup: bloodGroup || undefined,
    };
    await saveProfile(profile);
    setIsEditing(false);
    Alert.alert('Saved', 'Baby profile updated!');
    triggerAutoSync();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Baby Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons name={isEditing ? 'close' : 'create-outline'} size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="happy-outline" size={60} color={COLORS.primary} />
        </View>
        {name && !isEditing && (
          <>
            <Text style={styles.nameDisplay}>{name}</Text>
            {dob && <Text style={styles.ageDisplay}>Age: {getAgeString(dob)}</Text>}
          </>
        )}
      </View>

      {/* Form / Display */}
      <View style={styles.formSection}>
        <Text style={styles.inputLabel}>Name</Text>
        {isEditing ? (
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Baby's name" />
        ) : (
          <Text style={styles.displayText}>{name || 'Not set'}</Text>
        )}

        <Text style={styles.inputLabel}>Date of Birth</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            keyboardType="default"
          />
        ) : (
          <Text style={styles.displayText}>{dob || 'Not set'}</Text>
        )}

        <Text style={styles.inputLabel}>Gender</Text>
        {isEditing ? (
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderActive]}
              onPress={() => setGender('male')}
            >
              <Ionicons name="male" size={20} color={gender === 'male' ? '#fff' : COLORS.primary} />
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Boy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderActiveF]}
              onPress={() => setGender('female')}
            >
              <Ionicons name="female" size={20} color={gender === 'female' ? '#fff' : '#FF6584'} />
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Girl</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.displayText}>
            {gender ? (gender === 'male' ? 'Boy' : 'Girl') : 'Not set'}
          </Text>
        )}

        <Text style={styles.inputLabel}>Blood Group</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="e.g. O+, A-, B+"
          />
        ) : (
          <Text style={styles.displayText}>{bloodGroup || 'Not set'}</Text>
        )}

        {isEditing && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameDisplay: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  ageDisplay: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  formSection: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  displayText: {
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 8,
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  genderActive: { backgroundColor: COLORS.primary },
  genderActiveF: { backgroundColor: '#FF6584' },
  genderText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  genderTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
