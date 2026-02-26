import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';
const CACHE_KEY = 'aura_hierarchy_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Department { id: string; name: string; }
export interface Semester { id: string; name: string; }
export interface Subject { id: string; name: string; }
export interface Module { id: string; name: string; }

export interface HierarchyCache {
    departments: Department[];
    semesters: Record<string, Semester[]>;   // key: departmentId
    subjects: Record<string, Subject[]>;     // key: semesterId
    modules: Record<string, Module[]>;       // key: subjectId
    cachedAt: number;
}

async function getCache(): Promise<HierarchyCache | null> {
    try {
        const json = await AsyncStorage.getItem(CACHE_KEY);
        if (!json) return null;
        const cache: HierarchyCache = JSON.parse(json);
        if (Date.now() - cache.cachedAt > CACHE_TTL_MS) return null; // expired
        return cache;
    } catch {
        return null;
    }
}

async function setCache(cache: HierarchyCache) {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function getDepartments(token: string): Promise<Department[]> {
    const cache = await getCache();
    if (cache && cache.departments.length > 0) return cache.departments;

    const res = await fetch(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch departments');
    const data = await res.json();
    const departments: Department[] = data.departments || [];

    await setCache({
        departments,
        semesters: {},
        subjects: {},
        modules: {},
        cachedAt: Date.now(),
    });
    return departments;
}

export async function getSemesters(departmentId: string, token: string): Promise<Semester[]> {
    const cache = await getCache();
    if (cache?.semesters[departmentId] && cache.semesters[departmentId].length > 0) return cache.semesters[departmentId];

    const res = await fetch(`${API_URL}/departments/${departmentId}/semesters`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch semesters');
    const data = await res.json();
    const semesters: Semester[] = data.semesters || [];

    const current = (await getCache()) ?? { departments: [], semesters: {}, subjects: {}, modules: {}, cachedAt: Date.now() };
    current.semesters[departmentId] = semesters;
    await setCache(current);
    return semesters;
}

export async function getSubjects(semesterId: string, token: string): Promise<Subject[]> {
    const cache = await getCache();
    if (cache?.subjects[semesterId] && cache.subjects[semesterId].length > 0) return cache.subjects[semesterId];

    const res = await fetch(`${API_URL}/semesters/${semesterId}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    const data = await res.json();
    const subjects: Subject[] = data.subjects || [];

    const current = (await getCache()) ?? { departments: [], semesters: {}, subjects: {}, modules: {}, cachedAt: Date.now() };
    current.subjects[semesterId] = subjects;
    await setCache(current);
    return subjects;
}

export async function getModules(subjectId: string, token: string): Promise<Module[]> {
    const cache = await getCache();
    if (cache?.modules[subjectId] && cache.modules[subjectId].length > 0) return cache.modules[subjectId];

    const res = await fetch(`${API_URL}/subjects/${subjectId}/modules`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch modules');
    const data = await res.json();
    const modules: Module[] = data.modules || [];

    const current = (await getCache()) ?? { departments: [], semesters: {}, subjects: {}, modules: {}, cachedAt: Date.now() };
    current.modules[subjectId] = modules;
    await setCache(current);
    return modules;
}

export async function clearHierarchyCache() {
    await AsyncStorage.removeItem(CACHE_KEY);
}
