import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Platform,
    PanResponder, LayoutChangeEvent,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { SavedRecording } from '../services/recordingStorage';
import { useAppTheme } from '../hooks/useTheme';
import { Spacing, Radius } from '../theme';

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
    const { colors } = useAppTheme();
    const player = useAudioPlayer(recording.filePath);
    const status = useAudioPlayerStatus(player);

    const isPlaying = status.playing;
    const currentTimeSec = status.currentTime || 0;
    const durationSec = status.duration || (recording.durationMs / 1000);
    const progress = durationSec > 0 ? Math.min(currentTimeSec / durationSec, 1) : 0;
    const hasFinished = !isPlaying && currentTimeSec > 0 && Math.abs(currentTimeSec - durationSec) < 0.5;

    const [hasPlayed, setHasPlayed] = useState(false);
    const barWidthRef = useRef(0);
    const barXRef = useRef(0);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) { player.pause(); }
        else {
            if (hasFinished) player.seekTo(0);
            setHasPlayed(true);
            player.play();
        }
    }, [isPlaying, player, hasFinished]);

    const handleBarLayout = useCallback((e: LayoutChangeEvent) => { barWidthRef.current = e.nativeEvent.layout.width; barXRef.current = e.nativeEvent.layout.x; }, []);

    const handleSeek = useCallback((locationX: number) => {
        if (barWidthRef.current <= 0 || durationSec <= 0) return;
        const fraction = Math.max(0, Math.min(locationX / barWidthRef.current, 1));
        player.seekTo(fraction * durationSec);
    }, [player, durationSec]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => { handleSeek(evt.nativeEvent.locationX); },
            onPanResponderMove: (evt) => { handleSeek(evt.nativeEvent.locationX); },
        })
    ).current;

    const s = createStyles(colors);

    return (
        <View style={s.card} accessible accessibilityLabel={`Recording: ${recording.title}`}>
            <View style={s.topRow}>
                {/* Play/Pause button */}
                <TouchableOpacity style={s.playBtn} onPress={handlePlayPause} hitSlop={4}
                    accessibilityLabel={isPlaying ? 'Pause recording' : hasFinished ? 'Replay recording' : 'Play recording'}
                    accessibilityRole="button">
                    <Text style={s.playBtnText}>{isPlaying ? '\u23F8' : hasFinished ? '\u21BB' : '\u25B6'}</Text>
                </TouchableOpacity>

                {/* Info */}
                <View style={s.info}>
                    <Text style={s.title} numberOfLines={1}>{recording.title}</Text>
                    {recording.moduleName && (
                        <Text style={s.module} numberOfLines={1}>{'\uD83D\uDCC1'} {recording.moduleName}</Text>
                    )}
                    <Text style={s.meta}>{formatDuration(recording.durationMs)} {"\u00B7"} {formatDate(recording.createdAt)}</Text>
                    {recording.uploadError && (
                        <Text style={s.uploadError}>{'\u26A0'} {recording.uploadError}</Text>
                    )}
                </View>

                {/* Actions */}
                <View style={s.actions}>
                    {recording.uploaded ? (
                        <View style={s.uploadedBadge} accessible accessibilityLabel="Uploaded">
                            <Text style={s.uploadedText}>{'\u2713'} Uploaded</Text>
                        </View>
                    ) : uploading ? (
                        <Text style={s.uploadingText} accessibilityLiveRegion="polite">Uploading...</Text>
                    ) : (
                        <TouchableOpacity style={s.uploadBtn} onPress={onUpload} hitSlop={8}
                            accessibilityLabel={`Upload ${recording.title}`} accessibilityRole="button">
                            <Text style={s.uploadBtnText}>{'\u2B06'} Upload</Text>
                        </TouchableOpacity>
                    )}
                    {/* Delete button — prominent red square with X */}
                    <TouchableOpacity style={s.deleteBtn} onPress={onDelete} hitSlop={8}
                        accessibilityLabel={`Delete ${recording.title}`} accessibilityRole="button">
                        <Text style={s.deleteBtnText}>{'\u2715'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Seekable playback progress bar */}
            {hasPlayed && (
                <View style={s.progressRow}>
                    <Text style={s.progressTime}>{formatDuration(currentTimeSec * 1000)}</Text>
                    <View style={s.progressBarTouchArea} onLayout={handleBarLayout} {...panResponder.panHandlers}>
                        <View style={s.progressBarBg}>
                            <View style={[s.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <View style={[s.seekThumb, { left: `${progress * 100}%` }]} />
                    </View>
                    <Text style={s.progressTime}>{formatDuration(durationSec * 1000)}</Text>
                </View>
            )}
        </View>
    );
}

const createStyles = (c: { primary: string; bgPrimary: string; bgSecondary: string; bgTertiary: string; textPrimary: string; textSecondary: string; textMuted: string; border: string; error: string; success: string; warning: string }) => StyleSheet.create({
    card: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: c.border },
    topRow: { flexDirection: 'row', alignItems: 'flex-start' },
    playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
    playBtnText: { fontSize: 16, color: c.bgPrimary, fontWeight: '700' },
    info: { flex: 1, marginRight: Spacing.sm },
    title: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
    module: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    meta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    uploadError: { fontSize: 12, color: c.warning, marginTop: 2 },
    actions: { alignItems: 'flex-end', gap: Spacing.sm },
    uploadedBadge: { backgroundColor: (c.success + '25'), borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
    uploadedText: { color: c.success, fontSize: 11, fontWeight: '600' },
    uploadingText: { color: c.textMuted, fontSize: 12 },
    uploadBtn: { backgroundColor: c.primary, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
    uploadBtnText: { color: c.bgPrimary, fontSize: 11, fontWeight: '700' },
    // Prominent delete button
    deleteBtn: {
        width: 36, height: 36, borderRadius: Radius.sm,
        backgroundColor: c.error,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: c.error, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },
    deleteBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    // Progress bar
    progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, paddingLeft: 48 },
    progressTime: { fontSize: 10, color: c.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', width: 42, textAlign: 'center' },
    progressBarTouchArea: { flex: 1, height: 24, justifyContent: 'center', marginHorizontal: 4, position: 'relative' },
    progressBarBg: { height: 4, backgroundColor: c.border, borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: c.primary, borderRadius: 2 },
    seekThumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: c.primary, top: 5, marginLeft: -7, shadowColor: c.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
});
