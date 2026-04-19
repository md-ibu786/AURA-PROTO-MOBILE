import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useTheme';
import { Spacing, Radius } from '../theme';

interface LoginScreenProps {
    onLogin: (email: string, password: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}

export default function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
    const { colors } = useAppTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = () => {
        if (email.trim() && password.trim()) { onLogin(email.trim(), password); }
    };

    const s = createStyles(colors);

    return (
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

                {/* Logo / Header */}
                <View style={s.header}>
                    {/* Mic icon */}
                    <View style={s.logoCircle}>
                        <View style={s.micIcon}>
                            <View style={s.micBody} />
                            <View style={s.micBase} />
                        </View>
                    </View>
                    <Text style={s.appName}>AURA</Text>
                </View>

                {/* Card */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Sign In</Text>

                    {error && (
                        <View style={s.errorBox}>
                            <Text style={s.errorText}>{error}</Text>
                        </View>
                    )}

                    <Text style={s.label}>Email</Text>
                    <TextInput style={s.input} value={email} onChangeText={setEmail}
                        placeholder="staff@university.edu" placeholderTextColor={colors.textMuted}
                        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} />

                    <Text style={s.label}>Password</Text>
                    <View style={s.passwordContainer}>
                        <TextInput style={[s.input, s.passwordInput]} value={password} onChangeText={setPassword}
                            placeholder="Enter your password" placeholderTextColor={colors.textMuted}
                            secureTextEntry={!showPassword} editable={!loading} onSubmitEditing={handleSubmit} />
                        <TouchableOpacity style={s.eyeButton} onPress={() => setShowPassword((v) => !v)}
                            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button">
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                        {loading ? <ActivityIndicator color={colors.bgPrimary} /> : <Text style={s.buttonText}>Sign In</Text>}
                    </TouchableOpacity>

                    <Text style={s.hint}>Credentials are set by your administrator</Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.bgSecondary, borderWidth: 2, borderColor: colors.primary,
        justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
    },
    micIcon: { width: 24, height: 30, alignItems: 'center' },
    micBody: { width: 12, height: 18, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, marginTop: 2 },
    micBase: { width: 18, height: 3, backgroundColor: colors.primary, borderRadius: 1.5, marginTop: 1 },
    appName: { fontSize: 36, fontWeight: '800', color: colors.primary, letterSpacing: 4 },
    card: { width: '100%', maxWidth: 400, backgroundColor: colors.bgSecondary, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, padding: Spacing.lg },
    cardTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: Spacing.md },
    errorBox: { backgroundColor: (colors.error + '20'), borderWidth: 1, borderColor: colors.error, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
    errorText: { color: colors.error, fontSize: 14 },
    label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: Spacing.sm },
    input: { backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.sm, padding: Spacing.md, color: colors.textPrimary, fontSize: 15 },
    passwordContainer: { position: 'relative' },
    passwordInput: { paddingRight: 50 },
    eyeButton: { position: 'absolute', right: 12, top: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    button: { backgroundColor: colors.primary, borderRadius: Radius.sm, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.bgPrimary, fontWeight: '700', fontSize: 16 },
    hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
});
