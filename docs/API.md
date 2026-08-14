# VaaniDoc API Specification

## 1. Response Envelope Format
All REST API responses returned by the FastAPI backend conform to a standardized JSON response envelope.

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "requestId": "req_9876543210"
}
```

When an error occurs:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_AUDIO_FORMAT",
    "message": "Audio file must be WAV or WebM under 10 MB."
  },
  "requestId": "req_9876543210"
}
```

---

## 2. API Endpoints

### 2.1 Create Ephemeral Session
- **Endpoint:** `POST /api/session`
- **Description:** Initializes a new intake session.
- **Request Body:**
```json
{
  "clinicId": "clinic_123",
  "language": "hi-IN"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123xyz",
    "status": "waiting",
    "createdAt": "2026-08-12T17:30:00Z",
    "expiresAt": "2026-08-12T19:30:00Z"
  },
  "error": null,
  "requestId": "req_001"
}
```

### 2.2 Submit Patient Input (Text or Voice Audio)
- **Endpoint:** `POST /api/session/{sessionId}/input`
- **Content-Type:** `multipart/form-data`
- **Form Parameters:**
  - `input_type`: `"text"` | `"voice"`
  - `text`: String (optional, if text)
  - `audio`: File (optional, if voice, WAV/WebM/OGG format)
- **Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123xyz",
    "inputType": "voice",
    "transcript": "मुझे 3 दिन से तेज बुखार है और सिर दर्द हो रहा है",
    "language": "hi-IN"
  },
  "error": null,
  "requestId": "req_002"
}
```

### 2.3 Trigger AI Clinical Extraction
- **Endpoint:** `POST /api/session/{sessionId}/extract`
- **Description:** Runs Gemini structured extraction and urgency rule engine on transcript.
- **Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123xyz",
    "structuredIntake": {
      "chief_complaint": "High fever and headache for 3 days",
      "symptoms": [
        {
          "name": "Fever",
          "normalized_name": "Pyrexia",
          "location": "Systemic",
          "duration": "3 days",
          "severity": "High",
          "onset": "Acute",
          "certainty": "Confirmed"
        },
        {
          "name": "Headache",
          "normalized_name": "Cephalgia",
          "location": "Head",
          "duration": "3 days",
          "severity": "Moderate",
          "onset": "Acute",
          "certainty": "Confirmed"
        }
      ],
      "associated_symptoms": [],
      "duration": "3 days",
      "severity": "High",
      "body_location": "Head / General",
      "onset": "3 days ago",
      "possible_symptom_categories": ["Febrile Illness", "Infectious Syndrome"],
      "urgency": {
        "level": "MEDIUM",
        "reason": "High fever persisting for 3 days without red flag respiratory or cardiac signs."
      },
      "missing_information": ["Temperature reading", "Presence of chills or rigors"],
      "confidence": 0.92
    }
  },
  "error": null,
  "requestId": "req_003"
}
```

### 2.4 Get Session Details
- **Endpoint:** `GET /api/session/{sessionId}`
- **Description:** Retrieves current state of session for patient confirmation UI.
- **Response:** Standard session envelope.

### 2.5 List Active Doctor Sessions
- **Endpoint:** `GET /api/doctor/sessions?clinicId=clinic_123`
- **Headers:** `Authorization: Bearer <Firebase_ID_Token>`
- **Description:** Fetches all non-expired, active sessions for clinic queue.
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "sess_abc123xyz",
      "status": "waiting",
      "language": "hi-IN",
      "transcript": "मुझे 3 दिन से तेज बुखार है...",
      "urgency": { "level": "MEDIUM", "reason": "High fever..." },
      "createdAt": "2026-08-12T17:30:00Z"
    }
  ],
  "error": null,
  "requestId": "req_004"
}
```

### 2.6 Update Session Status
- **Endpoint:** `PATCH /api/session/{sessionId}/status`
- **Headers:** `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body:**
```json
{
  "status": "in_consultation"
}
```
- **Response:** Updated session envelope.

### 2.7 Explicit Session Deletion
- **Endpoint:** `DELETE /api/session/{sessionId}`
- **Headers:** `Authorization: Bearer <Firebase_ID_Token>` (or patient session token)
- **Description:** Immediately purges session document from Firestore and invalidates cache.
- **Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123xyz",
    "deleted": true,
    "purgedAt": "2026-08-12T17:45:00Z"
  },
  "error": null,
  "requestId": "req_005"
}
```
