import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DailyTask, TaskCompletion } from '../types';
import {
  getTasks, addTask, deleteTask,
  getTaskCompletionsByDate, addTaskCompletion, removeTaskCompletion,
} from '../storage';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { triggerAutoSync } from '../services/autoSync';
import { formatDate, formatDisplayTime, generateId } from '../utils/helpers';
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
};

export default function TasksScreen() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskTime, setTaskTime] = useState('');

  const loadData = useCallback(async () => {
    const [t, c] = await Promise.all([
      getTasks(),
      getTaskCompletionsByDate(selectedDate),
    ]);
    setTasks(t.filter((task) => task.active));
    setCompletions(c);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const isToday = selectedDate === formatDate(new Date());

  const isCompleted = (taskId: string) =>
    completions.some((c) => c.taskId === taskId);

  const toggleTask = async (taskId: string) => {
    if (isCompleted(taskId)) {
      await removeTaskCompletion(taskId, selectedDate);
    } else {
      await addTaskCompletion({
        id: generateId(),
        taskId,
        date: selectedDate,
        time: formatDisplayTime(
          `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
        ),
      });
    }
    loadData();
    triggerAutoSync();
  };

  const handleAddTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }
    await addTask({
      id: generateId(),
      name: taskName.trim(),
      description: taskDesc.trim() || undefined,
      time: taskTime.trim() || undefined,
      active: true,
      createdDate: formatDate(new Date()),
    });
    setShowModal(false);
    setTaskName('');
    setTaskDesc('');
    setTaskTime('');
    loadData();
    triggerAutoSync();
  };

  const handleDeleteTask = (task: DailyTask) => {
    Alert.alert('Delete Task', `Remove "${task.name}"? This will delete all history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          loadData();
          triggerAutoSync();
        },
      },
    ]);
  };

  const completedCount = tasks.filter((t) => isCompleted(t.id)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Tasks</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        style={styles.dateNav}
      />

      {/* Progress */}
      {tasks.length > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(completedCount / tasks.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount}/{tasks.length} completed
          </Text>
        </View>
      )}

      {/* Task List */}
      <ScrollView style={styles.list}>
        {tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No daily tasks yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to add tasks like Vitamin D, tummy time, etc.
            </Text>
          </View>
        ) : (
          tasks.map((task) => {
            const done = isCompleted(task.id);
            const completion = completions.find((c) => c.taskId === task.id);
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, done && styles.taskCardDone]}
                onPress={() => toggleTask(task.id)}
                onLongPress={() => handleDeleteTask(task)}
              >
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskName, done && styles.taskNameDone]}>
                    {task.name}
                  </Text>
                  {task.description && (
                    <Text style={styles.taskDesc}>{task.description}</Text>
                  )}
                  {task.time && !done && (
                    <Text style={styles.taskTime}>Suggested: {task.time}</Text>
                  )}
                  {done && completion && (
                    <Text style={styles.doneTime}>Done at {completion.time}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Daily Task</Text>

            <Text style={styles.inputLabel}>Task Name</Text>
            <TextInput
              style={styles.input}
              value={taskName}
              onChangeText={setTaskName}
              placeholder="e.g. Vitamin D drops"
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              value={taskDesc}
              onChangeText={setTaskDesc}
              placeholder="e.g. 400 IU after morning feed"
              multiline
            />

            <Text style={styles.inputLabel}>Suggested Time (optional)</Text>
            <TextInput
              style={styles.input}
              value={taskTime}
              onChangeText={setTaskTime}
              placeholder="e.g. 9:00 AM"
            />

            {/* Quick suggestions */}
            <Text style={styles.inputLabel}>Quick Add</Text>
            <View style={styles.quickTags}>
              {[
                { name: 'Vitamin D drops', desc: '400 IU daily' },
                { name: 'Tummy time', desc: '3-5 mins, 2-3x daily' },
                { name: 'Iron supplement', desc: '' },
                { name: 'Gripe water', desc: '' },
                { name: 'Massage / oil', desc: '' },
                { name: 'Bath time', desc: '' },
              ].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.name}
                  style={styles.quickTag}
                  onPress={() => {
                    setTaskName(suggestion.name);
                    if (suggestion.desc) setTaskDesc(suggestion.desc);
                  }}
                >
                  <Text style={styles.quickTagText}>{suggestion.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTask}>
                <Text style={styles.saveBtnText}>Add Task</Text>
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
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: COLORS.card, gap: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  dateText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  progressSection: { paddingHorizontal: 20, paddingVertical: 12 },
  progressBarBg: {
    height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: COLORS.accent1, borderRadius: 3,
  },
  progressText: {
    fontSize: 12, color: COLORS.textLight, marginTop: 6, textAlign: 'right',
  },
  list: { flex: 1, paddingHorizontal: 16 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  taskCardDone: { backgroundColor: '#F0FFF4' },
  checkbox: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    borderColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  checkboxDone: {
    backgroundColor: COLORS.accent1, borderColor: COLORS.accent1,
  },
  taskContent: { flex: 1 },
  taskName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  taskNameDone: { textDecorationLine: 'line-through', color: COLORS.textLight },
  taskDesc: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  taskTime: { fontSize: 12, color: COLORS.accent2, marginTop: 4, fontWeight: '500' },
  doneTime: { fontSize: 12, color: COLORS.accent1, marginTop: 4, fontWeight: '500' },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 8,
  },
  emptyText: { color: COLORS.textLight, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#ccc', fontSize: 13, textAlign: 'center' },
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
  quickTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickTag: {
    backgroundColor: COLORS.primary + '12', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  quickTagText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
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
