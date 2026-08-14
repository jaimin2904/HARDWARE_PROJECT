# VaaniDoc Privacy Architecture & Ephemeral Session Specification

## 1. Core Privacy Philosophy: Zero Patient Data Retention
VaaniDoc is engineered from the ground up on the principle of **ephemeral sessions**. Patient medical transcripts and extracted intake summaries exist only for the immediate duration of the clinical intake and consultation.

---

## 2. Data Inventory & Retention Matrix

| Data Element | Storage Location | Lifetime | Purge Mechanism |
|---|---|---|---|
| **Raw Voice Audio** | Server memory / temp buffer (`/tmp/audio_*`) | Seconds (transcription processing time only) | Implemented explicit `os.remove()` immediately after ASR pipeline completes. |
| **Regional Transcript** | Firestore `sessions/{sessionId}` | Ephemeral (Until consultation end or max 2 hours) | Explicit DELETE call on doctor consult completion OR Firestore TTL auto-purge. |
| **Structured Intake** | Firestore `sessions/{sessionId}` | Ephemeral (Until consultation end or max 2 hours) | Explicit DELETE call on doctor consult completion OR Firestore TTL auto-purge. |
| **Client Local Cache** | Browser IndexedDB / SessionStorage | Until submission success or tab close | Automated purge on HTTP 200 response or session completion. |
| **Application Logs** | Server stdout / Cloud Logging | Standard operational retention | **Strict Exclusion Rule:** Structured logging filters out all audio, transcript text, and symptom fields. Only metadata (`sessionId`, `requestId`, latency, status code) is logged. |

---

## 3. Ephemeral Session Lifecycle & Automated Deletion

```
┌─────────────────┐
│ Patient Submit  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Firestore Doc  │ ──► Sets 'expiresAt' = currentTime + 2 hours
└────────┬────────┘
         │
         ├───► Path A: Doctor clicks "Complete Consultation" ──► Triggers HTTP DELETE ──► Doc Purged Instantly
         │
         └───► Path B: Patient abandons or clinic closes     ──► Firestore TTL Engine ──► Doc Purged Automatically
```

---

## 4. Transparent Disclosure & Browser Limitations Notice
While VaaniDoc enforces strict zero-retention backend and database policies, we explicitly document inherent browser/OS limitations in our documentation and UI consent screen:
- **Client OS Memory & Clipboard:** The client browser may retain web page memory until JavaScript Garbage Collection runs.
- **Microphone Permissions:** Microphone access is active only while recording indicator is visible and revoked immediately upon capture termination.
- **Third-Party ASR APIs:** ASR processing with cloud providers uses zero-data-retention API configurations where available.
