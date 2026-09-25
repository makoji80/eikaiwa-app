import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useConversationStore } from '../state/conversationStore';

const REASON_LABEL: Record<string, string> = {
  could_not_say: '言えなかった表現',
  asked_for_help: '助けを求めた表現',
  repeated_error: '繰り返した誤り',
};

/**
 * セッション結果画面。今回のフェーズでは保存(My Moments)は未実装のため、
 * このセッション中に集まった候補をその場で一覧表示するのみ（Phase 2で永続化対応）。
 */
export default function SessionResultScreen() {
  const momentCandidates = useConversationStore((s) => s.momentCandidates);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>今回のセッションで気づいた表現</Text>
      <Text style={styles.note}>最大5件まで表示（保存機能は今後のフェーズで対応予定）</Text>

      {momentCandidates.length === 0 ? (
        <Text style={styles.empty}>特に気になる表現はありませんでした。</Text>
      ) : (
        <FlatList
          data={momentCandidates.slice(0, 5)}
          keyExtractor={(item, index) => `${item.jp_intent}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.reasonLabel}>{REASON_LABEL[item.reason] ?? item.reason}</Text>
              <Text style={styles.jp}>{item.jp_intent}</Text>
              <Text style={styles.en}>{item.en_expression}</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.buttonText}>会話に戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  heading: { fontSize: 18, fontWeight: '700' },
  note: { fontSize: 12, color: '#888', marginBottom: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 8 },
  reasonLabel: { fontSize: 11, color: '#208AEF', fontWeight: '600', marginBottom: 4 },
  jp: { fontSize: 14, color: '#333' },
  en: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  button: { backgroundColor: '#208AEF', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
