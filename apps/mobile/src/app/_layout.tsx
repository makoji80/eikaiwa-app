import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setAudioModeAsync } from 'expo-audio';
import { useAuthStore } from '../state/authStore';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    // マナーモード/サイレントモードでも録音・読み上げ両方が動くようにする。
    // シミュレータ等オーディオ非対応環境でも起動が落ちないようtry/catchで包む。
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="index" options={{ title: 'eikaiwa' }} />
        <Stack.Screen name="conversation/[id]" options={{ title: '会話' }} />
        <Stack.Screen name="session-result" options={{ title: 'セッション結果', presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
