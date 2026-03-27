import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#2D3436',
};

interface Props {
  items: { id: string }[];
  renderItem: (item: any, isSelected: boolean) => React.ReactNode;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
}

export default function SelectableList({
  items, renderItem, onEdit, onDelete, onDeleteMultiple,
}: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(items.map((i) => i.id)));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    const count = selected.size;
    const doDelete = () => {
      if (onDeleteMultiple) {
        onDeleteMultiple(Array.from(selected));
      } else if (onDelete) {
        selected.forEach((id) => onDelete(id));
      }
      exitSelectMode();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${count} entries?`)) doDelete();
    } else {
      Alert.alert('Delete', `Delete ${count} entries?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleItemPress = (item: any) => {
    if (selectMode) {
      toggleSelect(item.id);
    } else {
      // Show action sheet (edit/delete)
      onEdit?.(item);
    }
  };

  const handleItemLongPress = (item: any) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set([item.id]));
    }
  };

  return (
    <View style={styles.container}>
      {/* Selection toolbar */}
      {selectMode && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={exitSelectMode} style={styles.toolbarBtn}>
            <Ionicons name="close" size={20} color={COLORS.text} />
            <Text style={styles.toolbarText}>{selected.size} selected</Text>
          </TouchableOpacity>
          <View style={styles.toolbarActions}>
            <TouchableOpacity onPress={selectAll} style={styles.toolbarBtn}>
              <Text style={[styles.toolbarText, { color: COLORS.primary }]}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteSelected}
              style={styles.deleteBtn}
              disabled={selected.size === 0}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Items */}
      {items.map((item) => {
        const isSelected = selected.has(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleItemLongPress(item)}
            style={styles.itemWrapper}
          >
            {selectMode && (
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            )}
            <View style={[styles.itemContent, isSelected && styles.itemSelected]}>
              {renderItem(item, isSelected)}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  toolbarText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  itemContent: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemSelected: {
    opacity: 0.85,
  },
});
