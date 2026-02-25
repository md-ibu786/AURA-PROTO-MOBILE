import { type RecorderStatus } from '../hooks/useRecorder';
import './RecordingControls.css';

interface RecordingControlsProps {
    status: RecorderStatus;
    duration: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    disabled?: boolean;
}

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
        return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function RecordingControls({
    status,
    duration,
    onStart,
    onPause,
    onResume,
    onStop,
    disabled = false,
}: RecordingControlsProps) {
    const isRecording = status === 'recording';
    const isPaused = status === 'paused';
    const isActive = isRecording || isPaused;

    return (
        <div className="recording-controls">
            {/* Timer */}
            <div className={`rec-timer ${isRecording ? 'rec-timer--active' : ''}`}>
                {isRecording && <span className="rec-dot" />}
                <span className="rec-time">{formatTime(duration)}</span>
                {isRecording && <span className="rec-label">REC</span>}
                {isPaused && <span className="rec-label rec-label--paused">PAUSED</span>}
            </div>

            {/* Main Controls */}
            <div className="rec-buttons">
                {!isActive ? (
                    /* Start Button */
                    <button
                        className="rec-btn rec-btn--start"
                        onClick={onStart}
                        disabled={disabled}
                        title="Start Recording"
                    >
                        <div className="rec-btn-inner">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" />
                                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
                                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <span>Start Recording</span>
                    </button>
                ) : (
                    /* Active Controls */
                    <>
                        {isRecording ? (
                            <button
                                className="rec-btn rec-btn--pause"
                                onClick={onPause}
                                title="Pause"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                </svg>
                                <span>Pause</span>
                            </button>
                        ) : (
                            <button
                                className="rec-btn rec-btn--resume"
                                onClick={onResume}
                                title="Resume"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <polygon points="5,3 19,12 5,21" />
                                </svg>
                                <span>Resume</span>
                            </button>
                        )}
                        <button
                            className="rec-btn rec-btn--stop"
                            onClick={onStop}
                            title="Stop & Submit"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <rect x="4" y="4" width="16" height="16" rx="2" />
                            </svg>
                            <span>End Lecture</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
