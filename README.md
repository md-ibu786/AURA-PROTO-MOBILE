# AURA Staff Recorder — React Native Mobile App

A React Native (Expo) mobile app for university staff to **record lectures** directly from their phone, **play them back**, and **upload** the audio to the [AURA-PROTO](../AURA-PROTO/) backend's audio-to-notes pipeline. The pipeline transcribes audio (Deepgram), refines the transcript (Gemini), generates structured notes (Gemini), and creates a PDF — all automatically.

## Features

- 🎙️ **Record lectures** with start / pause / resume / stop controls
- ▶️ **Play back** saved recordings with a seekable progress bar
- 📁 **Module targeting** via cascading dropdowns (Department → Semester → Subject → Module)
- 📴 **Offline-first** — recordings save locally and auto-upload when online
- ⬆️ **Upload queue** — manual or automatic upload to AURA-PROTO backend
- 🔐 **Firebase Auth** — staff and admin users only (students are blocked)
- 🎨 **AURA theme** — Black + Cyber Yellow, matching the admin panel

## Tech Stack

| Layer        | Technology                                     |
| ------------ | ---------------------------------------------- |
| Framework    | React Native + Expo SDK 54                     |
| Language     | TypeScript                                     |
| Auth         | Firebase Auth v10 (compat API)                 |
| Recording    | `expo-audio` (`useAudioRecorder`)              |
| Playback     | `expo-audio` (`useAudioPlayer`)                |
| File Storage | `expo-file-system` (local document directory)  |
| Metadata     | `@react-native-async-storage/async-storage`    |
| Networking   | `@react-native-community/netinfo`              |
| Dropdowns    | `@react-native-picker/picker`                  |
| Backend      | AURA-PROTO FastAPI (port 8001) — **required**  |

## Prerequisites

- **Node.js** 18+ and **npm**
- **Expo Go** app installed on your Android/iOS device
- **AURA-PROTO backend** running on port 8001 (for auth + uploads)
- Same **Firebase project** as the AURA-PROTO admin panel

## Getting Started

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend API URL — use your machine's LAN IP when testing on phone
# Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8001
```

> **Important:** Use your LAN IP (e.g. `192.168.1.100`), NOT `localhost`, because the phone needs to reach your dev machine over the network.

### 3. Start the AURA-PROTO backend

In a separate terminal, from the `AURA-PROTO` directory:

```bash
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
```

The `--host 0.0.0.0` flag makes it accessible from your phone over the LAN.

### 4. Start the Expo dev server

```bash
npx expo start --clear
```

### 5. Open on your phone

Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS). The app will load on your device.

## Project Structure

```
src/
├── components/
│   ├── ModuleSelector.tsx      # Cascading dropdown: Dept → Sem → Subject → Module
│   └── RecordingCard.tsx       # Recording card with play/pause, seek bar, upload/delete
├── config/
│   └── firebase.ts             # Firebase SDK init (compat API for Hermes)
├── hooks/
│   ├── useAuth.ts              # Firebase login + /auth/sync + staff-only check
│   └── useRecorder.ts          # expo-audio recording hook (start/pause/resume/stop)
├── navigation/
│   └── AppNavigator.tsx        # Login → Recorder routing
├── screens/
│   ├── LoginScreen.tsx         # Email/password login form
│   └── RecorderScreen.tsx      # Main UI: record, playback, upload, saved recordings
├── services/
│   ├── hierarchyCache.ts       # Fetch + cache department hierarchy in AsyncStorage
│   ├── recordingStorage.ts     # Save/load/delete recordings (file system + AsyncStorage)
│   └── uploadQueue.ts          # Upload recordings to backend pipeline
├── theme.ts                    # AURA color constants and spacing tokens
└── utils/
    └── uuid.ts                 # UUID generator
```

## User Flow

1. **Login** — Staff/admin authenticates with email + password via Firebase
2. **Setup** — Enter lecture title, optionally select a module via dropdowns
3. **Record** — Tap the big yellow record button; pause/resume as needed
4. **Stop & Save** — Recording saves locally to the device
5. **Playback** — Tap ▶ on any saved recording to listen; drag the progress bar to seek
6. **Upload** — Auto-uploads when online, or tap ⬆ to upload manually
7. **Pipeline** — Backend processes: Deepgram transcription → Gemini refinement → PDF

## Scripts

| Command                      | Description                     |
| ---------------------------- | ------------------------------- |
| `npx expo start --clear`     | Start dev server (clear cache)  |
| `npx expo start --android`   | Start + open on Android         |
| `npx expo start --ios`       | Start + open on iOS             |
| `npm run build`              | Build for production            |

## Notes

- **Firebase compat API** is used instead of the modular API for Hermes (React Native JS engine) compatibility.
- **expo-file-system** uses the `expo-file-system/legacy` import path (Expo SDK 54 migration).
- **Audio format**: `expo-audio` outputs `.m4a` (Android) or `.caf` (iOS). The file extension is auto-detected from the source URI.
- **CORS**: The backend's `ALLOWED_ORIGINS` must include the mobile app's origin for API calls to work.
