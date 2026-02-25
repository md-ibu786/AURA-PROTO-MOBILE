import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped';

interface RecorderState {
    status: RecorderStatus;
    duration: number; // seconds
    audioBlob: Blob | null;
    error: string | null;
}

export function useRecorder() {
    const [state, setState] = useState<RecorderState>({
        status: 'idle',
        duration: 0,
        audioBlob: null,
        error: null,
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const startTimer = useCallback(() => {
        timerRef.current = setInterval(() => {
            setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const start = useCallback(async () => {
        try {
            chunksRef.current = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Prefer webm, fallback to mp4 (Safari)
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/mp4')
                    ? 'audio/mp4'
                    : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setState((prev) => ({
                    ...prev,
                    status: 'stopped',
                    audioBlob: blob,
                }));
                // Stop the stream tracks
                stream.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            };

            recorder.onerror = () => {
                setState((prev) => ({
                    ...prev,
                    status: 'idle',
                    error: 'Recording failed. Please check microphone permissions.',
                }));
            };

            recorder.start(1000); // Collect data every second
            setState({
                status: 'recording',
                duration: 0,
                audioBlob: null,
                error: null,
            });
            startTimer();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Microphone access denied';
            setState((prev) => ({ ...prev, error: message }));
        }
    }, [startTimer]);

    const pause = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
            stopTimer();
            setState((prev) => ({ ...prev, status: 'paused' }));
        }
    }, [stopTimer]);

    const resume = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
            startTimer();
            setState((prev) => ({ ...prev, status: 'recording' }));
        }
    }, [startTimer]);

    const stop = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
        ) {
            mediaRecorderRef.current.stop();
            stopTimer();
        }
    }, [stopTimer]);

    const reset = useCallback(() => {
        chunksRef.current = [];
        setState({
            status: 'idle',
            duration: 0,
            audioBlob: null,
            error: null,
        });
    }, []);

    return {
        status: state.status,
        duration: state.duration,
        audioBlob: state.audioBlob,
        error: state.error,
        start,
        pause,
        resume,
        stop,
        reset,
    };
}
