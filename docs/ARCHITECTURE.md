# VaaniDoc System Architecture Specification

## 1. System Overview
VaaniDoc is an AI-powered, multilingual health intake system designed specifically for rural and semi-urban Indian primary care clinics. It enables patients to narrate or type their health concerns in regional Indian languages, extracts structured clinical intake data using Gemini LLM with strict Pydantic schemas, evaluates urgency through a hybrid rule/AI triage engine, and streams structured intake forms in real time to doctors without permanently retaining patient medical data.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (PWA)                               │
│                                                                             │
│  ┌───────────────────────────────┐     ┌─────────────────────────────────┐  │
│  │     PATIENT INTERFACE         │     │        DOCTOR DASHBOARD         │  │
│  │ - Mobile-First UI             │     │ - Realtime Patient Queue        │  │
│  │ - Audio Recorder (WAV/WebM)   │     │ - Structured Intake View        │  │
│  │ - BCP-47 Language Selector    │     │ - Urgency Triage & Filters      │  │
│  │ - Patient Summary & Confirm   │     │ - Auth & Session Management     │  │
│  └──────────────┬────────────────┘     └────────────────┬────────────────┘  │
└─────────────────┼───────────────────────────────────────┼───────────────────┘
                  │ HTTPS / REST (Session & Audio)        │ Firebase SDK (Auth & Realtime Firestore)
                  ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICE (FastAPI)                           │
│                                                                             │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌────────────────┐ │
│  │   Session Controller   │  │   ASR Orchestrator    │  │ Extractor Svc  │ │
│  └───────────┬────────────┘  └───────────┬───────────┘  └───────┬────────┘ │
│              │                           │                      │          │
│              ▼                           ▼                      ▼          │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌────────────────┐ │
│  │ Privacy & TTL Engine   │  │ Speech Provider Registry││ Urgency Engine │ │
│  └────────────────────────┘  └───────────────────────┘  └────────────────┘ │
└─────────────────┬────────────────────────┬──────────────────────┬──────────┘
                  │                        │                      │
                  ▼                        ▼                      ▼
┌───────────────────────────┐ ┌──────────────────────────┐ ┌────────────────┐
│   FIREBASE / FIRESTORE    │ │      ASR PROVIDERS       │ │ GEMINI API 1.5 │
│ - Ephemeral Session Docs  │ │ - Google Speech-to-Text  │ │ Structured JSON│
│ - Security Rules & Auth   │ │ - AI4Bharat / Mock Svc   │ │ Schema Enforcement
└───────────────────────────┘ └──────────────────────────┘ └────────────────┘
```

## 2. Component Design & Responsibilities

### 2.1 Frontend (React + TypeScript + Vite + Tailwind CSS)
- **Patient SPA (`/patient/*`):** Step-by-step workflow designed for low-literacy users. Large touch targets, minimal text, clear audio feedback. Transient audio/text handling.
- **Doctor SPA (`/doctor/*`):** High-density, real-time dashboard powered by Firestore snapshot listeners. Displays patient waiting queue, urgency flags, original transcript alongside structured English extraction.
- **Shared PWA Shell:** Service Worker caching static assets (HTML/CSS/JS/Icons) for sub-100 KB/s loads; strict policy prohibiting caching of medical payloads or transcripts.

### 2.2 Backend (Python FastAPI)
- **Session Lifecycle Router:** Creates, fetches, updates, and deletes ephemeral session documents.
- **ASR Orchestrator:** Manages client audio streams, validates format/size, dispatches to provider via registry, deletes temp audio file instantly.
- **AI Extraction Pipeline:** Prompts Gemini 1.5 Flash/Pro with strict JSON schema, validates returned output against Pydantic model, handles errors and retries.
- **Urgency Engine:** Blends rule-based keyword safety triggers with model interpretations to assign LOW / MEDIUM / HIGH / EMERGENCY ratings.

### 2.3 Cloud & Storage Services
- **Firebase Auth:** Secure authentication for doctors and clinical staff.
- **Cloud Firestore:** Realtime database hosting short-lived session documents with automated TTL (Time-to-Live) policies.
- **Firebase App Check:** Ensures API endpoints and Firestore access originate exclusively from legitimate application instances.

## 3. Technology Justification

| Technology | Selection Rationale |
|---|---|
| **React + Vite** | Instant build speed, small bundle footprint, modular component model. |
| **FastAPI (Python)** | High-performance async runtime, direct integration with Pydantic for validation, native Python AI ecosystem support. |
| **Cloud Firestore** | Native realtime WebSocket synchronization to Doctor UI without managing socket servers; native TTL expiration for ephemeral data. |
| **Gemini Structured Output** | Guarantees response structure matching Pydantic/JSON schemas, reducing parsing failures to near-zero. |
| **Google Cloud Speech / Abstracted ASR** | Industry-standard speech-to-text accuracy across Indian languages (Hindi, Marathi, Gujarati, Tamil, Telugu, etc.). |

## 4. Key Architectural Decisions (ADRs)
1. **ADR-1: Ephemeral Data Lifecycle:** No relational DBs or persistent history. Data lives only in short-lived Firestore documents (TTL 1-2 hours) and memory. Explicit deletion on consultation end.
2. **ADR-2: Client-side Realtime DB Access via Firebase SDK:** Patient interactions flow through FastAPI (for AI processing), while Doctor UI reads from Firestore directly via secure Firebase SDK listeners.
3. **ADR-3: Decision Support, Not Medical Diagnosis:** The system explicitly labels outputs as "Symptom Categories" and "Decision Support Triage", prohibiting diagnostic claims.
4. **ADR-4: Provider Abstraction for ASR & AI:** All speech recognition and LLM interactions pass through interface abstractions, permitting runtime fallback to mock providers during offline testing or vendor outages.
