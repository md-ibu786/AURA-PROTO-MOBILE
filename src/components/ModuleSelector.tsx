import { useState, useEffect, useCallback } from 'react';
import {
    fetchDepartments,
    fetchSemesters,
    fetchSubjects,
    fetchModules,
    type Department,
    type Semester,
    type Subject,
    type Module,
} from '../services/api';
import './ModuleSelector.css';

interface ModuleSelectorProps {
    onModuleSelect: (moduleId: string, subjectId: string, departmentId: string) => void;
    disabled?: boolean;
    /** Pre-filter by user's subjectIds if available */
    userSubjectIds?: string[];
}

export default function ModuleSelector({
    onModuleSelect,
    disabled = false,
}: ModuleSelectorProps) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [modules, setModules] = useState<Module[]>([]);

    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSem, setSelectedSem] = useState('');
    const [selectedSubj, setSelectedSubj] = useState('');
    const [selectedMod, setSelectedMod] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch departments on mount
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchDepartments()
            .then((data) => {
                if (!cancelled) setDepartments(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    // Fetch semesters when department changes
    const handleDeptChange = useCallback(async (deptId: string) => {
        setSelectedDept(deptId);
        setSelectedSem('');
        setSelectedSubj('');
        setSelectedMod('');
        setSemesters([]);
        setSubjects([]);
        setModules([]);
        if (!deptId) return;
        try {
            setLoading(true);
            const data = await fetchSemesters(deptId);
            setSemesters(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching semesters');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSemChange = useCallback(async (semId: string) => {
        setSelectedSem(semId);
        setSelectedSubj('');
        setSelectedMod('');
        setSubjects([]);
        setModules([]);
        if (!semId) return;
        try {
            setLoading(true);
            const data = await fetchSubjects(semId, selectedDept);
            setSubjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching subjects');
        } finally {
            setLoading(false);
        }
    }, [selectedDept]);

    const handleSubjChange = useCallback(async (subjId: string) => {
        setSelectedSubj(subjId);
        setSelectedMod('');
        setModules([]);
        if (!subjId) return;
        try {
            setLoading(true);
            const data = await fetchModules(subjId, selectedDept, selectedSem);
            setModules(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching modules');
        } finally {
            setLoading(false);
        }
    }, [selectedDept, selectedSem]);

    const handleModChange = useCallback((modId: string) => {
        setSelectedMod(modId);
        if (modId) {
            onModuleSelect(modId, selectedSubj, selectedDept);
        }
    }, [onModuleSelect, selectedSubj, selectedDept]);

    if (error) {
        return <div className="selector-error">{error}</div>;
    }

    return (
        <div className="module-selector">
            {/* Department */}
            <div className="selector-group">
                <label>Department</label>
                <select
                    value={selectedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    disabled={disabled || loading}
                >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Semester */}
            <div className="selector-group">
                <label>Semester</label>
                <select
                    value={selectedSem}
                    onChange={(e) => handleSemChange(e.target.value)}
                    disabled={disabled || loading || !selectedDept}
                >
                    <option value="">Select Semester</option>
                    {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Subject */}
            <div className="selector-group">
                <label>Subject</label>
                <select
                    value={selectedSubj}
                    onChange={(e) => handleSubjChange(e.target.value)}
                    disabled={disabled || loading || !selectedSem}
                >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Module */}
            <div className="selector-group">
                <label>Module</label>
                <select
                    value={selectedMod}
                    onChange={(e) => handleModChange(e.target.value)}
                    disabled={disabled || loading || !selectedSubj}
                >
                    <option value="">Select Module</option>
                    {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
