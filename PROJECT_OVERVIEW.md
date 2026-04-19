# AURA Staff Recorder — Mobile Application

## Detailed Project Overview

> This document provides a comprehensive technical overview of the AURA Staff Recorder mobile application, designed to serve as reference material for final year project documentation. The mobile app is one component within the broader AURA (Audio Understanding & Response Assistant) system.

---

## Table of Contents

1. [System Context & Purpose](#1-system-context--purpose)
2. [The Larger AURA Architecture](#2-the-larger-aura-architecture)
3. [Problem Statement & Motivation](#3-problem-statement--motivation)
4. [User Role & Target Audience](#4-user-role--target-audience)
5. [Technology Stack](#5-technology-stack)
6. [Project Structure & File Organization](#6-project-structure--file-organization)
7. [Application Architecture](#7-application-architecture)
8. [Screen-by-Screen Breakdown](#8-screen-by-screen-breakdown)
9. [Component Catalog](#9-component-catalog)
10. [Custom Hooks](#10-custom-hooks)
11. [Service Layer Deep Dive](#11-service-layer-deep-dive)
12. [Data Structures & Models](#12-data-structures--models)
13. [Data Flow & State Management](#13-data-flow--state-management)
14. [Backend API Integration](#14-backend-api-integration)
15. [Authentication & Authorization Flow](#15-authentication--authorization-flow)
16. [Offline-First Design](#16-offline-first-design)
17. [Audio Recording Lifecycle](#17-audio-recording-lifecycle)
18. [File Storage & Export System](#18-file-storage--export-system)
19. [Caching Strategy](#19-caching-strategy)
20. [Network Connectivity Handling](#20-network-connectivity-handling)
21. [UI Design System](#21-ui-design-system)
22. [Design Patterns & Architectural Decisions](#22-design-patterns--architectural-decisions)
23. [Platform Considerations](#23-platform-considerations)
24. [Error Handling Strategy](#24-error-handling-strategy)
25. [Security Considerations](#25-security-considerations)
26. [Environment Configuration](#26-environment-configuration)
27. [Build & Deployment](#27-build--deployment)

---

## 1. System Context & Purpose

**AURA** (Audio Understanding & Response Assistant) is an AI-powered educational platform that transforms raw lecture audio recordings into structured, citation-backed study materials. The system uses Automatic Speech Recognition (ASR) powered by Deepgram, a Large Language Model (Gemini) for content enrichment, and a Retrieval-Augmented Generation (RAG) pipeline backed by a Knowledge Graph (Neo4j) and Vector Database to produce verified outputs.

### Role of the Mobile Application

The mobile application (`AURA-PROTO-MOBILE`) is the **audio capture and ingestion layer** of the AURA system. It serves as the tool through which teaching staff:

- Record lecture audio on-the-go using their mobile device
- Tag recordings with hierarchical academic context (department, semester, subject, module)
- Upload recordings to the AURA backend AI processing pipeline
- Manage their recording library (playback, upload scheduling, deletion)

The mobile app does not perform AI processing locally. Its responsibility is limited to capture, tag, store, and transmit — the heavy lifting (transcription, enrichment, note generation) occurs server-side.

---

## 2. The Larger AURA Architecture

The complete AURA system consists of four major architectural layers:

### Layer 1: Input & Interface
- **AURA Web UI** — Primary interface for students to access generated notes and chat
- **Student User** — End consumer of structured study materials
- **Audio Lecture** — Raw input (captured via this mobile app)
- **PDF Documents** — Supplementary academic materials

### Layer 2: Processing & AI Core
- **Deepgram ASR** — Converts audio recordings to text transcripts
- **LLM (Gemini)** — Processes transcripts with contextual enrichment, generates structured notes and verified responses
- **RAG Engine** — Retrieval-Augmented Generation system that grounds LLM outputs in verified academic knowledge

### Layer 3: Knowledge & Storage
- **Knowledge Graph (Neo4j)** — Stores structured academic relationships and concepts
- **Vector DB** — Embeddings-based semantic search for RAG context retrieval
- **Firebase Cloud** — Authentication, user management, and cloud storage

### Layer 4: Outputs
- **Structured PDF Notes** — Auto-generated, organized study notes from lecture transcripts
- **Verified Chat Response** — AI chat interface with citations back to source material

The mobile app feeds into Layer 1 (Input & Interface) by providing the Audio Lecture input to the system.

---

## 3. Problem Statement & Motivation

### The Gap in Lecture-Based Learning

During lectures, students are presented with a wealth of information that often goes beyond what is captured in slides, textbooks, or formal course materials. When students miss a lecture, struggle to follow in real-time, or need to revisit complex topics, they have no reliable mechanism to recover the oral component of teaching.

### Current Solutions and Their Limitations

- **Dictaphones/Voice Recorders** — Require separate hardware, no organization or tagging, manual file management
- **Phone Voice Memos** — Disconnected from academic context, no tagging by module, no automatic upload pipeline
- **Manual Note-Taking** — Students cannot simultaneously listen and take comprehensive notes
- **Generic Recording Apps** — No role-based access control, no integration with AI processing pipelines

### How AURA Addresses This

1. Staff records lectures directly from their phone with one tap
2. Recording is tagged with module metadata for organization
3. Audio is uploaded server-side and processed through Deepgram ASR → Gemini LLM → RAG pipeline
4. Students receive structured PDF notes and can ask verified, citation-backed questions about the content

The mobile app specifically removes the friction of the first step — making recording as simple as possible for busy staff members.

---

## 4. User Role & Target Audience

### Primary User: Teaching Staff

- **Role**: `staff` or `admin` (enforced at authentication level)
- **Context**: University lecturers, professors, and teaching assistants
- **Use Case**: Record lectures, seminars, or tutorial sessions for later processing
- **Device**: Android or iOS smartphones

### Access Control

- Student accounts are explicitly blocked from using the mobile app
- Role verification occurs during login via the backend `/api/auth/sync` endpoint
- If a non-staff user logs in, they are immediately signed out with an "Access denied" message

---

## 5. Technology Stack

### Framework & Runtime
| Technology | Version | Purpose |
|---|---|---|
| **Expo SDK** | ~54.0.0 | Managed React Native framework, provides access to native APIs without native code |
| **React Native** | 0.81.5 | Cross-platform mobile UI framework |
| **React** | 19.1.0 | UI component library |
| **TypeScript** | ^5.3.3 | Static typing, improved developer experience and code safety |

### Navigation
| Technology | Version | Purpose |
|---|---|---|
| **@react-navigation/native** | ^7.1.6 | Declarative navigation container |
| **@react-navigation/native-stack** | ^7.3.10 | Native stack navigator (uses platform-native transitions) |

### Native Device Capabilities
| Technology | Version | Purpose |
|---|---|---|
| **expo-audio** | ~1.1.1 | Audio recording (`RecordingPresets.HIGH_QUALITY`) and playback |
| **expo-file-system** | ~19.0.21 | File I/O, directory management, SAF (Storage Access Framework) on Android |
| **@react-native-community/netinfo** | 11.4.1 | Network connectivity monitoring for offline-first upload queue |
| **@react-native-picker/picker** | 2.11.1 | Native dropdown selectors for module hierarchy |

### Data & State
| Technology | Version | Purpose |
|---|---|---|
| **@react-native-async-storage/async-storage** | 2.2.0 | Persistent key-value storage for metadata, caches, and recording indexes |
| **Firebase (compat)** | ^10.14.1 | Authentication (email/password), user management, ID token generation |

### Platform Support
- **Android** — Full feature set including SAF folder picker for file export
- **iOS** — Recording, playback, upload (SAF export is excluded)

---

## 6. Project Structure & File Organization

```
AURA-PROTO-MOBILE/
├── App.tsx                          # Root component, sets status bar, mounts navigator
├── package.json                     # Project dependencies and scripts
├── .env                             # Environment variables (Firebase config, backend URL)
├── CLAUDE.md                        # Agent instructions
├── README.md                        # Brief project readme
│
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Root stack navigator (Login ↔ Recorder)
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Authentication UI (email/password form)
│   │   └── RecorderScreen.tsx       # Main screen: recording controls + library
│   │
│   ├── components/
│   │   ├── ModuleSelector.tsx       # Cascading dropdown: Dept → Semester → Subject → Module
│   │   └── RecordingCard.tsx        # Playback card with seek bar, upload status, delete
│   │
│   ├── services/
│   │   ├── recordingStorage.ts      # Local recording CRUD (AsyncStorage + FileSystem)
│   │   ├── uploadQueue.ts           # Upload to backend + auto-retry on reconnect
│   │   ├── exportService.ts         # Android SAF folder picker + file export
│   │   └── hierarchyCache.ts        # Department/semester/subject/module API caching
│   │
│   ├── hooks/
│   │   ├── useAuth.ts               # Authentication state machine + role verification
│   │   └── useRecorder.ts           # Recording state machine (idle/record/pause/stop)
│   │
│   ├── config/
│   │   └── firebase.ts              # Firebase initialization + auth instance
│   │
│   ├── utils/
│   │   └── uuid.ts                  # Lightweight UUID v4 generator (no native deps)
│   │
│   └── theme.ts                     # Shared design tokens (colors, spacing, radius)
```

Architecture rationale:
- **Single entry point** (`App.tsx`) that only sets system chrome and delegates to the navigator
- **Screens** contain UI composition and user interaction logic
- **Components** are reusable, self-contained UI pieces
- **Services** handle data operations (storage, network, file management) — no UI concerns
- **Hooks** encapsulate complex state machines (recording lifecycle, auth flow)
- **Theme** centralizes design tokens for consistency

---

## 7. Application Architecture

### Navigation Architecture

```
AppNavigator (Native Stack)
│
├── Login Screen        (shown when !isAuthenticated)
│   └── LoginScreen.tsx
│
└── Recorder Screen     (shown when isAuthenticated)
    └── RecorderScreen.tsx
```

The app uses a **conditional rendering** pattern within the navigator: the auth state from `useAuth` determines which screen is mounted. There is no navigation stack history between login and recorder — logging out unmounts the recorder screen entirely, ensuring clean state transitions.

### Screen Mounting Flow

```
App boots
  └─ AppNavigator mounts
       └─ useAuth hook attaches listener to auth.onAuthStateChanged
            ├─ Firebase restores session from device cache → user is non-null
            │    └─ POST /api/auth/sync → verify staff role → mount RecorderScreen
            └─ No cached session → mount LoginScreen
```

### Component Hierarchy (RecorderScreen)

```
RecorderScreen
├── Header (app name, user greeting, sign out)
├── ScrollView
│   ├── Record Card
│   │   ├── Title TextInput
│   │   ├── ModuleSelector (conditional on token availability)
│   │   │   ├── Department Picker
│   │   │   ├── Semester Picker
│   │   │   ├── Subject Picker
│   │   │   └── Module Picker
│   │   ├── Timer Display (monospace font)
│   │   ├── Record Button (animated pulse)
│   │   ├── Pause/Stop Controls
│   │   └── Error Display
│   │
│   └── Saved Recordings Card
│       ├── Section Header + Offline Pill
│       ├── Export Folder Status (Android only)
│       └── RecordingCard[] (list)
│           ├── Play/Pause Button
│           ├── Seekable Progress Bar with Thumb
│           ├── Title, Module, Meta Display
│           ├── Upload Status / Upload Button
│           └── Delete Button
```

---

## 8. Screen-by-Screen Breakdown

### 8.1 LoginScreen

**File**: `src/screens/LoginScreen.tsx`

**Purpose**: Authenticate teaching staff via Firebase email/password authentication.

**UI Elements**:
- Branded header with app logo (microphone icon), "AURA" title, "Staff Recorder" subtitle
- Email input field (keyboard type: email-address, auto-capitalize: none)
- Password input with show/hide toggle
- Sign In button with loading spinner state
- Error display box for failed login attempts
- Hint text: "Credentials are set by your administrator"

**Behavior**:
- Keyboard-aware layout using `KeyboardAvoidingView` (padding on iOS, height on Android)
- ScrollView with `keyboardShouldPersistTaps="handled"` to allow tapping through keyboard
- Loading state disables all inputs and shows spinner
- Error messages are translated from Firebase error codes to user-friendly strings
  - `user-not-found` / `wrong-password` / `invalid-credential` → "Invalid email or password."
  - `too-many-requests` → "Too many attempts. Please try again later."
  - `network` → "No internet connection. Please check your network."

**Role Verification** (handled by `useAuth`, not visible in this screen):
- After Firebase auth succeeds, `useAuth` calls the backend's `/api/auth/sync` endpoint
- If the user's role is not `staff` or `admin`, they are signed out immediately
- If the backend is unreachable (offline), the user is allowed in with no profile — this enables recording functionality even without the backend

### 8.2 RecorderScreen

**File**: `src/screens/RecorderScreen.tsx`

**Purpose**: Main application screen — record lectures, manage recordings, handle uploads.

**State Variables** (11 pieces of state):

| State | Type | Purpose |
|---|---|---|
| `title` | string | Current lecture title input |
| `moduleId` | string \| null | Selected module ID for tagging |
| `moduleName` | string \| null | Selected module display name |
| `recordings` | SavedRecording[] | List of all local recordings |
| `uploading` | string \| null | ID of recording currently being uploaded |
| `isOnline` | boolean | Current network connectivity status |
| `token` | string | Firebase ID token for API calls |
| `exportFolderSet` | boolean | Whether SAF export folder is configured |

**Key Effects**:
1. **Token fetch** — Gets Firebase ID token on mount/user change
2. **Recordings load** — Loads all saved recordings from AsyncStorage on mount
3. **Export folder prompt** (Android only) — After 1.5s delay, prompts user to pick a save folder if not already configured
4. **Network monitoring** — Subscribes to NetInfo state changes; triggers `processPendingUploads` when reconnecting
5. **Pulse animation** — Animated loop (scale 1.0 → 1.15) on the record button during active recording

**User Interactions**:
- **Start recording**: Validates title is non-empty, then starts recording
- **Stop recording**: Stops recorder, saves to permanent storage, tries immediate upload if online
- **Manual upload**: Retries upload for previously failed or pending recordings
- **Delete**: Confirmation dialog before removing recording from device and index

---

## 9. Component Catalog

### 9.1 ModuleSelector

**File**: `src/components/ModuleSelector.tsx`

**Purpose**: Cascading 4-level dropdown for selecting the academic context of a recording.

**Cascade Chain**:
```
Department → Semester → Subject → Module
```

Each level is dependent on the previous level's selection. When a parent level changes, all child levels are cleared and re-fetched.

**Behavior**:
- On mount, fetches all departments (or uses cache)
- When department is selected, clears semester/subject/module, fetches semesters
- When semester is selected, clears subject/module, fetches subjects
- When subject is selected, clears module, fetches modules
- When module is selected, calls `onSelect(moduleId, moduleName)` callback

**Offline Handling**:
- Catches fetch errors silently and falls back to cached data
- Displays "Offline — using cached data" banner when operating on stale cache
- Gracefully handles undefined API responses (validates `Array.isArray` before rendering)

**Design Decision**: Uses native `@react-native-picker/picker` rather than custom dropdowns for platform-consistent UX (native scroll wheel on iOS, native dialog on Android).

### 9.2 RecordingCard

**File**: `src/components/RecordingCard.tsx`

**Purpose**: Display and manage a single recorded lecture entry.

**Features**:
- **Playback**: Full play/pause/replay controls using `expo-audio` player
- **Seekable Progress Bar**: Custom-built with `PanResponder` for drag-to-seek
  - Tracks bar width and X position via `onLayout`
  - Computes seek position from `locationX` relative to bar width
  - Thumb follows progress and provides visual feedback
- **Auto-replay**: When playback finishes, button changes to replay icon (↻)
- **Status Display**: Title, module name (if tagged), duration, date
- **Upload Management**: Shows upload status (Uploaded ✓, Uploading..., retry button ⬆)
- **Error Display**: Shows upload error in warning color
- **Delete**: Trash icon button

**Technical Details**:
- `hasPlayed` state gates the progress bar visibility — only shown after first play
- `hasFinished` detects playback completion by comparing `currentTime` to `duration` with 0.5s tolerance
- Progress is computed as `currentTime / duration`, clamped to [0, 1]

---

## 10. Custom Hooks

### 10.1 useAuth

**File**: `src/hooks/useAuth.ts`

**Purpose**: Manages complete authentication lifecycle — Firebase session, backend sync, role verification, login/logout.

**State Machine**:
```
AuthState = {
  user: firebase.User | null,     // Firebase auth user
  profile: UserProfile | null,     // Backend-verified profile
  loading: boolean,
  error: string | null
}
```

**Key Functions**:

- **`syncUser(user)`**: Exchanges Firebase ID token for backend profile
  - Sends `POST /api/auth/sync` with Bearer token
  - Returns `UserProfile` with role, department, subject assignments
  - Returns `null` on network failure (non-blocking)

- **`auth.onAuthStateChanged` listener**: Core auth observer
  - Triggers on every Firebase auth state change
  - Calls `syncUser` to verify staff role
  - Blocks non-staff users (auto sign-out)
  - Allows offline login (no profile, but recording still works)

- **`login(email, password)`**: Email/password sign-in
  - Sets loading state, clears previous errors
  - Translates Firebase error codes to user-friendly messages
  - Auth state change observer handles the rest (no manual navigation)

- **`logout()`**: Signs out, resets all auth state

**Return Value**:
```typescript
{
  user,                    // Firebase user object
  profile,                 // Backend UserProfile (or null)
  loading,                 // Loading indicator
  error,                   // Error message
  isAuthenticated,         // Boolean shorthand
  login,                   // (email, password) => Promise<void>
  logout                   // () => Promise<void>
}
```

### 10.2 useRecorder

**File**: `src/hooks/useRecorder.ts`

**Purpose**: Encapsulates the complete audio recording lifecycle with duration tracking.

**Recorder State Machine**:
```
idle ──[start()]──> recording ──[pause()]──> paused
                      │                        │
                  [stop()]              [resume()]
                      │                        │
                      ▼                        ▼
                   stopped ──[reset()]──> idle
```

**Duration Tracking**:
- Uses `setInterval` at 500ms resolution to update `durationMs`
- Correctly tracks accumulated time across pause/resume cycles using `pausedDurationRef`
- On stop, computes final duration as: `pausedDurationRef + (isRecording ? elapsedSinceLastPause : 0)`

**Permission Handling**:
- Requests `AudioModule.requestRecordingPermissionsAsync()` on first start
- If denied, sets error message instead of crashing
- Uses `RecordingPresets.HIGH_QUALITY` from expo-audio (typically m4a/44.1kHz)

**Return Value**:
```typescript
{
  state,        // RecorderState: 'idle' | 'recording' | 'paused' | 'stopped'
  durationMs,   // Current recording duration in milliseconds
  error,        // Any recording error message
  start,        // () => Promise<void>
  pause,        // () => Promise<void>
  resume,       // () => Promise<void>
  stop,         // () => Promise<RecordingResult | null>
  reset         // () => void
}
```

---

## 11. Service Layer Deep Dive

### 11.1 recordingStorage.ts

**File**: `src/services/recordingStorage.ts`

**Responsibility**: Persistent storage for recording metadata and audio files on the device.

**Storage Architecture**:
```
AsyncStorage:
  └─ "aura_recordings" → JSON array of SavedRecording metadata

FileSystem (documentDirectory):
  └─ "aura_recordings/"
       └─ "recording-{UUID}.{ext}" → actual audio file
```

**Key Operations**:

| Function | What It Does |
|---|---|
| `getAllRecordings()` | Reads metadata from AsyncStorage, returns parsed array |
| `saveRecording()` | Copies temp file to permanent dir, generates UUID, saves metadata, triggers auto-export |
| `markUploaded(id)` | Updates `uploaded: true` flag in AsyncStorage |
| `markUploadFailed(id, error)` | Sets `uploadError` flag in AsyncStorage |
| `deleteRecording(id)` | Removes both the file (FileSystem) and metadata (AsyncStorage) |

**File Naming Convention**:
- Format: `recording-{UUID}.{ext}`
- Extension detected from the source temp URI (m4a, caf, webm, aac, wav)
- Default extension: m4a

**Auto-Export on Save**:
After saving, the service automatically calls `exportRecordingToFolder` in a fire-and-forget manner (`.catch(() => {})`). The export filename is sanitized: `"{title}_{date}.{ext}"` with forbidden characters (`/\:*?"<>|`) stripped.

### 11.2 uploadQueue.ts

**File**: `src/services/uploadQueue.ts`

**Responsibility**: Upload audio recordings to the AURA backend API with retry support.

**Upload Flow**:
```
1. Get Firebase ID token from user
2. Verify file still exists on device (FileSystem.getInfoAsync)
3. If missing → mark as failed, abort
4. Build FormData payload:
   - file: audio file blob
   - topic: recording title
   - moduleId: optional module identifier
5. POST to /api/audio/process-pipeline with Bearer token
6. If success (2xx) → markUploaded
7. If failure → throw error (caller handles retry logic)
```

**Batch Processing** (`processPendingUploads`):
- Called on app start and network reconnection
- Iterates through all recordings where `uploaded === false`
- Attempts upload sequentially (not in parallel)
- Catches individual failures, marks them with error, continues queue

### 11.3 exportService.ts

**File**: `src/services/exportService.ts`

**Responsibility**: Android Storage Access Framework (SAF) integration for exporting recordings to user-accessible folders.

**How It Works**:
1. User picks a folder once via `requestExportFolder()` → returns SAF `content://` URI
2. URI is persisted in AsyncStorage under key `aura_export_folder_uri`
3. On each recording save, the file is automatically copied to the SAF folder
4. MIME type mapping: m4a → `audio/mp4`, caf → `audio/x-caf`, etc.

**Platform Guard**: All functions check `Platform.OS === 'android'` and return `false`/`null` on other platforms. SAF is an Android-specific API.

### 11.4 hierarchyCache.ts

**File**: `src/services/hierarchyCache.ts`

**Responsibility**: Cache the academic hierarchy (departments, semesters, subjects, modules) to minimize API calls and support offline operation.

**Cache Schema**:
```typescript
{
  departments: Department[],
  semesters: { [departmentId]: Semester[] },
  subjects: { [semesterId]: Subject[] },
  modules: { [subjectId]: Module[] },
  cachedAt: number  // timestamp in ms
}
```

**Cache Lifetime**: 24 hours (`CACHE_TTL_MS = 86400000`)

**Lazy Loading Pattern**:
- Departments fetched on app load
- Semesters fetched only when a department is selected
- Subjects fetched only when a semester is selected
- Modules fetched only when a subject is selected

This avoids fetching the entire hierarchy upfront, which would be wasteful. Each level is fetched only when needed.

---

## 12. Data Structures & Models

### SavedRecording
```typescript
interface SavedRecording {
  id: string;            // UUID v4
  title: string;         // Lecture title (user-provided)
  moduleId: string | null;
  moduleName: string | null;
  filePath: string;      // Permanent path: documentDirectory/aura_recordings/recording-{id}.{ext}
  durationMs: number;    // Total recording duration in milliseconds
  createdAt: string;     // ISO 8601 timestamp
  uploaded: boolean;     // Whether successfully uploaded to backend
  uploadError?: string;  // Last upload error message
}
```

### UserProfile
```typescript
interface UserProfile {
  uid: string;           // Firebase user ID
  email: string;
  displayName: string | null;
  role: string;          // 'staff' | 'admin' | 'student'
  status: string;
  departmentId: string | null;
  subjectIds: string[];  // Subjects this staff member teaches
}
```

### HierarchyCache
```typescript
interface HierarchyCache {
  departments: Department[];                          // All departments
  semesters: Record<string, Semester[]>;              // Key: departmentId
  subjects: Record<string, Subject[]>;                // Key: semesterId
  modules: Record<string, Module[]>;                  // Key: subjectId
  cachedAt: number;                                   // Unix timestamp (ms)
}
```
Each leaf entity (`Department`, `Semester`, `Subject`, `Module`) has `{ id: string, name: string }`.

---

## 13. Data Flow & State Management

### State Management Approach
The app uses **React local state** (useState, useReducer) and **custom hooks** rather than a global state manager like Redux or Zustand. This is appropriate because:

- The app has only two screens
- State is naturally scoped to individual concerns (auth, recorder, module selector)
- No cross-component state sharing is needed beyond props
- AsyncStorage serves as the "database" for persistent state

### Key State Flows

**Recording Creation Flow**:
```
User enters title + optional module
  └─ Taps "Record"
       └─ useRecorder.start()
            └─ expo-audio begins capturing
                 └─ Timer displays in real-time
                      └─ User taps "Stop & Save"
                           └─ useRecorder.stop() → RecordingResult
                                └─ recordingStorage.saveRecording()
                                     ├─ Copy temp file to permanent dir
                                     ├─ Generate UUID and metadata
                                     ├─ Save to AsyncStorage
                                     ├─ Trigger SAF export (fire-and-forget)
                                     └─ Return SavedRecording
                                          └─ RecorderScreen adds to local state
                                               └─ If online: uploadQueue.uploadRecording()
```

**Offline Recovery Flow**:
```
Network reconnects (NetInfo event)
  └─ setIsOnline(true)
       └─ uploadQueue.processPendingUploads()
            └─ Gets all recordings where uploaded === false
                 └─ For each pending recording:
                      ├─ uploadRecording() → success → markUploaded
                      └─ uploadRecording() → error → markUploadFailed
                           └─ Next reconnection retries failed ones again
```

---

## 14. Backend API Integration

### Configuration
The backend URL is set via `EXPO_PUBLIC_API_URL` environment variable (default: `http://localhost:8001`). For testing on physical devices via Expo Go, the LAN IP of the development machine must be used.

### API Endpoints Used

| Endpoint | Method | Auth | Body | Response | Purpose |
|---|---|---|---|---|---|
| `/api/auth/sync` | POST | Bearer Firebase ID Token | `{}` | `{ user: UserProfile }` | Verify user exists on backend and return role/profile |
| `/departments` | GET | Bearer Firebase ID Token | — | `{ departments: [...] }` | Fetch all departments for module tagging |
| `/departments/:id/semesters` | GET | Bearer Firebase ID Token | — | `{ semesters: [...] }` | Fetch semesters for a department |
| `/semesters/:id/subjects` | GET | Bearer Firebase ID Token | — | `{ subjects: [...] }` | Fetch subjects for a semester |
| `/subjects/:id/modules` | GET | Bearer Firebase ID Token | — | `{ modules: [...] }` | Fetch modules for a subject |
| `/api/audio/process-pipeline` | POST | Bearer Firebase ID Token | `multipart/form-data`: file + topic + moduleId | 200 OK or error | Upload audio for AI processing |

### Audio Upload Payload
```typescript
FormData {
  file: {              // Blob pointing to local audio file
    uri: filePath,     // file:///... path to audio file
    name: 'recording.m4a',
    type: 'audio/mp4'
  },
  topic: string,       // Lecture title
  moduleId?: string    // Optional module association
}
```

---

## 15. Authentication & Authorization Flow

### Two-Layer Auth System

```
Layer 1: Firebase Authentication
  └─ Email/password sign-in
  └─ Persists session on device (automatic re-auth on restart)
  └─ Provides ID tokens for API calls

Layer 2: Backend Role Verification
  └─ POST /api/auth/sync with Firebase ID token
  └─ Backend verifies token and returns UserProfile with role
  └─ App blocks access if role != 'staff' && role != 'admin'
  └─ Allows access if backend unreachable (offline mode)
```

### Security Properties
- Firebase ID tokens expire after 1 hour but are automatically refreshed by the Firebase SDK
- The mobile app relies on Firebase's session persistence (AsyncStorage-backed) so users stay logged in across app restarts
- The backend `/api/auth/sync` call acts as a **role gate** — Firebase auth proves identity, the backend proves authorization

---

## 16. Offline-First Design

The app is designed to remain functional without network connectivity:

### What Works Offline
| Feature | Offline Behavior |
|---|---|
| **Recording** | Full functionality — audio capture is entirely local |
| **Playback** | Full playback of previously recorded content |
| **Viewing recordings** | All recordings stored locally are viewable |
| **Deleting recordings** | Full functionality |
| **Module tagging** | Falls back to 24-hour cache of hierarchy data |
| **Login** | Uses Firebase's cached session (no sync with backend) |

### What Requires Network
| Feature | Offline Behavior |
|---|---|
| **Uploading recordings** | Queued locally, auto-retried on reconnect |
| **Fresh module data** | Falls to cache; if cold cache is empty, shows offline banner |
| **Login (new session)** | Firebase can restore from cache even without network |

### Auto-Recovery Mechanism
The `@react-native-community/netinfo` subscription fires on every connectivity change. When the `isInternetReachable` flag becomes `true`, the app:
1. Calls `processPendingUploads()` to flush the upload queue
2. Refreshes the recordings list to reflect any status changes
3. Errors from individual uploads are caught and don't block the queue

---

## 17. Audio Recording Lifecycle

### Complete Lifecycle Walkthrough

**Phase 1: Recording Start**
1. User enters title and taps "Record"
2. `useRecorder.start()` requests microphone permission (first time only)
3. `useAudioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY)` initializes
4. `useAudioRecorder.record()` begins capturing to a temp file
5. Timer starts (500ms interval updates)
6. Record button pulses (scale animation 1.0 ↔ 1.15)

**Phase 2: Pausing (Optional)**
1. User taps "Pause"
2. Accumulated duration saved in `pausedDurationRef`
3. Timer interval cleared
4. Button changes to "Resume"

**Phase 3: Recording Stop**
1. User taps "Stop & Save"
2. `useAudioRecorder.stop()` finalizes the recording
3. Final duration computed from accumulated + current interval
4. Temp file URI returned from recorder
5. Timer cleared, state → "stopped"

**Phase 4: Saving**
1. `recordingStorage.saveRecording(tempUri, title, durationMs, moduleId, moduleName)`
2. Extension detected from source URI
3. New permanent path: `documentDirectory/aura_recordings/recording-{UUID}.{ext}`
4. File copied from temp to permanent location
5. Metadata object created with UUID, timestamps, upload status
6. Metadata prepended to AsyncStorage array (newest first)
7. Auto-export to SAF folder triggered (Android only)

**Phase 5: Uploading**
1. `uploadQueue.uploadRecording(id, filePath, title, moduleId, user)`
2. If online: POST multipart form to backend, mark uploaded on success
3. If offline: recording stays with `uploaded: false`, auto-retried later

---

## 18. File Storage & Export System

### Internal Storage
```
documentDirectory/
└── aura_recordings/
    ├── recording-{UUID-1}.m4a
    ├── recording-{UUID-2}.caf
    └── recording-{UUID-3}.m4a
```

Files are stored in the app's sandboxed `documentDirectory`, which is:
- Not accessible by other apps
- Preserved across app restarts
- Subject to platform-specific location (Android: app data dir, iOS: Documents)

### External Export (Android Only)
```
User's Phone (via SAF):
└── Lecture Recordings/
    ├── Introduction to Neural Networks - 2024-01-15.m4a
    ├── Data Structures Lecture - 2024-01-16.m4a
    └── Quantum Computing Intro - 2024-01-17.m4a
```

The export is a **copy**, not a move — the original file remains in the app's sandbox. This allows the app to maintain control over the files (playback, upload) while making them accessible through the phone's file manager.

### Storage Cleanup Strategy
- **Deletion**: When a recording is deleted from the app, both the file and metadata are removed
- **Upload marking**: Uploaded recordings keep their files on device (not deleted on upload) — this is a design choice to allow re-upload if needed

---

## 19. Caching Strategy

### Hierarchy Cache
| Property | Value |
|---|---|
| **Storage** | AsyncStorage (key: `aura_hierarchy_cache`) |
| **TTL** | 24 hours |
| **Invalidation** | Time-based only; no manual refresh trigger provided (TTL-based) |
| **Structure** | Nested object: `{ departments, semesters, subjects, modules, cachedAt }` |
| **Population** | Progressive — each level cached as it's fetched |

Cache hit → return from storage. Cache miss or expired → fetch from API → cache → return.

This approach means the academic hierarchy can be up to 24 hours stale, which is acceptable for a university system where departments, semesters, and modules change infrequently.

---

## 20. Network Connectivity Handling

### Implementation
```
NetInfo.addEventListener() subscription
  └─ Emits state: { isConnected, isInternetReachable }
       └─ Online when BOTH are truthy
            └─ Triggers processPendingUploads()
            └─ Updates isOnline state (UI pill)
```

### Connection States
| State | `isConnected` | `isInternetReachable` | App Behavior |
|---|---|---|---|
| Full online | true | true | Normal operation, auto-upload |
| Connected but no internet | true | false | Treat as offline |
| No connection | false | false | Offline mode |
| Unknown | null | null | Treated as offline |

The "Offline" pill is displayed in the recordings section header when not online.

---

## 21. UI Design System

### Color Palette
| Token | Value | Usage |
|---|---|---|
| `primary` | `#FFD400` | Buttons, accents, progress bars, brand color |
| `primaryHover` | `#E6BF00` | Hover states (limited use on mobile) |
| `bgPrimary` | `#0a0a0a` | Main background |
| `bgSecondary` | `#111111` | Card backgrounds |
| `bgTertiary` | `#1a1a1a` | Input backgrounds |
| `textPrimary` | `#ffffff` | Primary text |
| `textSecondary` | `#b0b0b0` | Secondary text, labels |
| `textMuted` | `#666666` | Placeholder text, timestamps |
| `border` | `#2a2a2a` | Borders, dividers |
| `error` | `#ef4444` | Record button, errors, validation |
| `success` | `#22c55e` | Upload success badges |
| `warning` | `#f59e0b` | Offline pills, upload error indicators |

### Typography
- System default font for regular text
- Monospace (`monospace` on Android, `Courier` on iOS) for timers and timestamps
- Font weights: 200 (timer), 400 (regular), 600 (titles), 700 (headings/bold), 800 (app name)

### Spacing Scale
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

### Border Radius
```
sm: 8px   (inputs, buttons, small elements)
md: 12px  (minor containers)
lg: 16px  (cards, main containers)
full: 9999 (circular elements, record button, badges)
```

### Design Theme
The dark theme (`#0a0a0a` background with `#FFD400` yellow accent) matches the AURA web admin panel, providing visual consistency across the platform.

---

## 22. Design Patterns & Architectural Decisions

### 1. Container/Presentational Pattern (Variation)
- **Container**: Hooks (`useAuth`, `useRecorder`) manage state and side effects
- **Presentational**: Screens and components render based on hook outputs
- Separation of concerns: no data fetching in components, no UI in hooks

### 2. Repository Pattern (Local-First)
- `recordingStorage.ts` acts as a repository layer, abstracting AsyncStorage + FileSystem
- Components call `getAllRecordings()` and `saveRecording()` without knowing the storage mechanism
- Enables future replacement of storage backend without touching UI code

### 3. Fire-and-Forget Pattern
- Auto-export after recording save (`.catch(() => {})`)
- Auto-upload after recording stop (try/catch with silent failure)
- These operations are non-blocking and fail gracefully

### 4. Event-Driven Sync
- NetInfo subscription triggers upload queue processing
- No polling or manual refresh needed
- Reactive rather than proactive sync

### 5. Conditional Rendering for Auth
- Single navigator with conditional screen injection
- No stack navigation between login and recorder
- Ensures clean state: unmounting recorder screen releases all recorder resources

### 6. Optimistic Local Storage
- Recordings are saved locally first, upload is secondary
- App never loses data due to server unavailability
- Upload status is eventually consistent (retries until success)

### Why No Global State Manager?
The app's scope is limited (two screens, one primary flow). React's built-in state management with custom hooks provides sufficient state sharing through props. Adding Redux/Zustand would introduce dependency overhead without proportional benefit.

### Why Firebase Compat Mode?
The `firebase/compat` SDK is used for easier migration from web-based Firebase code. The compat API provides the same interface as the web SDK, making it familiar for developers who worked on the web admin panel.

---

## 23. Platform Considerations

### Android-Specific Features
- **SAF Export Folder**: Uses `FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()` for persistent folder access
- **Keyboard Avoidance**: Uses `behavior="height"` (vs "padding" on iOS)
- **Top Padding**: Uses `Spacing.lg` (vs 56px on iOS for the notch)
- **Monospace Font**: Uses `'monospace'` (vs 'Courier' on iOS)
- **Picker Display**: Uses native Android dialog with dark text color

### iOS Considerations
- **Keyboard Avoidance**: Uses `behavior="padding"`
- **Top Padding**: Fixed 56px for notch
- **Monospace Font**: Uses `'Courier'`
- **Picker Display**: Uses inline UIPickerView
- **No SAF Export**: `Platform.OS !== 'android'` guards disable export service

### Expo Managed Workflow
The app uses Expo's managed workflow (evidenced by `expo start` scripts and absence of `android/` and `ios/` native directories). This means:
- No direct native module access beyond Expo SDK APIs
- Build process uses EAS (Expo Application Services) or `expo prebuild`
- OTA updates available through EAS Update

---

## 24. Error Handling Strategy

### Graceful Degradation Hierarchy
1. **Non-critical failures** (export, sync) → silently caught, logged to `console.warn`
2. **Critical but recoverable** (upload failure) → marked with error, retry scheduled
3. **Critical and blocking** (recording failure) → user-facing alert, recording attempt abandoned
4. **Auth failures** → translated to user-friendly messages, no technical details exposed

### Error Boundaries
The app does not use React Error Boundaries. Error handling is done at the point of use (try/catch in individual functions), which is a pragmatic choice for an app of this size.

### Network Error Strategy
- **Login**: Friendly messages for common error codes (invalid credentials, too many attempts, no network)
- **Recording save**: Alert dialog with error message (blocking, as data loss is at stake)
- **Upload**: Inline error badge on the recording card, no alert unless manual retry also fails

---

## 25. Security Considerations

### Authentication Security
- Firebase Auth handles password hashing, session management, token rotation
- Backend role verification prevents unauthorized access (staff-only gate)
- Firebase ID tokens used for all API calls (JWT, 1-hour expiry, auto-rotated)

### Data at Rest
- Audio files stored in app sandbox (not accessible by other apps)
- Metadata in AsyncStorage (encrypted on modern Android/iOS by default via OS-level encryption)
- Firebase SDK persists tokens using secure storage mechanisms

### Data in Transit
- All API calls use Bearer token authentication
- Backend URL should use HTTPS in production (currently HTTP for development)
- Firebase communication always uses HTTPS

### Environment Variables
- Firebase configuration stored in `.env` file (should not be committed to version control)
- Backend API URL configurable via environment variable for different deployment targets

### Known Concerns
- Firebase config keys are client-exposed by design (they are public identifiers, not secrets)
- The `.env` file contains Firebase credentials that should be kept private
- The backend API URL uses HTTP in development — should be switched to HTTPS for production

---

## 26. Environment Configuration

### Environment Variables

| Variable | Example Value | Purpose |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `AIzaSyA6...` | Firebase project API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `aura-auth-proj.firebaseapp.com` | Firebase Auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `aura-auth-proj` | Firebase project identifier |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `aura-auth-proj.firebasestorage.app` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `620508368222` | Firebase Cloud Messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `1:620508368222:web:***` | Firebase app identifier |
| `EXPO_PUBLIC_API_URL` | `http://10.57.186.178:8001` | Backend API base URL (LAN IP for device testing) |

### Setup Requirements
1. Firebase project created with Authentication (email/password) enabled
2. Backend API running and accessible at the configured URL
3. For physical device testing: `EXPO_PUBLIC_API_URL` set to the development machine's LAN IPv4 address

---

## 27. Build & Deployment

### Development Commands
```bash
npm install              # Install dependencies
npm start                # Start Expo dev server
npm run android          # Start + open on Android emulator/device
npm run ios              # Start + open on iOS simulator
npm run web              # Start + open in web browser
```

### Testing on Physical Device (Android)
1. Run `ipconfig` to find your machine's LAN IPv4 address
2. Set `EXPO_PUBLIC_API_URL=http://<your-ip>:8001` in `.env`
3. Run `npm start` and scan the QR code with Expo Go app
4. Ensure phone and development machine are on the same network

### Production Build
For a production standalone app, Expo EAS Build would be used:
```bash
eas build --platform android
eas build --platform ios
```
This compiles the app into an APK/AAB (Android) or IPA (iOS) that can be distributed without Expo Go.

---

*This document was generated for the AURA Staff Recorder mobile application — a final year project component. Version: 1.0.0. Technology: Expo SDK 54, React Native 0.81.5, TypeScript.*
