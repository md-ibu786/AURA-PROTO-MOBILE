import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, Animated, Easing, Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useRecorder } from '../hooks/useRecorder';
import {
    saveRecording, getAllRecordings, deleteRecording,
    type SavedRecording,
} from '../services/recordingStorage';
import { uploadRecording, processPendingUploads } from '../services/uploadQueue';
import ModuleSelector from '../components/ModuleSelector';
import RecordingCard from '../components/RecordingCard';
import { Colors, Spacing, Radius } from '../theme';
import firebase from '../config/firebase';

interface RecorderScreenProps {
    user: firebase.User;
    displayName: string;
    onLogout: () => void;
}

function formatDuration(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RecorderScreen({ user, displayName, onLogout }: RecorderScreenProps) {
    const recorder = useRecorder();
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState<string | null>(null);
    const [moduleName, setModuleName] = useState<string | null>(null);
    const [recordings, setRecordings] = useState<SavedRecording[]>([]);
    const [uploading, setUploading] = useState<string | null>(null); // recording id being uploaded
    const [isOnline, setIsOnline] = useState(true);
    const [token, setToken] = useState<string>('');

    // Pulsing animation for record button
    const pulse = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        user.getIdToken().then(setToken);
    }, [user]);

    // Load saved recordings on mount
    useEffect(() => {
        getAllRecordings().then(setRecordings);
    }, []);

    // Network monitoring
    useEffect(() => {
        const unsub = NetInfo.addEventListener((state) => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(online);
            if (online) {
                processPendingUploads(user)
                    .then(() => getAllRecordings().then(setRecordings))
                    .catch(() => { });
            }
        });
        return () => unsub();
    }, [user]);

    // Pulse animation while recording
    useEffect(() => {
        if (recorder.state === 'recording') {
            const anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            );
            pulseAnim.current = anim;
            anim.start();
        } else {
            pulseAnim.current?.stop();
            pulse.setValue(1);
        }
    }, [recorder.state, pulse]);

    const handleStart = async () => {
        if (!title.trim()) {
            Alert.alert('Title Required', 'Please enter a lecture title before recording.');
            return;
        }
        await recorder.start();
    };

    const handleStop = async () => {
        try {
            const result = await recorder.stop();
            if (!result) {
                Alert.alert('Recording Error', 'No audio was captured. The recording may have been too short.');
                recorder.reset();
                return;
            }

            const saved = await saveRecording(
                result.uri, title, result.durationMs, moduleId, moduleName
            );
            setRecordings((prev) => [saved, ...prev]);
            setTitle('');
            setModuleId(null);
            setModuleName(null);
            recorder.reset();

            // Try immediate upload if online
            if (isOnline) {
                setUploading(saved.id);
                try {
                    await uploadRecording(saved.id, saved.filePath, saved.title, saved.moduleId, user);
                    const updated = await getAllRecordings();
                    setRecordings(updated);
                } catch {
                    // Will retry next time online
                } finally {
                    setUploading(null);
                }
            } else {
                Alert.alert('Saved Offline', 'Recording saved locally. It will upload when you have internet.');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error saving recording';
            Alert.alert('Save Failed', msg);
            recorder.reset();
        }
    };

    const handleManualUpload = async (rec: SavedRecording) => {
        if (!isOnline) {
            Alert.alert('No Internet', 'Please connect to the internet to upload.');
            return;
        }
        setUploading(rec.id);
        try {
            await uploadRecording(rec.id, rec.filePath, rec.title, rec.moduleId, user);
            const updated = await getAllRecordings();
            setRecordings(updated);
        } catch (e) {
            Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setUploading(null);
        }
    };

    const handleDelete = (rec: SavedRecording) => {
        Alert.alert(
            'Delete Recording',
            `Delete "${rec.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        await deleteRecording(rec.id);
                        setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
                    },
                },
            ]
        );
    };

    const handleModuleSelect = useCallback((id: string | null, name: string | null) => {
        setModuleId(id);
        setModuleName(name);
    }, []);

    const isRecording = recorder.state === 'recording';
    const isPaused = recorder.state === 'paused';
    const isActive = isRecording || isPaused;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.appName}>AURA <Text style={styles.appNameAccent}>Recorder</Text></Text>
                    <Text style={styles.userName}>{displayName || user.email}</Text>
                </View>
                <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Sign out</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Record Card */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>New Recording</Text>

                    {/* Title input */}
                    <Text style={styles.label}>Lecture Title *</Text>
                    <TextInput
                        style={[styles.input, isActive && styles.inputDisabled]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Introduction to Neural Networks"
                        placeholderTextColor={Colors.textMuted}
                        editable={!isActive}
                    />

                    {/* Module selector */}
                    {token ? (
                        <>
                            <Text style={[styles.label, { marginTop: Spacing.md }]}>Module (optional)</Text>
                            <ModuleSelector token={token} onSelect={handleModuleSelect} disabled={isActive} />
                        </>
                    ) : null}

                    {/* Recording controls */}
                    <View style={styles.controls}>
                        {/* Timer */}
                        <Text style={styles.timer}>
                            {isActive && <Text style={styles.recordDot}>● </Text>}
                            {formatDuration(recorder.durationMs)}
                        </Text>

                        {/* Big record button */}
                        {!isActive ? (
                            <Animated.View style={{ transform: [{ scale: pulse }] }}>
                                <TouchableOpacity style={styles.recordBtn} onPress={handleStart} activeOpacity={0.8}>
                                    <Text style={styles.recordBtnIcon}>🎙️</Text>
                                    <Text style={styles.recordBtnText}>Record</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <Animated.View style={[styles.recordBtnActive, { transform: [{ scale: pulse }] }]}>
                                <View style={styles.recordBtnActive}>
                                    <Text style={styles.recordingLabel}>Recording...</Text>
                                </View>
                            </Animated.View>
                        )}

                        {/* Pause / Stop */}
                        {isActive && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={isPaused ? recorder.resume : recorder.pause}
                                >
                                    <Text style={styles.secondaryBtnText}>
                                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                                    <Text style={styles.stopBtnText}>⏹ Stop & Save</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {recorder.error && (
                            <Text style={styles.errorText}>{recorder.error}</Text>
                        )}
                    </View>
                </View>

                {/* Saved Recordings */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Saved Recordings</Text>
                        {!isOnline && (
                            <View style={styles.offlinePill}>
                                <Text style={styles.offlinePillText}>Offline</Text>
                            </View>
                        )}
                    </View>

                    {recordings.length === 0 ? (
                        <Text style={styles.emptyText}>No recordings yet. Tap Record to start.</Text>
                    ) : (
                        recordings.map((rec) => (
                            <RecordingCard
                                key={rec.id}
                                recording={rec}
                                uploading={uploading === rec.id}
                                onUpload={() => handleManualUpload(rec)}
                                onDelete={() => handleDelete(rec)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgPrimary },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.bgSecondary,
    },
    appName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
    appNameAccent: { color: Colors.primary },
    userName: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    logoutBtn: { padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
    logoutText: { color: Colors.textSecondary, fontSize: 13 },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
    card: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
    label: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
    input: {
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: 15,
    },
    inputDisabled: { opacity: 0.5 },
    controls: { alignItems: 'center', paddingTop: Spacing.lg },
    timer: {
        fontSize: 48,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: Colors.textPrimary,
        fontWeight: '200',
        marginBottom: Spacing.lg,
    },
    recordDot: { color: Colors.error },
    recordBtn: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
        elevation: 12,
    },
    recordBtnIcon: { fontSize: 32 },
    recordBtnText: { color: Colors.bgPrimary, fontWeight: '700', fontSize: 12, marginTop: 4 },
    recordBtnActive: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.error,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.error,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
        elevation: 12,
    },
    recordingLabel: { color: '#fff', fontWeight: '700', fontSize: 12 },
    actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, width: '100%' },
    secondaryBtn: {
        flex: 1, padding: Spacing.md, borderRadius: Radius.sm,
        borderWidth: 1, borderColor: Colors.border,
        alignItems: 'center', backgroundColor: Colors.bgTertiary,
    },
    secondaryBtnText: { color: Colors.textPrimary, fontWeight: '600' },
    stopBtn: {
        flex: 1, padding: Spacing.md, borderRadius: Radius.sm,
        backgroundColor: Colors.primary, alignItems: 'center',
    },
    stopBtnText: { color: Colors.bgPrimary, fontWeight: '700' },
    errorText: { color: Colors.error, fontSize: 13, marginTop: Spacing.sm },
    offlinePill: {
        backgroundColor: 'rgba(245,158,11,0.2)',
        borderRadius: Radius.full,
        paddingHorizontal: 10, paddingVertical: 3,
    },
    offlinePillText: { color: Colors.warning, fontSize: 12, fontWeight: '600' },
    emptyText: { color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
});
