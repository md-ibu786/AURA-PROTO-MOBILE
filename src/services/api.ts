import { auth } from '../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
}

// ─── Hierarchy Fetchers ─────────────────────────────────────────

export interface Department {
    id: string;
    name: string;
    code?: string;
}

export interface Semester {
    id: string;
    name: string;
    semester_number?: number;
}

export interface Subject {
    id: string;
    name: string;
    code?: string;
}

export interface Module {
    id: string;
    name: string;
    module_number?: number;
}

export async function fetchDepartments(): Promise<Department[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/departments`, { headers });
    if (!res.ok) throw new Error('Failed to fetch departments');
    const data = await res.json();
    return data.departments || [];
}

export async function fetchSemesters(departmentId: string): Promise<Semester[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(
        `${API_URL}/departments/${departmentId}/semesters`,
        { headers }
    );
    if (!res.ok) throw new Error('Failed to fetch semesters');
    const data = await res.json();
    return data.semesters || [];
}

export async function fetchSubjects(
    semesterId: string,
    departmentId?: string
): Promise<Subject[]> {
    const headers = await getAuthHeaders();
    const url = new URL(`${API_URL}/semesters/${semesterId}/subjects`);
    if (departmentId) url.searchParams.set('department_id', departmentId);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    const data = await res.json();
    return data.subjects || [];
}

export async function fetchModules(
    subjectId: string,
    departmentId?: string,
    semesterId?: string
): Promise<Module[]> {
    const headers = await getAuthHeaders();
    const url = new URL(`${API_URL}/subjects/${subjectId}/modules`);
    if (departmentId) url.searchParams.set('department_id', departmentId);
    if (semesterId) url.searchParams.set('semester_id', semesterId);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error('Failed to fetch modules');
    const data = await res.json();
    return data.modules || [];
}

// ─── Pipeline ───────────────────────────────────────────────────

export interface PipelineStartResponse {
    jobId: string;
    status: string;
}

export interface PipelineStatus {
    jobId: string;
    status: string;
    progress: number;
    message: string | null;
    result: {
        transcript?: string;
        refinedTranscript?: string;
        notes?: string;
        pdfUrl?: string;
        noteId?: string;
    } | null;
}

export async function startPipeline(
    audioBlob: Blob,
    topic: string,
    moduleId: string
): Promise<PipelineStartResponse> {
    const headers = await getAuthHeaders();
    const formData = new FormData();

    // Determine file extension from blob type
    const ext = audioBlob.type.includes('mp4') ? '.mp4' : '.webm';
    formData.append('file', audioBlob, `recording${ext}`);
    formData.append('topic', topic);
    formData.append('moduleId', moduleId);

    const res = await fetch(`${API_URL}/api/audio/process-pipeline`, {
        method: 'POST',
        headers, // Don't set Content-Type — browser sets it with boundary for FormData
        body: formData,
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to start pipeline');
    }
    return res.json();
}

export async function getPipelineStatus(
    jobId: string
): Promise<PipelineStatus> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/audio/pipeline-status/${jobId}`, {
        headers,
    });
    if (!res.ok) throw new Error('Failed to get pipeline status');
    return res.json();
}
