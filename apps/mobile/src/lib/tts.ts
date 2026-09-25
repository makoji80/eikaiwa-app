import * as Speech from 'expo-speech';

/**
 * AI応答の読み上げ。サーバーを経由しない端末上のTTSを使うため、
 * 音声ファイルの生成・送受信・保存が一切発生しない。
 */
export function speakEnglish(text: string, onDone?: () => void): void {
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
