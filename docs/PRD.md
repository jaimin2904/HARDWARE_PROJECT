# VaaniDoc — Product Requirements Document (PRD)
### Multilingual AI Health Intake System for Rural & Semi-Urban Indian Clinics

**Track:** Social Impact & Inclusion (PS-03)  
**Version:** 1.0  
**Status:** Draft for Hackathon Build  
**Owner:** Yug  

---

## 1. Executive Summary

VaaniDoc is a mobile-first, low-bandwidth, privacy-first web application that lets patients in rural and semi-urban Indian clinics describe their symptoms by **voice or text in their own regional language**. The system transcribes the speech, extracts clinically relevant information using an LLM (Gemini) with a strict JSON schema, assigns a rule-informed urgency level, and pushes a structured English intake form in real time to a doctor's dashboard — without permanently storing any patient data.

**Core value proposition:** Doctors save the 30–40% of consultation time currently lost to manual intake and translation friction; patients who can't read/write English or navigate complex forms can just talk.

---

## 2. Problem Statement (as given)

Rural/semi-urban clinics face:
- Doctors spending 30–40% of consult time on paperwork.
- Patients unable to communicate symptoms due to language/literacy barriers.

**Build:** An AI-powered health intake system where patients narrate symptoms in any Indian regional language (voice/text) → system auto-generates a structured clinical intake form in English, including possible symptom categories and urgency classification, visible simultaneously to the doctor.

### Hard Constraints (Judging Criteria)
| Constraint | Requirement |
|---|---|
| Language coverage | Majority of Indian languages supported |
| Bandwidth | Must function under 100 KB/s |
| Privacy | No patient data retained after session ends |
| Accuracy | Validated against ≥20 manually created test cases |
| Platform | Mobile-first web app |
| Realtime | Doctor dashboard updates simultaneously |

---

## 3. Goals & Non-Goals

### Goals
- Voice/text symptom capture in Indian regional languages.
- Accurate, explainable structured extraction (not diagnosis).
- Rule-informed urgency triage (LOW / MEDIUM / HIGH / EMERGENCY).
- Real-time doctor dashboard.
- Demonstrable offline/low-bandwidth resilience.
- Demonstrable privacy-by-design (ephemeral sessions).
- Reproducible 20-case accuracy benchmark.

### Non-Goals (explicitly out of scope for hackathon build)
- Medical diagnosis or treatment recommendation.
- EHR/EMR integration, insurance, billing.
- Long-term patient history or longitudinal records.
- Regulatory compliance claims (HIPAA/DPDP certification) — architecture is *designed toward* privacy principles, not certified.
- Prescription or medication management.

---

## 4. Personas

**1. Patient — Rural/semi-urban, variable literacy**  
Speaks a regional language, may have a low-end Android phone, unreliable 2G/3G network, uncomfortable with English forms. Needs: minimal reading, one clear action at a time, reassurance this isn't a diagnosis.

**2. Doctor/Clinician — Primary care, high patient volume**  
Needs fast, structured, trustworthy pre-consult summaries; must be able to tell what's AI-generated vs. what's missing; needs urgency flags to triage queue.

**3. Clinic Admin (implicit, minimal in MVP)**  
Manages doctor accounts/clinic association (kept out of hackathon MVP scope beyond basic Firebase Auth).

---

## 5. User Flows

### 5.1 Patient Flow
1. Welcome screen (brand, trust signal, "not a diagnosis" notice)
2. Language selection (regional language grid, large touch targets)
3. Consent / privacy notice (plain language, session-based storage explained)
4. Voice or text input choice
5. Recording state (mic animation, live timer, cancel option)
6. Transcription preview (editable, confidence shown if low)
7. AI processing state (progress indicator, "extracting details")
8. Extracted symptom confirmation (patient-readable summary, edit/confirm)
9. Submit to doctor
10. Session completed screen ("A doctor will see you shortly")
11. Automatic/explicit session data deletion confirmation

### 5.2 Doctor Flow
1. Doctor login (Firebase Auth)
2. Dashboard — waiting patients list (urgency, language, wait time)
3. Open patient session
4. View structured clinical intake:
   - Original transcript (regional language) + English structured data
   - Extracted symptoms, duration, severity, location, onset
   - Possible symptom categories (explicitly not diagnosis)
   - Urgency indicator + reason
   - Missing information flags
5. Doctor review / annotate
6. Mark consultation started → completed
7. Session explicitly deleted (or auto-expires)

