import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const EXPORT_FOLDER_KEY = 'aura_export_folder_uri';
const EXPORT_FOLDER_NAME_KEY = 'aura_export_folder_name';

/**
 * Extract a human-readable folder name from a SAF content:// URI.
 */
function extractFolderName(uri: string): string {
    try {
        const decoded = decodeURIComponent(uri);
        // SAF URIs look like: content://...documents/tree/primary:FolderPath/Sub
        const treePart = decoded.split('/tree/').pop() || '';
        // After "primary:" we get the path
        const pathPart = treePart.includes(':') ? treePart.split(':').slice(1).join(':') : treePart;
        // Take just the last path segment
        const segments = pathPart.split('/').filter(Boolean);
        return segments.length > 0 ? segments[segments.length - 1] : 'Selected Folder';
    } catch {
        return 'Selected Folder';
    }
}

/**
 * Get the persisted export folder URI (SAF content:// URI on Android).
 */
export async function getExportFolderUri(): Promise<string | null> {
    return AsyncStorage.getItem(EXPORT_FOLDER_KEY);
}

/**
 * Get the human-readable folder name for display.
 */
export async function getExportFolderName(): Promise<string | null> {
    return AsyncStorage.getItem(EXPORT_FOLDER_NAME_KEY);
}

/**
 * Check if an export folder has been configured.
 */
export async function hasExportFolder(): Promise<boolean> {
    const uri = await getExportFolderUri();
    return uri !== null;
}

/**
 * Prompt the user to pick a directory for saving recordings.
 * On Android, this uses the Storage Access Framework folder picker.
 * Returns the granted directory URI, or null if the user cancelled.
 */
export async function requestExportFolder(): Promise<string | null> {
    if (Platform.OS !== 'android') {
        // SAF is Android-only
        return null;
    }

    try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
            return null;
        }

        // The user picked a directory — persist the URI
        const directoryUri = permissions.directoryUri;
        const folderName = extractFolderName(directoryUri);
        await AsyncStorage.setItem(EXPORT_FOLDER_KEY, directoryUri);
        await AsyncStorage.setItem(EXPORT_FOLDER_NAME_KEY, folderName);
        return directoryUri;
    } catch {
        return null;
    }
}

/**
 * Clear the configured export folder.
 */
export async function clearExportFolder(): Promise<void> {
    await AsyncStorage.removeItem(EXPORT_FOLDER_KEY);
}

/**
 * Export a recording file to the user's chosen "Lecture Recordings" folder.
 * Reads the internal file as base64 and writes it via SAF.
 * Returns true if export succeeded, false if skipped/failed.
 */
export async function exportRecordingToFolder(
    internalFilePath: string,
    fileName: string,
): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
        const folderUri = await getExportFolderUri();
        if (!folderUri) return false;

        // Determine MIME type from extension
        const ext = fileName.split('.').pop()?.toLowerCase() || 'm4a';
        const mimeTypes: Record<string, string> = {
            m4a: 'audio/mp4',
            caf: 'audio/x-caf',
            aac: 'audio/aac',
            wav: 'audio/wav',
            webm: 'audio/webm',
        };
        const mimeType = mimeTypes[ext] || 'audio/mp4';

        // Create the file in the SAF directory
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            folderUri,
            fileName,
            mimeType,
        );

        // Read the internal file as base64
        const base64Content = await FileSystem.readAsStringAsync(internalFilePath, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Write to the SAF file
        await FileSystem.writeAsStringAsync(fileUri, base64Content, {
            encoding: FileSystem.EncodingType.Base64,
        });

        return true;
    } catch (e) {
        console.warn('Export to folder failed:', e);
        return false;
    }
}
