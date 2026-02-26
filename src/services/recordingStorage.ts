import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { generateUUID } from '../utils/uuid';

const STORAGE_KEY = 'aura_recordings';
const RECORDINGS_DIR = `${FileSystem.documentDirectory}aura_recordings/`;

export interface SavedRecording {
    id: string;
    title: string;
    moduleId: string | null;
    moduleName: string | null;
    filePath: string;        // permanent path in app document directory
    durationMs: number;
    createdAt: string;       // ISO timestamp
    uploaded: boolean;
    uploadError?: string;
}

async function ensureDir() {
    const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
    }
}

export async function getAllRecordings(): Promise<SavedRecording[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (!json) return [];
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function saveAll(recordings: SavedRecording[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
}

export async function saveRecording(
    tempUri: string,
    title: string,
    durationMs: number,
    moduleId: string | null,
    moduleName: string | null,
): Promise<SavedRecording> {
    await ensureDir();
    const id = generateUUID();

    // Detect file extension from the source URI
    const uriLower = tempUri.toLowerCase();
    let ext = 'm4a';
    if (uriLower.endsWith('.caf')) ext = 'caf';
    else if (uriLower.endsWith('.webm')) ext = 'webm';
    else if (uriLower.endsWith('.aac')) ext = 'aac';
    else if (uriLower.endsWith('.wav')) ext = 'wav';

    const fileName = `recording-${id}.${ext}`;
    const filePath = `${RECORDINGS_DIR}${fileName}`;

    // Copy from temp location to permanent document directory
    await FileSystem.copyAsync({ from: tempUri, to: filePath });

    const recording: SavedRecording = {
        id,
        title: title.trim() || 'Untitled Lecture',
        moduleId,
        moduleName,
        filePath,
        durationMs,
        createdAt: new Date().toISOString(),
        uploaded: false,
    };

    const all = await getAllRecordings();
    all.unshift(recording); // newest first
    await saveAll(all);
    return recording;
}

export async function markUploaded(id: string) {
    const all = await getAllRecordings();
    const updated = all.map((r) =>
        r.id === id ? { ...r, uploaded: true, uploadError: undefined } : r
    );
    await saveAll(updated);
}

export async function markUploadFailed(id: string, error: string) {
    const all = await getAllRecordings();
    const updated = all.map((r) =>
        r.id === id ? { ...r, uploadError: error } : r
    );
    await saveAll(updated);
}

export async function deleteRecording(id: string) {
    const all = await getAllRecordings();
    const recording = all.find((r) => r.id === id);
    if (recording) {
        try {
            await FileSystem.deleteAsync(recording.filePath, { idempotent: true });
        } catch { }
    }
    await saveAll(all.filter((r) => r.id !== id));
}
