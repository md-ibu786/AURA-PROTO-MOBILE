import * as FileSystem from 'expo-file-system/legacy';
import { getAllRecordings, markUploaded, markUploadFailed } from './recordingStorage';
import firebase from '../config/firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';

export async function uploadRecording(
    recordingId: string,
    filePath: string,
    title: string,
    moduleId: string | null,
    user: firebase.User,
): Promise<void> {
    const token = await user.getIdToken();

    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
        await markUploadFailed(recordingId, 'Audio file not found on device.');
        return;
    }

    const formData = new FormData();
    formData.append('file', {
        uri: filePath,
        name: 'recording.m4a',
        type: 'audio/mp4',
    } as unknown as Blob);
    formData.append('topic', title);
    if (moduleId) formData.append('moduleId', moduleId);

    const res = await fetch(`${API_URL}/api/audio/process-pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
    }

    await markUploaded(recordingId);
}

/**
 * Try to upload all pending recordings. Called on app start and when network reconnects.
 */
export async function processPendingUploads(user: firebase.User): Promise<void> {
    const recordings = await getAllRecordings();
    const pending = recordings.filter((r) => !r.uploaded);

    for (const rec of pending) {
        try {
            await uploadRecording(rec.id, rec.filePath, rec.title, rec.moduleId, user);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Upload failed';
            await markUploadFailed(rec.id, msg);
        }
    }
}
