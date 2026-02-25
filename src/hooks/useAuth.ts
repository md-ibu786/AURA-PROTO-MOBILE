import { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    role: string;
    status: string;
    departmentId: string | null;
    subjectIds: string[];
    departmentNames?: string[];
}

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
        error: null,
    });

    // Sync user profile with backend
    const syncUser = useCallback(async (user: User) => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_URL}/api/auth/sync`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            if (!res.ok) {
                throw new Error('Failed to sync user profile');
            }

            const data = await res.json();
            return data.user as UserProfile;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = await syncUser(user);
                if (profile && (profile.role === 'staff' || profile.role === 'admin')) {
                    setState({ user, profile, loading: false, error: null });
                } else if (profile) {
                    // Not a staff/admin user
                    await signOut(auth);
                    setState({
                        user: null,
                        profile: null,
                        loading: false,
                        error: 'Access denied. Only staff members can use this app.',
                    });
                } else {
                    setState({
                        user,
                        profile: null,
                        loading: false,
                        error: 'Failed to load user profile.',
                    });
                }
            } else {
                setState({ user: null, profile: null, loading: false, error: null });
            }
        });

        return () => unsubscribe();
    }, [syncUser]);

    const login = async (email: string, password: string) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle the rest
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Login failed';
            let friendlyMessage = message;
            if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
                friendlyMessage = 'Invalid email or password.';
            } else if (message.includes('too-many-requests')) {
                friendlyMessage = 'Too many attempts. Please try again later.';
            }
            setState((prev) => ({
                ...prev,
                loading: false,
                error: friendlyMessage,
            }));
        }
    };

    const logout = async () => {
        await signOut(auth);
        setState({ user: null, profile: null, loading: false, error: null });
    };

    return {
        user: state.user,
        profile: state.profile,
        loading: state.loading,
        error: state.error,
        login,
        logout,
    };
}
