import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
    getDepartments, getSemesters, getSubjects, getModules,
    type Department, type Semester, type Subject, type Module,
} from '../services/hierarchyCache';
import { Colors, Spacing, Radius } from '../theme';

interface ModuleSelectorProps {
    token: string;
    onSelect: (moduleId: string | null, moduleName: string | null) => void;
    disabled?: boolean;
}

export default function ModuleSelector({ token, onSelect, disabled }: ModuleSelectorProps) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [modules, setModules] = useState<Module[]>([]);

    const [deptId, setDeptId] = useState<string>('');
    const [semId, setSemId] = useState<string>('');
    const [subId, setSubId] = useState<string>('');
    const [modId, setModId] = useState<string>('');

    const [loading, setLoading] = useState(true);
    const [offline, setOffline] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const depts = await getDepartments(token);
                setDepartments(depts);
                setOffline(false);
            } catch {
                setOffline(true);
                setError('Offline — showing cached modules');
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    useEffect(() => {
        if (!deptId) return;
        setSemesters([]); setSubjects([]); setModules([]);
        setSemId(''); setSubId(''); setModId('');
        (async () => {
            try {
                const data = await getSemesters(deptId, token);
                setSemesters(data);
            } catch { }
        })();
    }, [deptId, token]);

    useEffect(() => {
        if (!semId) return;
        setSubjects([]); setModules([]);
        setSubId(''); setModId('');
        (async () => {
            try {
                const data = await getSubjects(semId, token);
                setSubjects(data);
            } catch { }
        })();
    }, [semId, token]);

    useEffect(() => {
        if (!subId) return;
        setModules([]); setModId('');
        (async () => {
            try {
                const data = await getModules(subId, token);
                setModules(data);
            } catch { }
        })();
    }, [subId, token]);

    useEffect(() => {
        if (modId) {
            const mod = modules.find((m) => m.id === modId);
            onSelect(modId, mod?.name ?? null);
        } else {
            onSelect(null, null);
        }
    }, [modId, modules, onSelect]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading modules...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {offline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>📡 Offline — using cached data</Text>
                </View>
            )}
            {error && !offline && (
                <Text style={styles.errorText}>{error}</Text>
            )}

            <DropdownRow
                label="Department"
                value={deptId}
                items={departments}
                onSelect={setDeptId}
                disabled={disabled}
                placeholder="Select department..."
            />
            <DropdownRow
                label="Semester"
                value={semId}
                items={semesters}
                onSelect={setSemId}
                disabled={disabled || !deptId}
                placeholder="Select semester..."
            />
            <DropdownRow
                label="Subject"
                value={subId}
                items={subjects}
                onSelect={setSubId}
                disabled={disabled || !semId}
                placeholder="Select subject..."
            />
            <DropdownRow
                label="Module"
                value={modId}
                items={modules}
                onSelect={setModId}
                disabled={disabled || !subId}
                placeholder="Select module..."
            />
        </View>
    );
}

function DropdownRow({
    label, value, items, onSelect, disabled, placeholder,
}: {
    label: string;
    value: string;
    items: { id: string; name: string }[];
    onSelect: (id: string) => void;
    disabled?: boolean;
    placeholder: string;
}) {
    const safeItems = Array.isArray(items) ? items : [];
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.pickerWrapper, disabled && styles.pickerDisabled]}>
                <Picker
                    selectedValue={value}
                    onValueChange={(v) => onSelect(v as string)}
                    enabled={!disabled && safeItems.length > 0}
                    style={styles.picker}
                    dropdownIconColor={Colors.primary}
                >
                    <Picker.Item label={placeholder} value="" color={Platform.OS === 'android' ? '#999999' : Colors.textMuted} />
                    {safeItems.map((item) => (
                        <Picker.Item key={item.id} label={item.name} value={item.id} color={Platform.OS === 'android' ? '#111111' : Colors.textPrimary} />
                    ))}
                </Picker>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 8 },
    center: { alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
    loadingText: { color: Colors.textSecondary, fontSize: 13 },
    offlineBanner: {
        backgroundColor: 'rgba(245,158,11,0.15)',
        borderRadius: Radius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    offlineText: { color: Colors.warning, fontSize: 13, textAlign: 'center' },
    errorText: { color: Colors.error, fontSize: 13 },
    row: { marginBottom: 8 },
    label: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
    pickerWrapper: {
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.sm,
        overflow: 'hidden',
    },
    pickerDisabled: { opacity: 0.5 },
    picker: { color: Colors.textPrimary, height: 50 },
});
