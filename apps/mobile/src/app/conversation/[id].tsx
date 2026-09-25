import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import type { Message } from '@eikaiwa/contracts';
import { useAuthStore } from '../../state/authStore';
import { useConversationStore } from '../../state/conversationStore';

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isJapaneseIntent = message.role === 'user' && message.language === 'ja';
  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        isJapaneseIntent && styles.jpIntentBubble,
      ]}
    >
      {isJapaneseIntent ? <Text style={styles.jpIntentLabel}>言いたいこと（日本語）</Text> : null}
      <Text style={isUser ? styles.userText : styles.assistantText}>{message.text}</Text>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);

  const conversationId = useConversationStore((s) => s.conversationId);
  const messages = useConversationStore((s) => s.messages);
  const phase = useConversationStore((s) => s.phase);
  const pendingSuggestion = useConversationStore((s) => s.pendingSuggestion);
  const draftText = useConversationStore((s) => s.draftText);
  const momentCandidates = useConversationStore((s) => s.momentCandidates);
  const setDraftText = useConversationStore((s) => s.setDraftText);
  const loadConversation = useConversationStore((s) => s.loadConversation);
  const requestCompose = useConversationStore((s) => s.requestCompose);
  const cancelCompose = useConversationStore((s) => s.cancelCompose);
  const sendReply = useConversationStore((s) => s.sendReply);

  const [showComposePanel, setShowComposePanel] = useState(false);
  const [jpIntentInput, setJpIntentInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    if (conversationId === id) return;
    loadConversation(token, id).catch((err) => {
      setLoadError(err instanceof Error ? err.message : '会話を読み込めませんでした');
    });
  }, [token, id, conversationId, loadConversation]);

  if (!token) {
    return (
      <View style={styles.centered}>
        <Text>ログインが必要です。</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{loadError}</Text>
      </View>
    );
  }

  if (conversationId !== id) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const isBusy = phase.status === 'composing_en' || phase.status === 'generating_reply';

  const handleCompose = async () => {
    if (!jpIntentInput.trim()) return;
    await requestCompose(token, jpIntentInput.trim());
  };

  const handleUseSuggestion = () => {
    if (!pendingSuggestion) return;
    setDraftText(pendingSuggestion.englishText);
    setShowComposePanel(false);
  };

  const handleSend = async () => {
    await sendReply(token);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/session-result')}
              accessibilityRole="button"
              accessibilityLabel="セッションを終了する"
            >
              <Text style={styles.headerAction}>終了 ({momentCandidates.length})</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListEmptyComponent={<Text style={styles.emptyText}>「言いたいことを日本語で」から始めましょう。</Text>}
      />

      {phase.status === 'error' ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{phase.message}</Text>
          {phase.retryable ? <Text style={styles.errorBannerHint}>入力は保持されています。再試行できます。</Text> : null}
        </View>
      ) : null}

      {showComposePanel ? (
        <View style={styles.composePanel}>
          <Text style={styles.composeLabel}>言いたいことを日本語で</Text>
          <TextInput
            style={styles.composeInput}
            placeholder="例: 来週の出張の予定を確認したい"
            value={jpIntentInput}
            onChangeText={setJpIntentInput}
            multiline
          />
          <View style={styles.composeActions}>
            <TouchableOpacity
              style={[styles.smallButton, styles.smallButtonSecondary]}
              onPress={() => setShowComposePanel(false)}
              accessibilityRole="button"
            >
              <Text style={styles.smallButtonSecondaryText}>閉じる</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={handleCompose}
              disabled={phase.status === 'composing_en' || !jpIntentInput.trim()}
              accessibilityRole="button"
            >
              {phase.status === 'composing_en' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.smallButtonText}>英語にする</Text>
              )}
            </TouchableOpacity>
          </View>

          {pendingSuggestion ? (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionText}>{pendingSuggestion.englishText}</Text>
              <View style={styles.composeActions}>
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallButtonSecondary]}
                  onPress={cancelCompose}
                  accessibilityRole="button"
                >
                  <Text style={styles.smallButtonSecondaryText}>自分で書く</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={handleUseSuggestion} accessibilityRole="button">
                  <Text style={styles.smallButtonText}>この英語を使う</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.jpToggleButton}
          onPress={() => setShowComposePanel((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="言いたいことを日本語で"
        >
          <Text style={styles.jpToggleButtonText}>JP</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="英語で入力（文字で入力）"
          value={draftText}
          onChangeText={setDraftText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!draftText.trim() || isBusy) && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={!draftText.trim() || isBusy}
          accessibilityRole="button"
          accessibilityLabel="送信"
        >
          {phase.status === 'generating_reply' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>送信</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b' },
  headerAction: { color: '#208AEF', fontWeight: '600', marginRight: 12 },
  messageList: { padding: 16, gap: 8 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
  bubble: { maxWidth: '85%', borderRadius: 12, padding: 12, marginBottom: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#208AEF' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#F0F0F0' },
  jpIntentBubble: { backgroundColor: '#FFF3D6' },
  jpIntentLabel: { fontSize: 10, color: '#8a6d1f', marginBottom: 2 },
  userText: { color: '#fff', fontSize: 15 },
  assistantText: { color: '#222', fontSize: 15 },
  errorBanner: { backgroundColor: '#FDECEA', padding: 10 },
  errorBannerText: { color: '#c0392b', fontSize: 13 },
  errorBannerHint: { color: '#c0392b', fontSize: 11, marginTop: 2 },
  composePanel: { borderTopWidth: 1, borderTopColor: '#eee', padding: 12, gap: 8, backgroundColor: '#FAFAFA' },
  composeLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  composeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    backgroundColor: '#fff',
  },
  composeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  smallButton: { backgroundColor: '#208AEF', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  smallButtonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  smallButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  smallButtonSecondaryText: { color: '#555', fontWeight: '600', fontSize: 13 },
  suggestionBox: { marginTop: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 10, gap: 8 },
  suggestionText: { fontSize: 15, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  jpToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jpToggleButtonText: { fontSize: 12, fontWeight: '700', color: '#8a6d1f' },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#208AEF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});
