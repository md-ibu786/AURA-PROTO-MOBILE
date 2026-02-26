<?xml version="1.0" encoding="UTF-8"?>
<!--
  GEMINI.md - AI Assistant Guide for AURA Staff Recorder (React Native)
  =====================================================================
  
  This file provides comprehensive guidance for AI assistants working on the
  AURA Staff Recorder React Native mobile app (Expo SDK 54).
  All AI assistants MUST read and follow these guidelines before making changes.
  
  Version: 2.0
  Last Updated: 2026-02-26
-->

<guidelines>

  <!-- PROJECT OVERVIEW -->
  <project_overview>
    <name>AURA Staff Recorder (React Native)</name>
    <description>
      A React Native (Expo) mobile app for university staff to record lectures,
      play them back, and upload audio to the AURA-PROTO backend's audio-to-notes
      pipeline. The pipeline transcribes audio (Deepgram), refines the transcript
      (Gemini), generates structured notes (Gemini), and creates a PDF.
    </description>
    <purpose>
      - Provide a mobile-native recording interface for staff
      - Offline-first: record without internet, auto-upload when online
      - Play back saved recordings with seekable progress bar
      - Module-level targeting via cascading dropdowns
      - Upload recordings to AURA-PROTO pipeline for processing
    </purpose>
    <relationship_to_aura_proto>
      This is a COMPANION app to AURA-PROTO. It does NOT have its own backend.
      It calls the AURA-PROTO backend API at the URL specified in EXPO_PUBLIC_API_URL.
      Authentication uses the SAME Firebase project as the admin panel.
      Only staff and admin users can access this app.
    </relationship_to_aura_proto>
  </project_overview>

  <!-- ARCHITECTURE -->
  <architecture>
    <framework>React Native + Expo SDK 54 + TypeScript</framework>
    <runtime>Expo Go (development) / EAS Build (production)</runtime>
    <styling>React Native StyleSheet + theme.ts constants</styling>
    <state_management>React hooks (useState, useCallback, useEffect, useRef)</state_management>
    <auth>Firebase Auth v10 compat API (email/password) → /auth/sync for role check</auth>
    <recording>expo-audio useAudioRecorder hook → .m4a (Android) / .caf (iOS)</recording>
    <playback>expo-audio useAudioPlayer + useAudioPlayerStatus hooks</playback>
    <file_storage>expo-file-system/legacy → app document directory</file_storage>
    <metadata_storage>@react-native-async-storage/async-storage</metadata_storage>
    <backend_dependency>AURA-PROTO FastAPI backend (port 8001)</backend_dependency>

    <key_directories>
      <directory path="src/config/" description="Firebase SDK initialization (compat API)"/>
      <directory path="src/hooks/" description="Custom React hooks (useAuth, useRecorder)"/>
      <directory path="src/services/" description="API/storage services (hierarchy, recordings, uploads)"/>
      <directory path="src/screens/" description="Full-screen components (LoginScreen, RecorderScreen)"/>
      <directory path="src/components/" description="Reusable UI components (ModuleSelector, RecordingCard)"/>
      <directory path="src/navigation/" description="React Navigation stack (AppNavigator)"/>
      <directory path="src/utils/" description="Utility functions (UUID generator)"/>
    </key_directories>
  </architecture>

  <!-- FILE MAP -->
  <file_map>
    <file path="src/config/firebase.ts" description="Firebase SDK init using compat API + EXPO_PUBLIC_ env vars"/>
    <file path="src/hooks/useAuth.ts" description="Firebase login + /auth/sync + staff-only enforcement"/>
    <file path="src/hooks/useRecorder.ts" description="expo-audio recording hook: start/pause/resume/stop + timer"/>
    <file path="src/services/hierarchyCache.ts" description="Fetch + cache dept/sem/subject/module hierarchy in AsyncStorage"/>
    <file path="src/services/recordingStorage.ts" description="Save/load/delete recordings (file system + AsyncStorage)"/>
    <file path="src/services/uploadQueue.ts" description="Upload recordings to backend pipeline + retry logic"/>
    <file path="src/screens/LoginScreen.tsx" description="Email/password login form"/>
    <file path="src/screens/RecorderScreen.tsx" description="Main recording UI with full state machine + saved recordings list"/>
    <file path="src/components/ModuleSelector.tsx" description="Cascading picker: Dept → Sem → Subject → Module"/>
    <file path="src/components/RecordingCard.tsx" description="Recording card with play/pause, seekable progress bar, upload/delete"/>
    <file path="src/navigation/AppNavigator.tsx" description="Login → Recorder stack navigation"/>
    <file path="src/theme.ts" description="AURA color constants and spacing/radius tokens"/>
    <file path="src/utils/uuid.ts" description="Simple UUID v4 generator"/>
    <file path="app.config.ts" description="Expo app config (SDK 54, plugins, platforms)"/>
    <file path="metro.config.js" description="Metro bundler config for Firebase module resolution"/>
  </file_map>

  <!-- DESIGN SYSTEM -->
  <design_system>
    <theme>Black + Cyber Yellow — matches the AURA-PROTO admin panel</theme>
    <colors>
      <color name="primary" value="#FFD400" usage="Accents, buttons, highlights"/>
      <color name="bgPrimary" value="#0a0a0a" usage="Page backgrounds"/>
      <color name="bgSecondary" value="#111111" usage="Card backgrounds"/>
      <color name="bgTertiary" value="#1a1a1a" usage="Input backgrounds"/>
      <color name="textPrimary" value="#ffffff" usage="Headings, body text"/>
      <color name="textSecondary" value="#b0b0b0" usage="Labels, descriptions"/>
      <color name="textMuted" value="#666666" usage="Disabled text, footnotes"/>
      <color name="border" value="#2a2a2a" usage="Card borders, dividers"/>
      <color name="error" value="#ef4444" usage="Error messages, recording dot"/>
      <color name="success" value="#22c55e" usage="Uploaded badge"/>
      <color name="warning" value="#f59e0b" usage="Offline pill, upload errors"/>
    </colors>
    <important_rules>
      - ALL styling uses constants from src/theme.ts (Colors, Spacing, Radius)
      - NO Tailwind CSS, NO CSS files — this is React Native (StyleSheet.create)
      - Theme must match the AURA-PROTO admin panel
      - Mobile-first (this IS a mobile app)
    </important_rules>
  </design_system>

  <!-- USER FLOW STATE MACHINE -->
  <user_flow>
    <description>
      RecorderScreen.tsx manages the app state:
      idle → recording → stopped (saved) → uploading → uploaded
    </description>
    <states>
      <state name="idle" description="Enter title, select module via cascading dropdowns, tap Record"/>
      <state name="recording" description="Audio is being captured, timer running, can pause/resume"/>
      <state name="stopped" description="Recording saved locally, appears in saved recordings list"/>
      <state name="playback" description="User taps ▶ on a saved recording, seekable progress bar shown"/>
      <state name="uploading" description="Audio being sent to AURA-PROTO pipeline"/>
      <state name="uploaded" description="Pipeline received the audio, badge shows ✓ Uploaded"/>
    </states>
  </user_flow>

  <!-- BACKEND API CALLS -->
  <api_calls>
    <description>
      All API calls go to the AURA-PROTO backend (EXPO_PUBLIC_API_URL).
      All requests include a Firebase Auth Bearer token.
    </description>
    <endpoints_used>
      <endpoint method="POST" path="/auth/sync" description="Sync user profile, get role"/>
      <endpoint method="GET" path="/departments" description="List all departments"/>
      <endpoint method="GET" path="/departments/{id}/semesters" description="List semesters for dept"/>
      <endpoint method="GET" path="/semesters/{id}/subjects" description="List subjects for semester"/>
      <endpoint method="GET" path="/subjects/{id}/modules" description="List modules for subject"/>
      <endpoint method="POST" path="/api/audio/process-pipeline" description="Upload audio + start pipeline"/>
      <endpoint method="GET" path="/api/audio/pipeline-status/{jobId}" description="Poll pipeline progress"/>
    </endpoints_used>
    <response_format>
      Hierarchy endpoints return wrapped objects:
      - /departments → {"departments": [...]}
      - /departments/{id}/semesters → {"semesters": [...]}
      - /semesters/{id}/subjects → {"subjects": [...]}
      - /subjects/{id}/modules → {"modules": [...]}
      The hierarchyCache.ts service unwraps these before caching.
    </response_format>
  </api_calls>

  <!-- ENVIRONMENT VARIABLES -->
  <environment_variables>
    <variable name="EXPO_PUBLIC_FIREBASE_API_KEY" required="true" description="Firebase Web API Key"/>
    <variable name="EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" required="true" description="Firebase Auth Domain"/>
    <variable name="EXPO_PUBLIC_FIREBASE_PROJECT_ID" required="true" description="Firebase Project ID"/>
    <variable name="EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" required="true" description="Firebase Storage Bucket"/>
    <variable name="EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" required="true" description="Firebase Messaging Sender ID"/>
    <variable name="EXPO_PUBLIC_FIREBASE_APP_ID" required="true" description="Firebase App ID"/>
    <variable name="EXPO_PUBLIC_API_URL" required="true" description="AURA-PROTO backend URL (use LAN IP, e.g. http://192.168.1.100:8001)"/>
  </environment_variables>

  <!-- IMPORTANT NOTES -->
  <important_notes>
    <note type="critical">
      This app has NO backend of its own. All data comes from the AURA-PROTO backend.
      The AURA-PROTO backend must be running and accessible over the LAN for this app to function.
      Start the backend with: python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
    </note>
    <note type="critical">
      Firebase uses the COMPAT API (firebase/compat/app, firebase/compat/auth).
      This is required for compatibility with the Hermes JS engine in React Native.
      Do NOT migrate to the modular Firebase API — it will crash on Hermes.
    </note>
    <note type="critical">
      Firebase config MUST match the same Firebase project as the AURA-PROTO admin panel.
      Users authenticate against the same Firebase Auth instance.
    </note>
    <note type="important">
      Only staff and admin roles can access this app. Students are blocked at login.
      Role is determined by the /auth/sync endpoint response.
    </note>
    <note type="important">
      expo-file-system must be imported from 'expo-file-system/legacy' (Expo SDK 54 migration).
      The new File/Directory API is not yet used.
    </note>
    <note type="important">
      Audio format: expo-audio outputs .m4a (Android) or .caf (iOS).
      recordingStorage.ts auto-detects the extension from the source URI.
    </note>
    <note type="important">
      Picker.Item color on Android: use dark text (#111111) for items in the modal dropdown,
      because the Android picker modal has a white background.
    </note>
  </important_notes>

  <!-- CODING CONVENTIONS -->
  <coding_conventions>
    <rule>Use TypeScript for all new files</rule>
    <rule>Use functional components with hooks</rule>
    <rule>Use Colors/Spacing/Radius from src/theme.ts for all styling</rule>
    <rule>Use StyleSheet.create for component styles — no CSS files</rule>
    <rule>Use Firebase compat API (firebase/compat/*) — NOT modular API</rule>
    <rule>Import expo-file-system from 'expo-file-system/legacy'</rule>
    <rule>Use `type` keyword for type-only imports</rule>
    <rule>Keep components focused and single-responsibility</rule>
    <rule>API calls always include Firebase auth token via user.getIdToken()</rule>
    <rule>Use --legacy-peer-deps flag when running npm install</rule>
  </coding_conventions>

  <!-- DEVELOPMENT COMMANDS -->
  <development_commands>
    <command action="Install dependencies" cmd="npm install --legacy-peer-deps"/>
    <command action="Start dev server" cmd="npx expo start --clear"/>
    <command action="Start backend (required)" cmd="python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001"/>
    <command action="Build for production" cmd="npm run build"/>
    <command action="Type check" cmd="npx tsc -b"/>
  </development_commands>

</guidelines>
