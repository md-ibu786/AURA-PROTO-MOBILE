import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'AURA Recorder',
    slug: 'aura-staff-recorder',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    platforms: ['ios', 'android'],
    splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0a0a0a',
    },
    ios: {
        supportsTablet: false,
        bundleIdentifier: 'com.aura.staffrecorder',
        infoPlist: {
            NSMicrophoneUsageDescription: 'AURA Recorder needs the microphone to record lectures.',
        },
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#0a0a0a',
        },
        package: 'com.aura.staffrecorder',
        permissions: ['RECORD_AUDIO', 'INTERNET', 'ACCESS_NETWORK_STATE'],
    },
    plugins: [
        [
            'expo-audio',
            {
                microphonePermission: 'AURA Recorder needs the microphone to record lectures.',
            },
        ],
    ],
    extra: {
        firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
});
