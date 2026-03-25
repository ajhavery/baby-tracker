import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_TOP_PADDING } from '../utils/platform';
import { parseAndSave, ParseResult } from '../services/chatParser';
import { triggerAutoSync } from '../services/autoSync';

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

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  type?: ParseResult['type'];
  success?: boolean;
  timestamp: Date;
}

const EXAMPLES = [
  'latched from 6:10 pm to 6:30 pm',
  '80ml expressed at 9am',
  'potty at 3:30 pm',
  'urine at 2pm',
  'weight 3.5 kg, height 52 cm',
  'vitamin d done',
  'pee and poop at 4pm',
  'breastfed for 10 mins',
  '60ml bottle at 5pm',
  'BCG given today',
];

export default function ChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Hi! Type entries in plain language and I\'ll log them for you. Try things like:\n\n- "latched from 6:10 pm to 6:30 pm"\n- "80ml expressed at 9am"\n- "potty at 3pm"\n- "weight 3.5 kg"\n- "vitamin d done"',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || processing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setProcessing(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const result = await parseAndSave(text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: result.message,
      isUser: false,
      type: result.type,
      success: result.success,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMsg]);
    setProcessing(false);

    if (result.success) {
      triggerAutoSync();
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleQuickEntry = (example: string) => {
    setInput(example);
  };

  const getTypeIcon = (type?: ParseResult['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'feed_expressed': return 'water';
      case 'feed_latched': return 'heart';
      case 'diaper': return 'layers';
      case 'growth': return 'trending-up';
      case 'task': return 'checkmark-circle';
      case 'vaccination': return 'medical';
      default: return 'chatbubble';
    }
  };

  const getTypeColor = (type?: ParseResult['type']) => {
    switch (type) {
      case 'feed_expressed': return COLORS.accent3;
      case 'feed_latched': return COLORS.accent2;
      case 'diaper': return COLORS.accent1;
      case 'growth': return COLORS.accent2;
      case 'task': return COLORS.accent1;
      case 'vaccination': return COLORS.secondary;
      default: return COLORS.textLight;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quick Entry</Text>
          <Text style={styles.headerSubtitle}>Type in plain language</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.isUser ? styles.userBubble : styles.botBubble,
            ]}
          >
            {!msg.isUser && msg.type && msg.success && (
              <View style={styles.typeTag}>
                <Ionicons name={getTypeIcon(msg.type)} size={14} color={getTypeColor(msg.type)} />
                <Text style={[styles.typeTagText, { color: getTypeColor(msg.type) }]}>
                  {msg.type?.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                </Text>
              </View>
            )}
            <Text style={[styles.messageText, msg.isUser && styles.userText]}>
              {msg.text}
            </Text>
            {!msg.isUser && msg.success === false && msg.id !== 'welcome' && (
              <Ionicons name="alert-circle" size={16} color={COLORS.secondary} style={{ marginTop: 4 }} />
            )}
            {!msg.isUser && msg.success === true && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent1} style={{ marginTop: 4 }} />
            )}
          </View>
        ))}

        {processing && (
          <View style={[styles.messageBubble, styles.botBubble]}>
            <Text style={styles.messageText}>Processing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Examples */}
      {messages.length <= 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.examplesRow}
          contentContainerStyle={styles.examplesContent}
        >
          {EXAMPLES.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={styles.exampleChip}
              onPress={() => handleQuickEntry(ex)}
            >
              <Text style={styles.exampleText}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="e.g. latched from 6pm to 6:20pm"
          placeholderTextColor="#B0B0B0"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!processing}
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || processing) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || processing}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: COLORS.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  userText: { color: '#fff' },
  typeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 4,
  },
  typeTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  examplesRow: {
    maxHeight: 48,
    backgroundColor: COLORS.card,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  examplesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  exampleChip: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  exampleText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'web' ? 16 : 34,
    backgroundColor: COLORS.card,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
