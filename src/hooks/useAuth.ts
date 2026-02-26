import { useState, useEffect, useCallback } from 'react';
import firebase from '../config/firebase';
import { auth } from '../config/firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    role: string;
    status: string;
    departmentId: string | null;
    subjectIds: string[];
}

interface AuthState {
    user: firebase.User | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
        error: null,
    });

    const syncUser = useCallback(async (user: firebase.User): Promise<UserProfile | null> => {
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
            if (!res.ok) return null;
            const data = await res.json();
            return data.user as UserProfile;
        } catch {
            // Network unavailable — return null, auth state still set from Firebase cache
            return null;
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const profile = await syncUser(user);
                if (profile && (profile.role === 'staff' || profile.role === 'admin')) {
                    setState({ user, profile, loading: false, error: null });
                } else if (profile) {
                    await auth.signOut();
                    setState({
                        user: null,
                        profile: null,
                        loading: false,
                        error: 'Access denied. Only staff members can use this app.',
                    });
                } else {
                    // Offline: allow in with no profile (they can still record)
                    setState({ user, profile: null, loading: false, error: null });
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
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Login failed';
            let friendly = message;
            if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
                friendly = 'Invalid email or password.';
            } else if (message.includes('too-many-requests')) {
                friendly = 'Too many attempts. Please try again later.';
            } else if (message.includes('network')) {
                friendly = 'No internet connection. Please check your network.';
            }
            setState((prev) => ({ ...prev, loading: false, error: friendly }));
        }
    };

    const logout = async () => {
        await auth.signOut();
        setState({ user: null, profile: null, loading: false, error: null });
    };

    return {
        user: state.user,
        profile: state.profile,
        loading: state.loading,
        error: state.error,
        isAuthenticated: !!state.user,
        login,
        logout,
    };
}
