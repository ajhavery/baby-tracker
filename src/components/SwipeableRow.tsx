import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SwipeableRow({ children, onEdit, onDelete }: Props) {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = () => {
    setShowActions(false);
    // Small delay to let modal close before showing alert
    setTimeout(() => {
      if (Platform.OS === 'web') {
        if (window.confirm('Delete this entry?')) {
          onDelete?.();
        }
      } else {
        Alert.alert('Delete', 'Delete this entry?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete?.() },
        ]);
      }
    }, 100);
  };

  const handleEdit = () => {
    setShowActions(false);
    setTimeout(() => onEdit?.(), 100);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowActions(true)}
        style={styles.wrapper}
      >
        {children}
      </TouchableOpacity>

      <Modal visible={showActions} transparent animationType="fade">
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayDismiss}
            activeOpacity={1}
            onPress={() => setShowActions(false)}
          />
          <View style={styles.actionSheet}>
            <TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
              <View style={[styles.actionIcon, { backgroundColor: '#6C63FF18' }]}>
                <Ionicons name="create-outline" size={22} color="#6C63FF" />
              </View>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
              <View style={[styles.actionIcon, { backgroundColor: '#FF658418' }]}>
                <Ionicons name="trash-outline" size={22} color="#FF6584" />
              </View>
              <Text style={[styles.actionText, { color: '#FF6584' }]}>Delete</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.cancelItem}
              onPress={() => setShowActions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3436',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 24,
  },
  cancelItem: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#636E72',
  },
});
