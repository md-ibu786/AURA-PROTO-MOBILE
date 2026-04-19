import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, Animated, Easing, Platform, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecorder } from '../hooks/useRecorder';
import type { RecordingResult } from '../hooks/useRecorder';
import {
    saveRecording, getAllRecordings, deleteRecording,
    type SavedRecording,
} from '../services/recordingStorage';
import { uploadRecording, processPendingUploads } from '../services/uploadQueue';
import { hasExportFolder, requestExportFolder, getExportFolderUri, getExportFolderName } from '../services/exportService';
import ModuleSelector from '../components/ModuleSelector';
import RecordingCard from '../components/RecordingCard';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { useAppTheme } from '../hooks/useTheme';
import { Spacing, Radius } from '../theme';
import firebase from '../config/firebase';

interface RecorderScreenProps {
    user: firebase.User;
    displayName: string;
    onLogout: () => void;
}

interface ToastState {
    message: string;
    type: 'success' | 'error';
}

function formatDuration(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ONBOARDING_KEY = 'aura_onboarding_complete';

export default function RecorderScreen({ user, displayName, onLogout }: RecorderScreenProps) {
    const { colors, isDark, toggleTheme } = useAppTheme();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState<string | null>(null);
    const [moduleName, setModuleName] = useState<string | null>(null);
    const [recordings, setRecordings] = useState<SavedRecording[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [token, setToken] = useState<string>('');
    const [exportFolderSet, setExportFolderSet] = useState(false);
    const [exportFolderName, setExportFolderName] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [uploadAllInProgress, setUploadAllInProgress] = useState(false);
    const [uploadAllProgress, setUploadAllProgress] = useState({ done: 0, total: 0 });
    const [showOnboarding, setShowOnboarding] = useState(false);

    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pulse = useRef(new Animated.Value(1)).current;

    function showToast(message: string, type: 'success' | 'error') {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }

    const handleInterrupted = useCallback((result: RecordingResult) => {
        if (result.durationMs < 5000) {
            showToast('Recording too short to save', 'error');
            recorder.reset();
        } else {
            const autoTitle = `Interrupted - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            saveRecording(result.uri, autoTitle, result.durationMs, moduleId, moduleName)
                .then((saved) => {
                    setRecordings((prev) => [saved, ...prev]);
                    showToast('Partial recording saved', 'success');
                    recorder.reset();
                })
                .catch(() => {
                    showToast('Failed to save interrupted recording', 'error');
                    recorder.reset();
                });
        }
    }, [moduleId, moduleName]);

    const recorder = useRecorder(handleInterrupted);

    const handleToggleTheme = useCallback(() => { toggleTheme(); }, [toggleTheme]);

    useEffect(() => {
        AsyncStorage.getItem(ONBOARDING_KEY).then((val) => { if (!val) setShowOnboarding(true); });
    }, []);

    const handleOnboardingComplete = () => {
        AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setShowOnboarding(false);
    };

    // Pulse animation
    useEffect(() => {
        if (recorder.state === 'recording') {
            const anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            );
            anim.start();
        } else {
            pulse.setValue(1);
        }
    }, [recorder.state, pulse]);

    useEffect(() => { user.getIdToken().then(setToken); }, [user]);
    useEffect(() => { getAllRecordings().then(setRecordings); }, []);

    useEffect(() => {
        if (Platform.OS === 'android') {
            getExportFolderUri().then(async (uri) => {
                if (uri) {
                    setExportFolderSet(true);
                    const name = await getExportFolderName();
                    setExportFolderName(name || 'Folder');
                } else {
                    setTimeout(() => {
                        Alert.alert(
                            'Save Recordings to Phone',
                            'Save recordings to a "Lecture Recordings" folder on your phone?',
                            [
                                { text: 'Not Now', style: 'cancel' },
                                {
                                    text: 'Set Up Folder',
                                    onPress: async () => {
                                        const newUri = await requestExportFolder();
                                        if (newUri) { 
                                            setExportFolderSet(true);
                                            const name = await getExportFolderName();
                                            setExportFolderName(name || 'Folder');
                                            Alert.alert('Folder Set!', 'Recordings will be saved to your chosen folder.'); 
                                        }
                                    },
                                },
                            ]
                        );
                    }, 1500);
                }
            });
        }
    }, []);

    useEffect(() => {
        const unsub = NetInfo.addEventListener((state) => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(online);
            if (online) {
                processPendingUploads(user).then(() => getAllRecordings().then(setRecordings)).catch(() => { });
            }
        });
        return () => unsub();
    }, [user]);

    const handleStart = async () => {
        if (!title.trim()) { Alert.alert('Title Required', 'Please enter a lecture title.'); return; }
        if (!moduleId) {
            Alert.alert('Module Required', 'Please select a module before recording.', [
                { text: 'OK', style: 'cancel' },
            ]);
            return;
        }
        await recorder.start();
        Vibration.vibrate(30);
    };

    const handleStop = async () => {
        Alert.alert('Stop Recording', 'This will save and end the recording.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Save & Stop', onPress: async () => {
                    Vibration.vibrate([30, 50, 30]);
                    try {
                        const result = await recorder.stop();
                        if (!result) { Alert.alert('Recording Error', 'No audio captured.'); recorder.reset(); return; }
                        const saved = await saveRecording(result.uri, title, result.durationMs, moduleId, moduleName);
                        setRecordings((prev) => [saved, ...prev]);
                        setTitle(''); setModuleId(null); setModuleName(null); recorder.reset();
                        if (isOnline) {
                            setUploading(saved.id);
                            try { await uploadRecording(saved.id, saved.filePath, saved.title, saved.moduleId, user); setRecordings(await getAllRecordings()); showToast('Recording uploaded successfully', 'success'); }
                            catch { showToast('Recording saved — upload queued for later', 'error'); }
                            finally { setUploading(null); }
                        } else { showToast('Recording saved offline', 'success'); }
                    } catch (e) { const msg = e instanceof Error ? e.message : 'Unknown error'; Alert.alert('Save Failed', msg); recorder.reset(); }
                }, style: 'destructive',
            },
        ]);
    };

    const handlePauseResume = async () => {
        Vibration.vibrate(15);
        if (recorder.state === 'recording') await recorder.pause();
        else if (recorder.state === 'paused') await recorder.resume();
    };

    const handleManualUpload = async (rec: SavedRecording) => {
        if (!isOnline) { Alert.alert('No Internet', 'Connect to the internet to upload.'); return; }
        setUploading(rec.id);
        try { await uploadRecording(rec.id, rec.filePath, rec.title, rec.moduleId, user); setRecordings(await getAllRecordings()); showToast('Recording uploaded successfully', 'success'); }
        catch (e) { Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Unknown error'); showToast('Upload failed. Tap to retry.', 'error'); }
        finally { setUploading(null); }
    };

    const handleUploadAll = async () => {
        const pending = recordings.filter((r) => !r.uploaded);
        if (pending.length === 0) return;
        setUploadAllInProgress(true); setUploadAllProgress({ done: 0, total: pending.length });
        for (let i = 0; i < pending.length; i++) { try { await uploadRecording(pending[i].id, pending[i].filePath, pending[i].title, pending[i].moduleId, user); setUploadAllProgress({ done: i + 1, total: pending.length }); } catch { } }
        const updated = await getAllRecordings(); setRecordings(updated); setUploadAllInProgress(false); setUploadAllProgress({ done: 0, total: 0 });
        showToast(`Uploaded ${updated.filter((r) => r.uploaded).length} recording(s)`, 'success');
    };

    const handleDelete = (rec: SavedRecording) => {
        Alert.alert('Delete Recording', `Delete "${rec.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRecording(rec.id); setRecordings((prev) => prev.filter((r) => r.id !== rec.id)); } },
        ]);
    };

    const handleModuleSelect = useCallback((id: string | null, name: string | null) => { setModuleId(id); setModuleName(name); }, []);

    const isRecording = recorder.state === 'recording';
    const isPaused = recorder.state === 'paused';
    const isActive = isRecording || isPaused;

    const filteredRecordings = recordings.filter((rec) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return rec.title.toLowerCase().includes(q) || (rec.moduleName && rec.moduleName.toLowerCase().includes(q));
    });

    const pendingUploads = recordings.filter((r) => !r.uploaded).length;
    const s = styles(colors, insets.top);

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={[s.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
                <View>
                    <Text style={s.appName}>AURA <Text style={s.appNameAccent}>Recorder</Text></Text>
                    <Text style={s.userName}>
                        {displayName || user.email}
                        {!isOnline && <Text style={s.offlineText}> {"\u2022"} Offline</Text>}
                    </Text>
                </View>
                <View style={s.headerActions}>
                    <TouchableOpacity style={s.iconBtn} onPress={handleToggleTheme}
                        accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'} accessibilityRole="button">
                        <Text style={s.iconBtnText}>{isDark ? '\u2600' : '\u263E'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onLogout} style={s.logoutBtn}
                        accessibilityLabel="Log out" accessibilityRole="button">
                        <Text style={s.logoutText}>{'\u21A9'} Log out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
                {/* Record Card */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>New Recording</Text>
                    <Text style={s.label}>LECTURE TITLE <Text style={s.labelRequired}>*</Text></Text>
                    <TextInput style={[s.input, isActive && s.inputDisabled]} value={title} onChangeText={setTitle}
                        placeholder="e.g. Introduction to Neural Networks" placeholderTextColor={colors.textMuted} editable={!isActive} />
                    {token ? (
                        <>
                            <ModuleSelector token={token} onSelect={handleModuleSelect} disabled={isActive} />
                        </>
                    ) : null}

                    <View style={s.controls}>
                        <Text style={s.timer}>
                            {isActive && <Text style={s.recordDot}>{'\u25CF '} </Text>}
                            {formatDuration(recorder.durationMs)}
                        </Text>

                        {!isActive ? (
                            <Animated.View style={{ transform: [{ scale: pulse }] }}>
                                <TouchableOpacity style={s.recordBtn} onPress={handleStart} activeOpacity={0.8}
                                    accessibilityLabel="Start recording" accessibilityRole="button">
                                    <Text style={s.recordBtnIcon}>{'\u25CF'}</Text>
                                    <Text style={s.recordBtnText}>Record</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <Animated.View style={[s.recordBtnActive, { transform: [{ scale: pulse }] }]}>
                                <Text style={s.recordingLabel}>Recording...</Text>
                            </Animated.View>
                        )}

                        {isActive && (
                            <View style={s.actionRow}>
                                <TouchableOpacity style={s.secondaryBtn} onPress={handlePauseResume}
                                    accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'} accessibilityRole="button">
                                    <Text style={s.secondaryBtnText}>{isPaused ? '\u25B6 Resume' : '\u23F8 Pause'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.stopBtn} onPress={handleStop}
                                    accessibilityLabel="Stop recording" accessibilityRole="button">
                                    <Text style={s.stopBtnText}>{'\u23F9'} Stop & Save</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {recorder.error && <Text style={s.errorText}>{recorder.error}</Text>}
                    </View>
                </View>

                {/* Saved Recordings */}
                <View style={s.card}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Saved Recordings</Text>
                        <TouchableOpacity style={s.searchToggle} onPress={() => setShowSearch((v) => !v)}
                            accessibilityLabel="Search recordings" accessibilityRole="button">
                            <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {showSearch && (
                        <TextInput style={s.searchInput} value={searchQuery} onChangeText={setSearchQuery}
                            placeholder="Search by title or module..." placeholderTextColor={colors.textMuted} clearButtonMode="while-editing" />
                    )}

                    {Platform.OS === 'android' && (
                        <View style={s.folderRow}>
                            <View style={s.folderInfo}>
                                <Ionicons name="folder-outline" size={16} color={colors.primary} />
                                <Text style={s.folderInfoText} numberOfLines={1}>
                                    {exportFolderSet ? `Saving to: ${exportFolderName || 'Folder'}` : 'Save folder not set'}
                                </Text>
                            </View>
                            <TouchableOpacity style={s.folderChangeBtn} onPress={async () => {
                                const uri = await requestExportFolder();
                                if (uri) { 
                                    setExportFolderSet(true);
                                    const name = await getExportFolderName();
                                    setExportFolderName(name || 'Folder');
                                    Alert.alert('Folder Updated!', 'Recordings will now be saved to the new folder.'); 
                                }
                            }} accessibilityLabel="Change export folder" accessibilityRole="button">
                                <Text style={s.folderChangeBtnText}>{exportFolderSet ? 'Change' : 'Set up'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {pendingUploads > 1 && !uploadAllInProgress && (
                        <TouchableOpacity style={s.uploadAllBtn} onPress={handleUploadAll}
                            accessibilityLabel={`Upload ${pendingUploads} pending recordings`} accessibilityRole="button">
                            <Text style={s.uploadAllBtnText}>Upload All ({pendingUploads})</Text>
                        </TouchableOpacity>
                    )}
                    {uploadAllInProgress && (
                        <Text style={s.uploadAllProgressText}>Uploading {uploadAllProgress.done} of {uploadAllProgress.total}...</Text>
                    )}

                    {filteredRecordings.length === 0 ? (
                        <View style={s.emptyState}>
                            <Text style={s.emptyStateIcon}>{'\uD83C\uDFB5'}</Text>
                            <Text style={s.emptyStateTitle}>{recordings.length === 0 ? 'No recordings saved' : 'No matches'}</Text>
                            <Text style={s.emptyStateSubtitle}>{recordings.length === 0 ? 'Your recordings will appear here once you stop and save.' : 'Try a different search term.'}</Text>
                        </View>
                    ) : (
                        filteredRecordings.map((rec) => (
                            <RecordingCard key={rec.id} recording={rec} uploading={uploading === rec.id}
                                onUpload={() => handleManualUpload(rec)} onDelete={() => handleDelete(rec)} />
                        ))
                    )}
                </View>
            </ScrollView>

            {toast && (
                <View style={[s.toast, toast.type === 'success' ? s.toastSuccess : s.toastError]}>
                    <Text style={s.toastText}>{toast.message}</Text>
                </View>
            )}

            <OnboardingOverlay visible={showOnboarding} onComplete={handleOnboardingComplete} />
        </View>
    );
}

const styles = (colors: ReturnType<typeof useAppTheme>['colors'], _insetTop?: number) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSecondary,
    },
    appName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    appNameAccent: { color: colors.primary },
    userName: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    offlineText: { color: colors.warning },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(128,128,128,0.15)', justifyContent: 'center', alignItems: 'center' },
    iconBtnText: { fontSize: 18, color: colors.textPrimary },
    logoutBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, borderColor: colors.error, minHeight: 36, justifyContent: 'center' },
    logoutText: { color: colors.error, fontSize: 13, fontWeight: '600' },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, padding: Spacing.md },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: 0.5, marginBottom: Spacing.sm },
    label: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 6, letterSpacing: 1.2, textTransform: 'uppercase' },
    labelRequired: { color: colors.error, fontSize: 11, fontWeight: '700' },
    input: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 14,
        color: colors.textPrimary,
        fontSize: 15,
    },
    inputDisabled: { opacity: 0.4 },
    searchInput: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.primary, borderRadius: Radius.sm, padding: Spacing.sm, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.sm },
    searchToggle: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center' },
    controls: { alignItems: 'center', paddingTop: Spacing.lg },
    timer: { fontSize: 48, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: colors.textPrimary, fontWeight: '200', marginBottom: Spacing.lg },
    recordDot: { color: colors.error },
    recordBtn: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 12 },
    recordBtnIcon: { fontSize: 32, color: colors.bgPrimary, fontWeight: '300' },
    recordBtnText: { color: colors.bgPrimary, fontWeight: '700', fontSize: 12, marginTop: 4 },
    recordBtnActive: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', shadowColor: colors.error, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 12 },
    recordingLabel: { color: '#fff', fontWeight: '700', fontSize: 12 },
    actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, width: '100%' },
    secondaryBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.bgTertiary, minHeight: 44, justifyContent: 'center' },
    secondaryBtnText: { color: colors.textPrimary, fontWeight: '600' },
    stopBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: colors.primary, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    stopBtnText: { color: colors.bgPrimary, fontWeight: '700' },
    errorText: { color: colors.error, fontSize: 13, marginTop: Spacing.sm },
    folderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm, backgroundColor: colors.primary + '14', borderRadius: Radius.sm },
    folderInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: Spacing.sm },
    folderInfoText: { color: colors.textSecondary, fontSize: 12 },
    folderChangeBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: colors.primary },
    folderChangeBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    uploadAllBtn: { backgroundColor: colors.primary, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm, minHeight: 40, justifyContent: 'center' },
    uploadAllBtnText: { color: colors.bgPrimary, fontWeight: '700', fontSize: 14 },
    uploadAllProgressText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: Spacing.sm },
    emptyState: { alignItems: 'center', padding: Spacing.xl },
    emptyStateIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyStateTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xs },
    emptyStateSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    toast: { position: 'absolute', bottom: 24, left: Spacing.md, right: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
    toastSuccess: { backgroundColor: 'rgba(34,197,94,0.9)' },
    toastError: { backgroundColor: 'rgba(239,68,68,0.9)' },
    toastText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
