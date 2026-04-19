import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform,
    ScrollView, Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getDepartments, getSemesters, getSubjects, getModules,
    type Department, type Semester, type Subject, type Module,
} from '../services/hierarchyCache';
import { useAppTheme } from '../hooks/useTheme';
import { Spacing, Radius } from '../theme';

interface ModuleSelectorProps {
    token: string;
    onSelect: (moduleId: string | null, moduleName: string | null) => void;
    disabled?: boolean;
}

interface RecentModule {
    id: string;
    name: string;
}

const RECENT_KEY = 'aura_recent_modules';

async function getRecentModules(): Promise<RecentModule[]> {
    try {
        const json = await AsyncStorage.getItem(RECENT_KEY);
        return json ? JSON.parse(json) : [];
    } catch {
        return [];
    }
}

async function saveRecentModule(module: RecentModule) {
    try {
        const recent = await getRecentModules();
        // Dedupe and put at front
        const filtered = recent.filter((m) => m.id !== module.id);
        const updated = [module, ...filtered].slice(0, 5);
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch { }
}

async function clearRecentModules() {
    try {
        await AsyncStorage.removeItem(RECENT_KEY);
    } catch { }
}

export default function ModuleSelector({ token, onSelect, disabled }: ModuleSelectorProps) {
    const { colors } = useAppTheme();
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
    const [recent, setRecent] = useState<RecentModule[]>([]);

    useEffect(() => {
        getRecentModules().then(setRecent);
    }, []);

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
            if (mod) {
                saveRecentModule({ id: mod.id, name: mod.name });
                getRecentModules().then(setRecent);
            }
        } else {
            onSelect(null, null);
        }
    }, [modId, modules, onSelect]);

    const handleRecentSelect = (recent: RecentModule) => {
        setModId(recent.id);
        onSelect(recent.id, recent.name);
    };

    const handleClearRecent = () => {
        clearRecentModules();
        setRecent([]);
    };

    if (loading) {
        return (
            <View style={centerStyle(colors).center}>
                <ActivityIndicator color={colors.primary} />
                <Text style={centerStyle(colors).loadingText}>Loading modules...</Text>
            </View>
        );
    }

    const s = createModuleStyles(colors);

    return (
        <View style={s.container}>
            {recent.length > 0 && (
                <View style={s.recentSection}>
                    <View style={s.recentHeader}>
                        <Text style={s.recentLabel}>Recent Modules</Text>
                        <TouchableOpacity onPress={handleClearRecent} accessibilityLabel="Clear recent modules" accessibilityRole="button">
                            <Text style={s.recentClear}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipList}>
                        {recent.map((r) => (
                            <TouchableOpacity
                                key={r.id}
                                style={[s.chip, modId === r.id && s.chipActive]}
                                onPress={() => handleRecentSelect(r)}
                                accessibilityLabel={`Select module ${r.name}`}
                                accessibilityRole="button"
                            >
                                <Text style={[s.chipText, modId === r.id && s.chipTextActive]}>
                                    {r.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {offline && (
                <View style={s.offlineBanner}>
                    <Text style={s.offlineText}>{'\uD83D\uDCE1'} Offline — using cached data</Text>
                </View>
            )}
            {error && !offline && (
                <Text style={s.errorText}>{error}</Text>
            )}

            <DropdownRow
                label="Department" value={deptId} items={departments}
                onSelect={setDeptId} disabled={disabled} placeholder="Select department..."
                colors={colors}
            />
            <DropdownRow
                label="Semester" value={semId} items={semesters}
                onSelect={setSemId} disabled={disabled || !deptId} placeholder="Select semester..."
                colors={colors}
            />
            <DropdownRow
                label="Subject" value={subId} items={subjects}
                onSelect={setSubId} disabled={disabled || !semId} placeholder="Select subject..."
                colors={colors}
            />
            <DropdownRow
                label="Module" value={modId} items={modules}
                onSelect={setModId} disabled={disabled || !subId} placeholder="Select module..."
                colors={colors}
            />
        </View>
    );
}

function DropdownRow({
    label, value, items, onSelect, disabled, placeholder, colors,
}: {
    label: string;
    value: string;
    items: { id: string; name: string }[];
    onSelect: (id: string) => void;
    disabled?: boolean;
    placeholder: string;
    colors: ReturnType<typeof useAppTheme>['colors'];
}) {
    const safeItems = Array.isArray(items) ? items : [];
    return (
        <View style={dropdownStyle(colors).row}>
            <Text style={dropdownStyle(colors).label}>{label}</Text>
            <View style={[dropdownStyle(colors).pickerWrapper, disabled && dropdownStyle(colors).pickerDisabled]}>
                <Picker
                    selectedValue={value}
                    onValueChange={(v) => onSelect(v as string)}
                    enabled={!disabled && safeItems.length > 0}
                    style={dropdownStyle(colors).picker}
                >
                    <Picker.Item label={placeholder} value="" color={Platform.OS === 'android' ? '#999999' : colors.textMuted} />
                    {safeItems.map((item) => (
                        <Picker.Item key={item.id} label={item.name} value={item.id} color={Platform.OS === 'android' ? '#111111' : colors.textPrimary} />
                    ))}
                </Picker>
            </View>
        </View>
    );
}

const centerStyle = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
    center: { alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
    loadingText: { color: colors.textSecondary, fontSize: 13 },
});

const createModuleStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
    container: { gap: 8 },
    offlineBanner: { backgroundColor: (colors.warning + '25'), borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
    offlineText: { color: colors.warning, fontSize: 13, textAlign: 'center' },
    errorText: { color: colors.error, fontSize: 13 },
    recentSection: { marginBottom: Spacing.sm },
    recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    recentLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    recentClear: { fontSize: 12, color: colors.error, fontWeight: '500' },
    chipList: { flexGrow: 0 },
    chip: { paddingHorizontal: Spacing.sm, paddingVertical: 12, borderRadius: Radius.full, backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, marginRight: Spacing.sm, minHeight: 44, justifyContent: 'center' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
    chipTextActive: { color: colors.bgPrimary, fontWeight: '700' },
});

const dropdownStyle = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
    row: { marginBottom: 8 },
    label: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 6, letterSpacing: 1.2, textTransform: 'uppercase' },
    pickerWrapper: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.sm, overflow: 'hidden' },
    pickerDisabled: { opacity: 0.5 },
    picker: { color: colors.textPrimary, height: 50 },
});
