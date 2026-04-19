import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingResult {
    uri: string;
    durationMs: number;
    mimeType: string;
}

export interface UseRecorderReturn {
    state: RecorderState;
    durationMs: number;
    error: string | null;
    start: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<RecordingResult | null>;
    reset: () => void;
}

export function useRecorder(onInterrupted?: (result: RecordingResult) => void): UseRecorderReturn {
    const [state, setState] = useState<RecorderState>('idle');
    const [durationMs, setDurationMs] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedDurationRef = useRef<number>(0);

    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setDurationMs(pausedDurationRef.current + (Date.now() - startTimeRef.current));
        }, 500);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const start = useCallback(async () => {
        setError(null);
        try {
            const permission = await AudioModule.requestRecordingPermissionsAsync();
            if (!permission.granted) {
                setError('Microphone permission denied. Please allow in Settings.');
                return;
            }
            pausedDurationRef.current = 0;
            await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
            recorder.record();
            setState('recording');
            startTimer();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to start recording');
        }
    }, [recorder, startTimer]);

    const pause = useCallback(async () => {
        if (state === 'recording') {
            try {
                recorder.pause();
                stopTimer();
                pausedDurationRef.current += Date.now() - startTimeRef.current;
                setState('paused');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to pause');
            }
        }
    }, [state, recorder, stopTimer]);

    const resume = useCallback(async () => {
        if (state === 'paused') {
            try {
                recorder.record();
                setState('recording');
                startTimer();
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to resume');
            }
        }
    }, [state, recorder, startTimer]);

    const stop = useCallback(async (): Promise<RecordingResult | null> => {
        try {
            stopTimer();
            await recorder.stop();
            const uri = recorder.uri;
            const totalMs = pausedDurationRef.current +
                (state === 'recording' ? Date.now() - startTimeRef.current : 0);

            setState('stopped');
            setDurationMs(totalMs);

            if (!uri) return null;
            return { uri, durationMs: totalMs, mimeType: 'audio/m4a' };

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to stop recording');
            return null;
        }
    }, [recorder, state, stopTimer]);

    const reset = useCallback(() => {
        setState('idle');
        setDurationMs(0);
        setError(null);
        pausedDurationRef.current = 0;
    }, []);

    // AppState listener to handle interruptions (phone call, app background)
    const onInterruptedRef = useRef(onInterrupted);
    useEffect(() => {
        onInterruptedRef.current = onInterrupted;
    }, [onInterrupted]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
            if ((nextState === 'background' || nextState === 'inactive') && state === 'recording') {
                // Auto-stop the recording to finalize the audio file
                try {
                    stopTimer();
                    await recorder.stop();
                    const uri = recorder.uri;
                    const totalMs = pausedDurationRef.current + (Date.now() - startTimeRef.current);

                    setState('stopped');
                    setDurationMs(totalMs);

                    if (onInterruptedRef.current && uri) {
                        onInterruptedRef.current({ uri, durationMs: totalMs, mimeType: 'audio/m4a' });
                    }
                } catch (e) {
                    setError(e instanceof Error ? e.message : 'Recording interrupted unsuccessfully');
                    reset();
                }
            }
        });

        return () => subscription.remove();
    }, [state, recorder, stopTimer, reset]);

    return { state, durationMs, error, start, pause, resume, stop, reset };
}
