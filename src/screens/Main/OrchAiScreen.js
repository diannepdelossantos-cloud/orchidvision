import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { sendOrchAiMessage } from '../../services/supabase/orchAiService';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

const GREETING = {
  id: 'greeting',
  role: 'model',
  text: "Hi! I'm OrchAi. I can explain your Waling-waling's diagnosis, symptoms, and care steps. What would you like to know?",
};

// Ready-to-send prompts shown above the input box.
const SUGGESTED_QUESTIONS = [
  'How do I care for a Waling-waling orchid?',
  'What causes Black Rot and how do I treat it?',
  'How do I treat Bacterial Soft Rot?',
  'What are the signs of Anthracnose?',
  'How do I prevent Sunburn on my Waling-waling?',
  'What does Leaf Spot look like and how do I treat it?',
  'How is Bacterial Brown Spot different from Leaf Spot?',
  'How often should I water a Waling-waling?',
  'How much light does a Waling-waling need?',
  'What fertilizer is best for Waling-waling?',
  'How do I help my orchid recover after a disease?',
];

const MAX_INPUT_LENGTH = 1000;

function BotAvatar({ colors }) {
  return (
    <View style={[styles.avatar, { backgroundColor: `${colors.primary}26` }]}>
      <MaterialCommunityIcons name="robot-outline" size={16} color={colors.primary} />
    </View>
  );
}

function MessageBubble({ message, colors }) {
  if (message.role === 'user') {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: colors.primary }]}>
          <Text style={[styles.bubbleText, { color: colors.textInverse }]}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <BotAvatar colors={colors} />
      <View
        style={[
          styles.bubble,
          styles.bubbleBot,
          {
            backgroundColor: colors.surface,
            borderColor: message.isError ? colors.error : colors.border,
          },
        ]}
      >
        <Text style={[styles.bubbleText, { color: message.isError ? colors.error : colors.textPrimary }]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

function TypingBubble({ colors }) {
  return (
    <View style={styles.row}>
      <BotAvatar colors={colors} />
      <View style={[styles.bubble, styles.bubbleBot, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    </View>
  );
}

export default function OrchAiScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const send = async (rawText) => {
    const text = rawText.trim();
    if (!text || sending) return;

    const userMessage = { id: `u-${Date.now()}`, role: 'user', text };
    // Error bubbles are UI-only, so they're left out of the history sent to Gemini.
    const history = [...messages.filter((m) => !m.isError), userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const reply = await sendOrchAiMessage(history);
      setMessages((prev) => [...prev, { id: `m-${Date.now()}`, role: 'model', text: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'model', text: error.message, isError: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  const canSend = input.trim().length > 0 && !sending;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>OrchAi</Text>
            <Text style={[styles.titleTag, { color: colors.textPrimary }]}>AI Assistant Care Bot</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ask about Waling-waling symptoms, care, and treatment
          </Text>
        </View>

        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
          ListFooterComponent={sending ? <TypingBubble colors={colors} /> : null}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionsContent}
        >
          {SUGGESTED_QUESTIONS.map((question) => (
            <TouchableOpacity
              key={question}
              style={[
                styles.chip,
                { borderColor: colors.primary, backgroundColor: colors.surface, opacity: sending ? 0.5 : 1 },
              ]}
              onPress={() => send(question)}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: colors.primary }]}>{question}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputWrap}>
          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ask about your orchid's health..."
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              maxLength={MAX_INPUT_LENGTH}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.5 }]}
              onPress={() => send(input)}
              disabled={!canSend}
              accessibilityLabel="Send message"
            >
              <Ionicons name="paper-plane-outline" size={18} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  title: { ...TYPOGRAPHY.h1 },
  titleTag: { ...TYPOGRAPHY.body, fontWeight: '700' },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },

  messages: { padding: SPACING.md, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  rowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  bubbleBot: { borderWidth: 1 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleText: { ...TYPOGRAPHY.body, lineHeight: 21 },

  suggestions: { flexGrow: 0 },
  suggestionsContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  chip: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  chipText: { ...TYPOGRAPHY.caption, fontWeight: '600' },

  inputWrap: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs + 2,
    paddingVertical: SPACING.xs + 2,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    maxHeight: 100,
    paddingVertical: SPACING.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
});
