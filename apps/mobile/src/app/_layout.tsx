import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../state/authStore';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
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
