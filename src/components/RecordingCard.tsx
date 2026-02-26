import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Platform,
    PanResponder, LayoutChangeEvent,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { SavedRecording } from '../services/recordingStorage';
import { Colors, Spacing, Radius } from '../theme';

function formatDuration(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

interface RecordingCardProps {
    recording: SavedRecording;
    uploading: boolean;
    onUpload: () => void;
    onDelete: () => void;
}

export default function RecordingCard({ recording, uploading, onUpload, onDelete }: RecordingCardProps) {
    const player = useAudioPlayer(recording.filePath);
    const status = useAudioPlayerStatus(player);

    const isPlaying = status.playing;
    const currentTimeSec = status.currentTime || 0;
    const durationSec = status.duration || (recording.durationMs / 1000);
    const progress = durationSec > 0 ? Math.min(currentTimeSec / durationSec, 1) : 0;
    const hasFinished = !isPlaying && currentTimeSec > 0 && Math.abs(currentTimeSec - durationSec) < 0.5;

    // Track whether we've played at least once to show progress bar
    const [hasPlayed, setHasPlayed] = useState(false);

    // Seekable progress bar state
    const barWidthRef = useRef(0);
    const barXRef = useRef(0);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            player.pause();
        } else {
            // If finished, seek to beginning before playing
            if (hasFinished) {
                player.seekTo(0);
            }
            setHasPlayed(true);
            player.play();
        }
    }, [isPlaying, player, hasFinished]);

    const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
        barWidthRef.current = e.nativeEvent.layout.width;
        barXRef.current = e.nativeEvent.layout.x;
    }, []);

    // Seek when user taps on the progress bar
    const handleSeek = useCallback((locationX: number) => {
        if (barWidthRef.current <= 0 || durationSec <= 0) return;
        const fraction = Math.max(0, Math.min(locationX / barWidthRef.current, 1));
        const seekTo = fraction * durationSec;
        player.seekTo(seekTo);
    }, [player, durationSec]);

    // PanResponder for drag-to-seek
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                handleSeek(evt.nativeEvent.locationX);
            },
            onPanResponderMove: (evt) => {
                handleSeek(evt.nativeEvent.locationX);
            },
        })
    ).current;

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                {/* Play/Pause button */}
                <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause}>
                    <Text style={styles.playBtnText}>
                        {isPlaying ? '⏸' : hasFinished ? '↻' : '▶'}
                    </Text>
                </TouchableOpacity>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{recording.title}</Text>
                    {recording.moduleName && (
                        <Text style={styles.module} numberOfLines={1}>📁 {recording.moduleName}</Text>
                    )}
                    <Text style={styles.meta}>
                        {formatDuration(recording.durationMs)} · {formatDate(recording.createdAt)}
                    </Text>
                    {recording.uploadError && (
                        <Text style={styles.uploadError}>⚠ {recording.uploadError}</Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {recording.uploaded ? (
                        <View style={styles.uploadedBadge}>
                            <Text style={styles.uploadedText}>✓ Uploaded</Text>
                        </View>
                    ) : uploading ? (
                        <Text style={styles.uploadingText}>Uploading...</Text>
                    ) : (
                        <TouchableOpacity style={styles.uploadBtn} onPress={onUpload}>
                            <Text style={styles.uploadBtnText}>⬆ Upload</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Seekable playback progress bar */}
            {hasPlayed && (
                <View style={styles.progressRow}>
                    <Text style={styles.progressTime}>
                        {formatDuration(currentTimeSec * 1000)}
                    </Text>
                    <View
                        style={styles.progressBarTouchArea}
                        onLayout={handleBarLayout}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                        {/* Seek thumb */}
                        <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressTime}>
                        {formatDuration(durationSec * 1000)}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    playBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    playBtnText: {
        fontSize: 16,
        color: Colors.bgPrimary,
    },
    info: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
    module: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    uploadError: { fontSize: 12, color: Colors.warning, marginTop: 2 },
    actions: { alignItems: 'flex-end', gap: Spacing.sm },
    uploadedBadge: {
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderRadius: Radius.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    uploadedText: { color: Colors.success, fontSize: 12, fontWeight: '600' },
    uploadingText: { color: Colors.textMuted, fontSize: 12 },
    uploadBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    uploadBtnText: { color: Colors.bgPrimary, fontSize: 12, fontWeight: '700' },
    deleteBtn: { padding: 4 },
    deleteBtnText: { fontSize: 18 },
    // Progress bar
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
        paddingLeft: 48,
    },
    progressTime: {
        fontSize: 10,
        color: Colors.textMuted,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        width: 42,
        textAlign: 'center',
    },
    progressBarTouchArea: {
        flex: 1,
        height: 24,
        justifyContent: 'center',
        marginHorizontal: 4,
        position: 'relative',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    seekThumb: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.primary,
        top: 5,
        marginLeft: -7,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
});
