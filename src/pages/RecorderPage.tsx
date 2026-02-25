import { useState, useCallback } from 'react';
import ModuleSelector from '../components/ModuleSelector';
import RecordingControls from '../components/RecordingControls';
import PipelineStatus from '../components/PipelineStatus';
import { useRecorder } from '../hooks/useRecorder';
import { startPipeline, type PipelineStatus as PipelineStatusType } from '../services/api';
import './RecorderPage.css';

interface RecorderPageProps {
    userName: string | null;
    userRole: string;
    onLogout: () => void;
}

type PageState = 'setup' | 'recording' | 'uploading' | 'processing' | 'success' | 'error';

export default function RecorderPage({ userName, userRole, onLogout }: RecorderPageProps) {
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [pageState, setPageState] = useState<PageState>('setup');
    const [jobId, setJobId] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const recorder = useRecorder();

    const handleModuleSelect = useCallback((modId: string) => {
        setModuleId(modId);
    }, []);

    const canStartRecording = title.trim().length > 0 && moduleId.length > 0;

    const handleStartRecording = useCallback(async () => {
        setPageState('recording');
        await recorder.start();
    }, [recorder]);

    const handleStopRecording = useCallback(() => {
        recorder.stop();
        setPageState('uploading');
    }, [recorder]);

    // Upload audio when blob is available
    const handleUpload = useCallback(async () => {
        if (!recorder.audioBlob) return;
        try {
            setPageState('processing');
            const response = await startPipeline(recorder.audioBlob, title, moduleId);
            setJobId(response.jobId);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
            setPageState('error');
        }
    }, [recorder.audioBlob, title, moduleId]);

    const handlePipelineComplete = useCallback((result: NonNullable<PipelineStatusType['result']>) => {
        setPdfUrl(result.pdfUrl || '');
        setPageState('success');
    }, []);

    const handlePipelineError = useCallback((message: string) => {
        setErrorMsg(message);
        setPageState('error');
    }, []);

    const handleReset = useCallback(() => {
        setTitle('');
        setModuleId('');
        setPageState('setup');
        setJobId('');
        setPdfUrl('');
        setErrorMsg('');
        recorder.reset();
    }, [recorder]);

    return (
        <div className="recorder-page">
            {/* Header */}
            <header className="recorder-header">
                <div className="header-brand">
                    <span className="header-logo">AURA</span>
                    <span className="header-badge">{userRole}</span>
                </div>
                <div className="header-user">
                    <span className="header-name">{userName || 'Staff'}</span>
                    <button className="header-logout" onClick={onLogout}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="recorder-main">
                {/* Setup Phase */}
                {(pageState === 'setup' || pageState === 'recording') && (
                    <div className="recorder-card">
                        <h2 className="card-title">
                            {pageState === 'setup' ? 'New Recording' : 'Recording in Progress'}
                        </h2>

                        {/* Lecture Title */}
                        <div className="input-section">
                            <label htmlFor="lecture-title">Lecture Title</label>
                            <input
                                id="lecture-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Introduction to Machine Learning"
                                disabled={pageState === 'recording'}
                            />
                        </div>

                        {/* Module Selector */}
                        <div className="input-section">
                            <label>Target Module</label>
                            <ModuleSelector
                                onModuleSelect={handleModuleSelect}
                                disabled={pageState === 'recording'}
                            />
                        </div>

                        {/* Divider */}
                        <div className="card-divider" />

                        {/* Recording Controls */}
                        <RecordingControls
                            status={recorder.status}
                            duration={recorder.duration}
                            onStart={handleStartRecording}
                            onPause={recorder.pause}
                            onResume={recorder.resume}
                            onStop={handleStopRecording}
                            disabled={!canStartRecording}
                        />

                        {recorder.error && (
                            <div className="recorder-error">{recorder.error}</div>
                        )}
                    </div>
                )}

                {/* Upload Confirmation */}
                {pageState === 'uploading' && (
                    <div className="recorder-card">
                        <h2 className="card-title">Recording Complete</h2>
                        <div className="upload-summary">
                            <div className="upload-detail">
                                <span className="upload-label">Title</span>
                                <span className="upload-value">{title}</span>
                            </div>
                            <div className="upload-detail">
                                <span className="upload-label">Duration</span>
                                <span className="upload-value">
                                    {Math.floor(recorder.duration / 60)}m {recorder.duration % 60}s
                                </span>
                            </div>
                        </div>
                        <div className="upload-actions">
                            <button className="btn-upload" onClick={handleUpload}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Send to Notes Pipeline
                            </button>
                            <button className="btn-discard" onClick={handleReset}>
                                Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing */}
                {pageState === 'processing' && jobId && (
                    <PipelineStatus
                        jobId={jobId}
                        onComplete={handlePipelineComplete}
                        onError={handlePipelineError}
                    />
                )}

                {/* Success */}
                {pageState === 'success' && (
                    <div className="recorder-card result-card">
                        <div className="result-icon">✅</div>
                        <h2 className="card-title">Notes Generated!</h2>
                        <p className="result-description">
                            Your lecture "<strong>{title}</strong>" has been processed and notes are ready.
                        </p>
                        {pdfUrl && (
                            <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${pdfUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-view-pdf"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                View PDF Notes
                            </a>
                        )}
                        <button className="btn-new-recording" onClick={handleReset}>
                            New Recording
                        </button>
                    </div>
                )}

                {/* Error */}
                {pageState === 'error' && (
                    <div className="recorder-card result-card result-card--error">
                        <div className="result-icon">❌</div>
                        <h2 className="card-title">Processing Failed</h2>
                        <p className="result-description">{errorMsg}</p>
                        <button className="btn-new-recording" onClick={handleReset}>
                            Try Again
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
