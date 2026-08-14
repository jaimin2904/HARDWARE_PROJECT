# VaaniDoc Step-by-Step Development Roadmap

## Phase Overview & Execution Strategy
This roadmap details the 20 implementation steps required to build, test, secure, evaluate, and deploy VaaniDoc for the GDG Hackathon.

---

## Step-by-Step Task Breakdown

### STEP 1: Repository Architecture & Directory Initialization
- Create clean monorepo structure with `frontend/`, `backend/`, `docs/`, `evaluation/`, and shared configuration files.
- Deliverables: Core directory structure, root `package.json`, `README.md`.

### STEP 2: Frontend Foundation Setup
- Initialize React + TypeScript + Vite + Tailwind CSS PWA scaffold in `frontend/`.
- Establish color tokens, typography (Inter/Outfit), dark/light theme, layout shells.
- Deliverables: Working Vite frontend dev server with design tokens and router setup.

### STEP 3: Backend Foundation Setup
- Initialize Python FastAPI application in `backend/`.
- Configure `config.py` for environment variables, CORS, rate limiting, and logging.
- Deliverables: Runnable FastAPI app returning `/health` and request envelope middleware.

### STEP 4: Patient UI Workflow Implementation
- Build patient screens: Welcome, Language Selection Grid, Privacy Consent, Voice/Text Input, Recording State, Preview, AI Processing, Confirmation, and Session End.
- Deliverables: Mobile-first responsive Patient UI with full navigation flow and mock state.

### STEP 5: Doctor Dashboard UI Implementation
- Build Doctor UI: Auth Login, Dashboard Layout, Waiting Patient Queue, Structured Intake Form View, Urgency Indicators, Missing Info Callouts, and Action Buttons.
- Deliverables: Info-dense Doctor Dashboard UI displaying mock clinical intake sessions.

### STEP 6: Core REST API Integration
- Implement FastAPI routes: `POST /api/session`, `POST /api/session/{id}/input`, `GET /api/session/{id}`, `DELETE /api/session/{id}`.
- Connect frontend `api.ts` service to backend endpoints.
- Deliverables: Complete client-server session creation and transmission lifecycle.

### STEP 7: Firebase Authentication Setup
- Integrate Firebase Auth into frontend for Doctor login/logout.
- Configure auth state providers and protected routes (`/doctor/*`).
- Deliverables: Secure doctor sign-in flow powered by Firebase Auth.

### STEP 8: Ephemeral Session & Data Deletion Lifecycle
- Implement backend session lifecycle service with TTL expiration targets.
- Create explicit session deletion handler on consultation completion.
- Deliverables: Fully verified ephemeral data lifecycle with zero data persistence.

### STEP 9: Speech Recognition Provider Abstraction
- Define abstract `SpeechRecognitionProvider` interface.
- Implement `MockSpeechProvider`, `GoogleCloudSpeechProvider`, and `AI4BharatProvider` adapters.
- Deliverables: Pluggable ASR architecture with runtime provider selection.

### STEP 10: Speech-to-Text Audio Integration
- Implement client-side microphone capture (`MediaRecorder` API) and audio compression.
- Wire backend `/api/session/{id}/transcribe` to ASR orchestrator and immediate audio file cleanup.
- Deliverables: Functional voice recording to native transcript pipeline.

### STEP 11: Gemini Structured Extraction Service
- Integrate Gemini 1.5 API using Pydantic schema constraints.
- Implement system prompt, translation, symptom extraction, and error retry logic.
- Deliverables: Robust LLM extraction pipeline converting regional text into structured `ClinicalIntake` JSON.

### STEP 12: Hybrid Urgency Engine Integration
- Implement rule-based keyword safety triggers for cardiac, respiratory, and neurological flags.
- Reconcile rule floor with Gemini model output.
- Deliverables: Deterministic, safe urgency triage engine (LOW/MEDIUM/HIGH/EMERGENCY).

### STEP 13: Firestore Realtime Sync to Doctor Dashboard
- Wire backend to write structured sessions to Cloud Firestore.
- Implement Firestore realtime snapshot listeners (`onSnapshot`) in Doctor Dashboard.
- Deliverables: Instantaneous session streaming from patient submission to doctor queue.

### STEP 14: Offline PWA & Low-Bandwidth Optimization
- Configure Service Worker for app shell caching.
- Build IndexedDB request queue with background retry for offline submission.
- Add live Bandwidth Demo Monitor panel.
- Deliverables: Sub-100 KB/s operable PWA with offline resilience.

### STEP 15: Privacy Hardening & Ephemeral Audit
- Implement strict memory buffer cleanup for audio.
- Filter out medical data from server logs.
- Add patient consent disclosure modal.
- Deliverables: Complete zero-retention privacy hardening.

### STEP 16: Security Hardening & App Check
- Configure Firestore Security Rules restricting clinic data access.
- Enable Firebase App Check for API and Firestore access verification.
- Implement prompt injection sanitization.
- Deliverables: Security-hardened system protected against unauthorized access and prompt manipulation.

### STEP 17: 20-Case AI Accuracy Benchmark Execution
- Create `evaluation/dataset_20_cases.json` containing 20 pre-defined test cases across 9 Indian languages.
- Build `evaluate_benchmark.py` scoring script measuring Precision, Recall, F1, and Urgency Accuracy.
- Deliverables: Benchmark execution report and accuracy score card.

### STEP 18: Performance & Low-Bandwidth Tuning
- Compress bundle sizes, lazy load route components, optimize asset loading.
- Validate performance under throttled 2G network profile (sub-100 KB/s).
- Deliverables: Verified low-bandwidth compliance report.

### STEP 19: Deployment Setup
- Configure Dockerfile and scripts for FastAPI backend deployment to Cloud Run.
- Configure Firebase Hosting deployment for React frontend.
- Deliverables: Automated deployment scripts and live production URLs.

### STEP 20: Final QA & Demo Preparation
- Run end-to-end user testing flows for Patient and Doctor interfaces.
- Prepare live demo script, judge Q&A defense, and bandwidth panel verification.
- Deliverables: Production-ready VaaniDoc system ready for hackathon demonstration.
