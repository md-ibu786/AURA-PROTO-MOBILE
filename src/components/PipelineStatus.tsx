import { useEffect, useRef, useState, useCallback } from 'react';
import { getPipelineStatus, type PipelineStatus as PipelineStatusType } from '../services/api';
import './PipelineStatus.css';

interface PipelineStatusProps {
    jobId: string;
    onComplete: (result: NonNullable<PipelineStatusType['result']>) => void;
    onError: (message: string) => void;
}

const STEPS = [
    { key: 'transcribing', label: 'Transcribing', icon: '🎤' },
    { key: 'refining', label: 'Refining', icon: '✨' },
    { key: 'summarizing', label: 'Generating Notes', icon: '📝' },
    { key: 'generating_pdf', label: 'Creating PDF', icon: '📄' },
    { key: 'complete', label: 'Done', icon: '✅' },
];

function getStepIndex(status: string): number {
    const idx = STEPS.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
}

export default function PipelineStatus({ jobId, onComplete, onError }: PipelineStatusProps) {
    const [status, setStatus] = useState<PipelineStatusType | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCompleteRef = useRef(onComplete);
    const onErrorRef = useRef(onError);

    // Keep refs in sync
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;

    const poll = useCallback(async () => {
        try {
            const data = await getPipelineStatus(jobId);
            setStatus(data);

            if (data.status === 'complete' && data.result) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onCompleteRef.current(data.result);
            } else if (data.status === 'error') {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onErrorRef.current(data.message || 'Pipeline failed');
            }
        } catch {
            // keep polling
        }
    }, [jobId]);

    useEffect(() => {
        poll(); // immediate first poll
        intervalRef.current = setInterval(poll, 3000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [poll]);

    const currentStep = status ? getStepIndex(status.status) : -1;
    const progress = status?.progress || 0;

    return (
        <div className="pipeline-status">
            <h3 className="pipeline-title">Processing Your Lecture</h3>

            {/* Progress Bar */}
            <div className="pipeline-progress-bar">
                <div
                    className="pipeline-progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="pipeline-progress-label">{progress}%</div>

            {/* Steps */}
            <div className="pipeline-steps">
                {STEPS.map((step, idx) => {
                    let stepClass = 'pipeline-step';
                    if (idx < currentStep) stepClass += ' pipeline-step--done';
                    else if (idx === currentStep) stepClass += ' pipeline-step--active';

                    return (
                        <div key={step.key} className={stepClass}>
                            <span className="pipeline-step-icon">{step.icon}</span>
                            <span className="pipeline-step-label">{step.label}</span>
                            {idx === currentStep && status?.status !== 'complete' && (
                                <span className="pipeline-step-spinner" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Message */}
            {status?.message && (
                <p className="pipeline-message">{status.message}</p>
            )}
        </div>
    );
}
