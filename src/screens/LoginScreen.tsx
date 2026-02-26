import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Colors, Spacing, Radius } from '../theme';

interface LoginScreenProps {
    onLogin: (email: string, password: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}

export default function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = () => {
        if (email.trim() && password.trim()) {
            onLogin(email.trim(), password);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

                {/* Logo / Header */}
                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoIcon}>🎙️</Text>
                    </View>
                    <Text style={styles.appName}>AURA</Text>
                    <Text style={styles.appSubtitle}>Staff Recorder</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sign In</Text>

                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="staff@university.edu"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, styles.passwordInput]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            placeholderTextColor={Colors.textMuted}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                            onSubmitEditing={handleSubmit}
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword((v) => !v)}
                        >
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.bgPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.hint}>Credentials are set by your administrator</Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgPrimary },
    inner: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.bgSecondary,
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    logoIcon: { fontSize: 36 },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: 4,
    },
    appSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        letterSpacing: 2,
        marginTop: 4,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.bgSecondary,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    errorBox: {
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderWidth: 1,
        borderColor: Colors.error,
        borderRadius: Radius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
    },
    errorText: { color: Colors.error, fontSize: 14 },
    label: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 6,
        marginTop: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: 15,
    },
    passwordContainer: { position: 'relative' },
    passwordInput: { paddingRight: 50 },
    eyeButton: {
        position: 'absolute',
        right: 12,
        top: 12,
    },
    eyeIcon: { fontSize: 18 },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
        color: Colors.bgPrimary,
        fontWeight: '700',
        fontSize: 16,
    },
    hint: {
        fontSize: 12,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
});
