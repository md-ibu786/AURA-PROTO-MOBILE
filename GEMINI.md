<?xml version="1.0" encoding="UTF-8"?>
<!--
  GEMINI.md - AI Assistant Guide for AURA Staff Recorder PWA
  ===========================================================
  
  This file provides comprehensive guidance for AI assistants working on the AURA Staff Recorder PWA.
  All AI assistants MUST read and follow these guidelines before making any changes to the codebase.
  
  Version: 1.0
  Last Updated: 2026-02-22
-->

<guidelines>

  <!-- PROJECT OVERVIEW -->
  <project_overview>
    <name>AURA Staff Recorder (PWA)</name>
    <description>
      A Progressive Web App for university staff to record lectures directly from their phone
      and send the audio to the AURA-PROTO backend's audio-to-notes pipeline. The pipeline
      transcribes audio (Deepgram), refines the transcript (Gemini), generates structured notes
      (Gemini), and creates a PDF — all automatically.
    </description>
    <purpose>
      - Provide a mobile-friendly recording interface for staff
      - Eliminate the need for manual file uploads of lecture audio
      - Integrate with the existing AURA-PROTO audio processing pipeline
      - Allow module-level targeting via cascading dropdowns
      - Work as an installable PWA for lecture hall use
    </purpose>
    <relationship_to_aura_proto>
      This is a COMPANION app to AURA-PROTO. It does NOT have its own backend.
      It calls the AURA-PROTO backend API at the URL specified in VITE_API_URL.
      Authentication uses the SAME Firebase project as the admin panel.
      Only staff and admin users can access this app.
    </relationship_to_aura_proto>
  </project_overview>

  <!-- ARCHITECTURE -->
  <architecture>
    <framework>React + Vite + TypeScript</framework>
    <port>5174 (dev)</port>
    <base_url>http://localhost:5174</base_url>
    <styling>Vanilla CSS with CSS Variables (AURA theme)</styling>
    <state_management>React hooks (useState, useCallback, useEffect)</state_management>
    <auth>Firebase Auth (email/password) → /auth/sync for role check</auth>
    <audio>MediaRecorder API → WebM/Opus (Chrome) or MP4/AAC (Safari)</audio>
    <backend_dependency>AURA-PROTO FastAPI backend (port 8001)</backend_dependency>

    <key_directories>
      <directory path="src/config/" description="Firebase SDK initialization"/>
      <directory path="src/hooks/" description="Custom React hooks (auth, recorder)"/>
      <directory path="src/services/" description="API client for backend calls"/>
      <directory path="src/pages/" description="Full-page components (Login, Recorder)"/>
      <directory path="src/components/" description="Reusable UI components"/>
      <directory path="public/" description="Static assets, PWA manifest, service worker"/>
    </key_directories>
  </architecture>

  <!-- FILE MAP -->
  <file_map>
    <file path="src/config/firebase.ts" description="Firebase SDK init using VITE_ env vars"/>
    <file path="src/hooks/useAuth.ts" description="Firebase login + /auth/sync + staff-only enforcement"/>
    <file path="src/hooks/useRecorder.ts" description="MediaRecorder API wrapper: start/pause/resume/stop + timer"/>
    <file path="src/services/api.ts" description="Backend API: hierarchy fetchers + pipeline start/status"/>
    <file path="src/pages/LoginPage.tsx" description="Email/password login form"/>
    <file path="src/pages/RecorderPage.tsx" description="Main recording UI with full state machine"/>
    <file path="src/components/ModuleSelector.tsx" description="Cascading dropdown: Dept → Sem → Subject → Module"/>
    <file path="src/components/RecordingControls.tsx" description="Record/pause/stop buttons with live timer"/>
    <file path="src/components/PipelineStatus.tsx" description="Polling progress stepper for audio pipeline"/>
    <file path="src/App.tsx" description="Root component: auth routing (loading → login → recorder)"/>
    <file path="src/index.css" description="Global CSS design system matching AURA-PROTO theme"/>
    <file path="public/manifest.json" description="PWA manifest (standalone, portrait, dark theme)"/>
    <file path="public/sw.js" description="Service worker (network-first, skips API calls)"/>
  </file_map>

  <!-- DESIGN SYSTEM -->
  <design_system>
    <theme>Black + Cyber Yellow — matches the AURA-PROTO admin panel</theme>
    <colors>
      <color name="primary" value="#FFD400" usage="Accents, buttons, highlights"/>
      <color name="primary-hover" value="#E6BF00" usage="Button hover states"/>
      <color name="bg-primary" value="#0a0a0a" usage="Page backgrounds"/>
      <color name="bg-secondary" value="#111111" usage="Card backgrounds"/>
      <color name="bg-tertiary" value="#1a1a1a" usage="Input backgrounds"/>
      <color name="text-primary" value="#ffffff" usage="Headings, body text"/>
      <color name="text-secondary" value="#b0b0b0" usage="Labels, descriptions"/>
      <color name="text-muted" value="#666666" usage="Disabled text, footnotes"/>
      <color name="border" value="#2a2a2a" usage="Card borders, dividers"/>
      <color name="error" value="#ef4444" usage="Error messages, recording dot"/>
    </colors>
    <fonts>
      <font family="Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" usage="All text"/>
      <font family="Consolas, Monaco, monospace" usage="Timer display"/>
    </fonts>
    <important_rules>
      - ALL styling uses CSS variables defined in src/index.css
      - NO Tailwind CSS — this project uses vanilla CSS
      - Theme must match the AURA-PROTO admin panel exactly
      - Mobile-first responsive design
    </important_rules>
  </design_system>

  <!-- USER FLOW STATE MACHINE -->
  <user_flow>
    <description>
      RecorderPage.tsx manages a linear state machine:
      setup → recording → uploading → processing → success | error
    </description>
    <states>
      <state name="setup" description="Enter title, select module via cascading dropdowns"/>
      <state name="recording" description="Audio is being captured, timer running"/>
      <state name="uploading" description="Recording stopped, showing confirmation before upload"/>
      <state name="processing" description="Audio sent to pipeline, polling for status"/>
      <state name="success" description="Pipeline complete, showing PDF link"/>
      <state name="error" description="Pipeline failed, showing retry button"/>
    </states>
  </user_flow>

  <!-- BACKEND API CALLS -->
  <api_calls>
    <description>
      All API calls go to the AURA-PROTO backend (VITE_API_URL).
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
  </api_calls>

  <!-- ENVIRONMENT VARIABLES -->
  <environment_variables>
    <variable name="VITE_FIREBASE_API_KEY" required="true" description="Firebase Web API Key"/>
    <variable name="VITE_FIREBASE_AUTH_DOMAIN" required="true" description="Firebase Auth Domain"/>
    <variable name="VITE_FIREBASE_PROJECT_ID" required="true" description="Firebase Project ID"/>
    <variable name="VITE_FIREBASE_STORAGE_BUCKET" required="true" description="Firebase Storage Bucket"/>
    <variable name="VITE_FIREBASE_MESSAGING_SENDER_ID" required="true" description="Firebase Messaging Sender ID"/>
    <variable name="VITE_FIREBASE_APP_ID" required="true" description="Firebase App ID"/>
    <variable name="VITE_API_URL" required="true" description="AURA-PROTO backend URL (default: http://localhost:8001)"/>
  </environment_variables>

  <!-- IMPORTANT NOTES -->
  <important_notes>
    <note type="critical">
      This app has NO backend of its own. All data comes from the AURA-PROTO backend.
      The AURA-PROTO backend must be running for this app to function.
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
      CORS: The AURA-PROTO backend must include this app's origin in ALLOWED_ORIGINS.
      Development defaults already include localhost:5174.
    </note>
    <note type="important">
      Audio format: The MediaRecorder API outputs WebM (Chrome/Edge) or MP4 (Safari).
      The backend was updated to accept .webm files in ALLOWED_AUDIO_EXTENSIONS.
    </note>
  </important_notes>

  <!-- CODING CONVENTIONS -->
  <coding_conventions>
    <rule>Use TypeScript for all new files</rule>
    <rule>Use functional components with hooks</rule>
    <rule>Use CSS variables from index.css for all colors/spacing</rule>
    <rule>Use `type` keyword for type-only imports (verbatimModuleSyntax enabled)</rule>
    <rule>Keep components focused and single-responsibility</rule>
    <rule>Each component has a co-located .css file</rule>
    <rule>API calls always include Firebase auth token via getAuthHeaders()</rule>
  </coding_conventions>

  <!-- DEVELOPMENT COMMANDS -->
  <development_commands>
    <command action="Start dev server" cmd="npm run dev -- --port 5174"/>
    <command action="Build for production" cmd="npm run build"/>
    <command action="Type check" cmd="npx tsc -b"/>
    <command action="Preview production build" cmd="npm run preview"/>
  </development_commands>

</guidelines>
