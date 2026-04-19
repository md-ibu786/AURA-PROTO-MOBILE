import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius } from '../theme';

const ONBOARDING_KEY = 'aura_onboarding_complete';

const STEPS = [
    {
        title: 'Select a Module',
        description: 'Search for your module or pick from recent ones below to tag your recordings.',
    },
    {
        title: 'Record Lecture',
        description: 'Tap the Record button to capture audio. You can pause and resume at any time.',
    },
    {
        title: 'Auto Upload',
        description: 'Recordings upload automatically when online. They save locally even if you lose connection.',
    },
];

interface OnboardingOverlayProps {
    visible: boolean;
    onComplete: () => void;
}

export default function OnboardingOverlay({ visible, onComplete }: OnboardingOverlayProps) {
    const [step, setStep] = useState(0);
    const [fadeAnim] = useState(() => new Animated.Value(1));

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                    <Text style={styles.stepIndicator}>
                        {step + 1} / {STEPS.length}
                    </Text>
                    <Text style={styles.title}>{STEPS[step].title}</Text>
                    <Text style={styles.description}>{STEPS[step].description}</Text>

                    {/* Dot indicators */}
                    <View style={styles.dots}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === step && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>
                            {step === STEPS.length - 1 ? 'Got it' : 'Next'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={onComplete}
                    >
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    card: {
        backgroundColor: Colors.bgSecondary,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.primary,
        padding: Spacing.xl,
        width: '100%',
        alignItems: 'center',
    },
    stepIndicator: {
        fontSize: 12,
        color: Colors.textMuted,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: Spacing.xl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.border,
    },
    dotActive: {
        width: 24,
        backgroundColor: Colors.primary,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        width: '100%',
        alignItems: 'center',
        minHeight: 48,
        justifyContent: 'center'
    },
    buttonText: {
        color: Colors.bgPrimary,
        fontWeight: '700',
        fontSize: 16,
    },
    skipButton: {
        marginTop: Spacing.md,
    },
    skipText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
});