---

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Patient selects from a list of supported Indian languages |
| FR-2 | Patient can record voice input via microphone |
| FR-3 | Patient can type symptoms as text (fallback / preference) |
| FR-4 | System transcribes speech to text in the selected language |
| FR-5 | System extracts structured clinical fields via Gemini w/ JSON schema |
| FR-6 | System classifies urgency via rule-based + AI-assisted framework |
| FR-7 | System explicitly separates "symptom category" from "diagnosis" everywhere in UI/data |
| FR-8 | Doctor dashboard shows real-time incoming sessions (Firestore listeners) |
| FR-9 | Doctor can view original transcript alongside structured extraction |
| FR-10 | System deletes/expires session data after completion or timeout |
| FR-11 | System functions (degraded) under <100 KB/s and intermittently offline |
| FR-12 | System supports ≥20 reproducible evaluation test cases with scoring |

---

## 7. Non-Functional Requirements

- **Privacy:** ephemeral session model; no permanent PII/medical storage; explicit deletion path.
- **Performance:** app shell loads and is interactive on 2G/3G within a few seconds via caching; payloads minimized (text over audio wherever possible after ASR).
- **Reliability:** no duplicate session creation on network retry; graceful degradation on connectivity loss at every stage.
- **Accessibility:** large touch targets, high contrast, minimal text, iconography for low-literacy users, keyboard navigation on doctor dashboard.
- **Explainability:** every AI output traceable to transcript; confidence scores surfaced; missing-info explicitly flagged rather than hallucinated.
- **Maintainability:** provider-abstracted ASR and AI extraction layers; clean separation of routers/services/schemas.
- **Scalability (post-hackathon path):** stateless FastAPI on Cloud Run (horizontal autoscale), Firestore for realtime sync, provider abstraction allows swapping ASR/LLM vendors without touching business logic.

---

## 8. High-Level Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   PATIENT PWA (React)   │        │  DOCTOR DASHBOARD (React) │
│  Mobile-first, offline  │        │  Realtime, info-dense     │
└─────────────┬────────────┘        └─────────────┬─────────────┘
              │ REST (session, input)              │ Firestore listeners
              ▼                                     │ (via Firebase SDK,
    ┌─────────────────────┐                         │  secured by rules)
    │   FastAPI Backend    │                         │
    │  (Cloud Run)          │◄────────────────────────┘
    │  - session lifecycle  │        writes structured
    │  - ASR orchestration  │        session doc
    │  - extraction pipeline│
    └─────┬────────────┬───┘
          │            │
          ▼            ▼
 ┌────────────────┐ ┌────────────────────┐
 │ ASR Providers   │ │ Gemini Extraction   │
 │ (Google STT /   │ │ (structured JSON    │
 │ AI4Bharat /     │ │  output, urgency)   │
 │ Mock)           │ │                     │
 └────────────────┘ └────────────────────┘
          │
          ▼
 ┌─────────────────────────────┐
 │ Cloud Firestore (TTL/short-  │
 │ lived session documents)     │
 │ Firebase Auth + App Check     │
 └─────────────────────────────┘
