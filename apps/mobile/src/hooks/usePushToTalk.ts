import { useCallback, useRef, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { File } from 'expo-file-system';

/**
 * 押して話す(push-to-talk)方式の録音フック。
 * 録音ファイルは一時ファイル(キャッシュディレクトリ)に作られ、base64化した直後に
 * 端末上からも削除する — サーバー・端末のどちらにも音声を残さない。
 */

export type MicPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface RecordedAudio {
  audioBase64: string;
  mimeType: string;
}

const MIME_TYPE = 'audio/m4a';
/** RecordingPresets.HIGH_QUALITY は .m4a (AAC) を出力する。 */

export function usePushToTalk() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>('undetermined');
  const isPreparingRef = useRef(false);

  const checkPermission = useCallback(async (): Promise<MicPermissionStatus> => {
    const { status } = await getRecordingPermissionsAsync();
    const normalized = (status as MicPermissionStatus) ?? 'undetermined';
    setMicPermission(normalized);
    return normalized;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { granted, status } = await requestRecordingPermissionsAsync();
    setMicPermission(granted ? 'granted' : ((status as MicPermissionStatus) ?? 'denied'));
    return granted;
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    let granted = micPermission === 'granted';
    if (!granted) {
      const current = await checkPermission();
      granted = current === 'granted' ? true : await requestPermission();
    }
    if (!granted) return false;

    try {
      isPreparingRef.current = true;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch {
      return false;
    } finally {
      isPreparingRef.current = false;
    }
  }, [checkPermission, micPermission, recorder, requestPermission]);

  const stopRecording = useCallback(async (): Promise<RecordedAudio | null> => {
    if (!recorderState.isRecording && !isPreparingRef.current) return null;
    try {
      await recorder.stop();
    } catch {
      return null;
    }
    const uri = recorder.uri;
    if (!uri) return null;
    try {
      const file = new File(uri);
      const audioBase64 = await file.base64();
      file.delete();
      return { audioBase64, mimeType: MIME_TYPE };
    } catch {
      return null;
    }
  }, [recorder, recorderState.isRecording]);

  return {
    isRecording: recorderState.isRecording,
    micPermission,
    checkPermission,
    requestPermission,
    startRecording,
    stopRecording,
  };
}
