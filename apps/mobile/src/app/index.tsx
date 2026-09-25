import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../state/authStore';
import { useConversationStore } from '../state/conversationStore';
import { AuthForm } from '../components/AuthForm';

export default function HomeScreen() {
  const status = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const startConversation = useConversationStore((s) => s.startConversation);

  const [topic, setTopic] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'signedOut' || !token) {
    return <AuthForm />;
  }

  const handleStart = async (withTopic: boolean) => {
    setError(null);
    setStarting(true);
    try {
      const conversationId = await startConversation(token, withTopic ? topic.trim() || undefined : undefined);
      router.push(`/conversation/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '会話を開始できませんでした');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>今日は何について話しますか？</Text>

      <TextInput
        style={styles.input}
        placeholder="話題（任意）例: 来週の出張について"
        value={topic}
        onChangeText={setTopic}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, starting && styles.buttonDisabled]}
        onPress={() => handleStart(true)}
        disabled={starting}
        accessibilityRole="button"
        accessibilityLabel="会話を始める"
      >
        {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>会話を始める</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => handleStart(false)}
        disabled={starting}
        accessibilityRole="button"
        accessibilityLabel="自由に話す"
      >
        <Text style={styles.secondaryButtonText}>自由に話す</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        復習・進捗・個別化機能は今後のフェーズで対応予定です（docs/OPEN-QUESTIONS.md参照）。
      </Text>

      <TouchableOpacity onPress={() => signOut()} accessibilityRole="button" accessibilityLabel="ログアウト">
        <Text style={styles.signOutText}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: '#c0392b' },
  primaryButton: { backgroundColor: '#208AEF', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#208AEF',
  },
  secondaryButtonText: { color: '#208AEF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  note: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 16 },
  signOutText: { color: '#888', textAlign: 'center', marginTop: 24 },
});