```

**Flow:** Patient input → FastAPI → ASR provider (language-routed) → transcript → Gemini structured extraction → urgency computed → written to Firestore session doc → Doctor dashboard listener updates instantly → doctor reviews → session marked complete → data deleted/expired.

---

## 9. Component Architecture

### 9.1 Frontend (Patient + Doctor SPA, shared shell)
- **Router split:** `/patient/*` and `/doctor/*`
- **State:** local component state + lightweight session context; IndexedDB only for transient, non-sensitive queueing (e.g., pending submission when offline), cleared on success/cancel.
- **Services layer:** `api.ts` (REST calls), `firebase.ts` (auth + Firestore listeners), `speech.ts` (mic capture).
- **PWA:** service worker caches app shell + static assets; never caches medical payloads.

### 9.2 Backend (FastAPI, Cloud Run)
- **Routers:** `session`, `doctor`
- **Services:** `session_service`, `asr_service` (provider-abstracted), `extraction_service` (Gemini), `firestore_service`
- **Cross-cutting:** structured logging (no medical content), request IDs, rate limiting, centralized exception handling, CORS, env-based secrets.

### 9.3 AI/NLP Pipeline
1. Receive transcript + language + optional metadata.
2. Prompt Gemini with strict JSON schema (structured output mode).
3. Validate response against schema; retry on malformed output.
4. Apply rule-based urgency cross-check (keyword/symptom-flag rules) alongside model-assigned urgency; reconcile per documented framework (model cannot downgrade a rule-triggered EMERGENCY flag).
5. Return sanitized structured object — raw model response never sent directly to doctor UI.

### 9.4 Speech Recognition Pipeline
- Provider abstraction (`SpeechRecognitionProvider.transcribe(audio, language, options)`).
- Implementations: `GoogleCloudSpeechProvider`, `AI4BharatProvider`, `MockSpeechProvider`.
- Language registry maps BCP-47 codes → capable provider(s); frontend queries this to only display honestly-supported languages.
- Audio compressed client-side before upload; short chunks preferred; deleted server-side immediately after transcription.

---

## 10. Data Model

### 10.1 Firestore Structure
```
clinics/{clinicId}
  name, createdAt

doctors/{doctorId}
  clinicId, displayName, authUid

sessions/{sessionId}
  clinicId: string
  status: "waiting" | "in_review" | "in_consultation" | "completed" | "expired"
  language: string (BCP-47)
  transcript: string                  // original-language text
  structuredIntake: ClinicalIntake    // see schema below
  urgency: { level: string, reason: string }
  createdAt: timestamp
  expiresAt: timestamp                // TTL policy target
  updatedAt: timestamp
```
**Not stored:** raw audio (deleted after transcription), passwords, API keys, unnecessary identifiers (no name/phone required — session is pseudonymous, identified only by clinic-assigned token at the desk).

### 10.2 Clinical JSON Schema (Gemini structured output)
```json
{
  "chief_complaint": "",
  "symptoms": [
    {
      "name": "",
      "normalized_name": "",
      "location": "",
      "duration": "",
      "severity": "",
      "onset": "",
      "certainty": ""
    }
  ],
  "associated_symptoms": [],
  "duration": "",
  "severity": "",
  "body_location": "",
  "onset": "",
  "possible_symptom_categories": [],
  "urgency": { "level": "LOW|MEDIUM|HIGH|EMERGENCY", "reason": "" },
  "missing_information": [],
  "confidence": 0.0
}
```
**Safety rules baked into the extraction prompt:** never diagnose, never invent symptoms/history/medication/age/gender, preserve uncertainty, return `null`/flag missing info rather than fabricate, patient transcript treated as untrusted input (prompt-injection resistant — patient text cannot override system instructions).

---

## 11. API Specification

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/session` | Create new ephemeral session |
| POST | `/api/session/{id}/input` | Submit text or audio input |
| POST | `/api/session/{id}/transcribe` | Trigger ASR on submitted audio |
| POST | `/api/session/{id}/extract` | Trigger Gemini structured extraction |
| GET | `/api/session/{id}` | Fetch session (patient-side confirmation) |
| GET | `/api/doctor/sessions` | List active sessions for authenticated doctor's clinic |
| PATCH | `/api/session/{id}/status` | Update status (waiting → in_review → completed) |
| DELETE | `/api/session/{id}` | Explicit deletion |

All responses follow a consistent envelope: `{ "success": bool, "data": ..., "error": null | {code, message}, "requestId": "..." }`.

---

## 12. Privacy & Security Architecture

**Principle:** *Patient data must not be stored after the session ends.*

| Data | Where | Lifetime | Deletion trigger |
|---|---|---|---|
| Raw audio | Backend memory/temp disk | Seconds (during transcription only) | Immediately post-transcription |
| Transcript + structured intake | Firestore `sessions/{id}` | Until consultation completed or TTL expiry | Explicit `DELETE`, or scheduled expiry job |
| Session queue (offline) | Browser IndexedDB | Until successful submit or cancel | Cleared on success/cancel |
| Logs | Cloud logging | Operational retention only | Never contains transcript/medical content, only request IDs & status codes |

**Controls:** Firebase Authentication (doctors only) + Firestore Security Rules (clinic-scoped access, no patient-side arbitrary reads) + Firebase App Check (blocks unauthorized clients from Firestore/backend) + rate limiting + CORS + input validation on all endpoints + audio type/size validation + centralized exception handling that avoids leaking internals.

**Explicitly documented limitation:** a browser-based app cannot *guarantee* zero residual data (e.g., OS-level clipboard, screenshots, browser memory until GC) — this is disclosed rather than claimed away.

---

## 13. Low-Bandwidth / Offline Architecture

- Service worker caches app shell (HTML/CSS/JS) for offline-capable UI loading.
- Text preferred over audio wherever possible (transcript is text after ASR — only the initial audio upload is bandwidth-heavy, and it's compressed + short-chunked).
- Request queue with exponential backoff retry; idempotency keys prevent duplicate session creation on retry.
- Connectivity states explicitly handled: GOOD / POOR / NONE / LOST-DURING-SUBMISSION / LOST-AFTER-AI-PROCESSING — each with a defined UI state ("Waiting for connection," resumable submission).
- Bandwidth/payload measurement instrumented for live demo proof (shown as a small dev/demo panel).

---

## 14. Technology Stack & Justification

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | Fast dev velocity, small bundles, strong typing for clinical schema safety |
| PWA | Service Worker + IndexedDB (controlled) | Offline shell + safe transient queueing |
| Backend | Python + FastAPI | Async, Pydantic validation, fast to build securely in hackathon timeframe |
| ASR | Google Cloud Speech-to-Text + AI4Bharat (abstracted) | AI4Bharat targets Indian-language breadth; Google covers reliable majors — abstraction avoids over-claiming coverage |
| Extraction | Gemini API (structured JSON output) | Native schema-constrained output reduces hallucination risk |
| Realtime DB | Cloud Firestore | Realtime sync to doctor dashboard, TTL support |
| Auth | Firebase Authentication | Fast, secure doctor login |
| Protection | Firebase App Check | Blocks abuse of Firestore/backend from unauthorized clients |
| Deploy | Cloud Run (backend), Firebase Hosting (frontend) | Serverless, autoscaling, low ops overhead for a student team |

---

## 15. Folder Structure

**Frontend**
```
src/
  components/
  pages/
  layouts/
  hooks/
  services/
  lib/
  types/
  utils/
  styles/
  routes/
```

**Backend**
```
backend/
  app/
    main.py
    config.py
    api/
    models/
    schemas/
    services/
    ai/
    security/
    utils/
  tests/
```

---

## 16. Evaluation Strategy (20-Case Benchmark)

- Cases span Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Malayalam, Kannada, English, and mixed-language speech.
- Case types: simple, multi-symptom, colloquial, incomplete, ambiguous, repeated info, irrelevant speech, emergency-like, low-confidence.
- Each case pre-defines: input, expected symptoms, duration, severity, location, categories, urgency, missing info — **fixed before seeing model output** (no post-hoc adjustment).
- Metrics: symptom precision/recall/F1, urgency classification accuracy, JSON validity rate, false-emergency rate, missed-emergency rate.
- Output: automated scoring script + human-review sheet for qualitative spot checks.

---

## 17. Development Roadmap (Hackathon Timeline)

| Phase | Focus |
|---|---|
| 1 | Architecture finalization + Firestore schema + API contracts |
| 2 | Backend skeleton: session lifecycle, mock ASR/extraction providers, tests |
| 3 | Frontend patient flow against mock APIs (typed interfaces) |
| 4 | Frontend doctor dashboard with Firestore realtime listeners |
| 5 | Wire real ASR provider(s) + Gemini extraction, replace mocks |
| 6 | Privacy hardening: security rules, App Check, deletion/expiry jobs |
| 7 | Offline/low-bandwidth pass: service worker, retry/queue, compression |
| 8 | 20-case benchmark run + scoring + fixes |
| 9 | Security review pass (auth bypass, prompt injection, rate limiting) |
| 10 | Demo polish, elevator pitch, live demo script, judge Q&A prep |

---

## 18. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Over-claiming language support | Language capability table driven by actual provider coverage; frontend only shows honestly-supported languages |
| Gemini hallucination | Strict JSON schema + safety rules in prompt + confidence + missing-info fields + raw response never shown directly |
| Missed emergency case | Rule-based urgency floor cannot be downgraded by model; tracked via false/missed-emergency metrics |
| Demo network failure | Explicit low-bandwidth/offline states rehearsed; mock providers as fallback |
| Data leak / privacy failure | Ephemeral session design, security rules, App Check, no medical content in logs |
| Scope creep | Non-goals section enforced; no unnecessary microservices or features added |

---

## 19. Success Metrics (Demo/Judging)

- Functional patient→doctor flow in ≥5 Indian languages live.
- Sub-100 KB/s operable demo (proven via bandwidth panel).
- Zero patient data present in Firestore/logs after session deletion (shown live).
- ≥20-case benchmark report with F1/urgency-accuracy numbers presented.
- Clear, non-alarming UI that visibly separates "AI assistance" from "diagnosis."

---

*This PRD consolidates the architecture, UX, frontend, backend, speech, extraction, Firestore, offline, privacy, evaluation, security, and final-QA specifications into a single build-ready reference document for the VaaniDoc hackathon team.*
