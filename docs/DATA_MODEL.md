# VaaniDoc Data Model & Schema Specification

## 1. Firestore Collections Architecture

```
clinics/{clinicId}
  ├── name: string
  ├── createdAt: timestamp
  └── config: object

doctors/{doctorId}
  ├── authUid: string
  ├── clinicId: string
  ├── displayName: string
  ├── email: string
  └── role: "doctor" | "admin"

sessions/{sessionId}
  ├── clinicId: string
  ├── status: "waiting" | "in_review" | "in_consultation" | "completed" | "expired"
  ├── language: string (BCP-47 code, e.g., "hi-IN", "mr-IN")
  ├── transcript: string (original regional text)
  ├── structuredIntake: ClinicalIntake (JSON object)
  ├── urgency: UrgencyAssessment
  ├── createdAt: timestamp
  ├── expiresAt: timestamp (TTL target)
  └── updatedAt: timestamp
```

---

## 2. Clinical Intake Schema (Pydantic / TypeScript Interface)

### 2.1 Symptom Detail Model
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class SymptomDetail(BaseModel):
    name: str = Field(description="Raw symptom name in English")
    normalized_name: str = Field(description="Standardized medical terminology")
    location: Optional[str] = Field(default=None, description="Anatomical location")
    duration: Optional[str] = Field(default=None, description="Duration of symptom")
    severity: Optional[str] = Field(default=None, description="Mild, Moderate, Severe, Unbearable")
    onset: Optional[str] = Field(default=None, description="Acute, Gradual, Sudden")
    certainty: Optional[str] = Field(default="Confirmed", description="Confirmed, Suspected, Denied")
```

### 2.2 Urgency Model
```python
class UrgencyAssessment(BaseModel):
    level: str = Field(description="LOW | MEDIUM | HIGH | EMERGENCY")
    reason: str = Field(description="Clinical justification for assigned urgency level")
    matched_rules: List[str] = Field(default_factory=list, description="Keywords or safety rules triggered")
```

### 2.3 Main Clinical Intake Model
```python
class ClinicalIntake(BaseModel):
    chief_complaint: str = Field(description="Primary concise symptom description in English")
    symptoms: List[SymptomDetail] = Field(default_factory=list, description="Extracted primary symptoms")
    associated_symptoms: List[str] = Field(default_factory=list, description="Secondary or related symptoms")
    duration: str = Field(description="Overall onset/duration")
    severity: str = Field(description="Overall severity assessment")
    body_location: str = Field(description="Primary anatomical regions involved")
    onset: str = Field(description="Onset characteristics")
    possible_symptom_categories: List[str] = Field(description="Broad clinical categories (NOT medical diagnoses)")
    urgency: UrgencyAssessment = Field(description="Assigned urgency level and reason")
    missing_information: List[str] = Field(default_factory=list, description="Unclear or unmentioned clinical details")
    confidence: float = Field(ge=0.0, le=1.0, description="Overall AI extraction confidence score")
```

---

## 3. Session Lifecycle State Machine

```
   [Patient Starts Intake]
             │
             ▼
        ( waiting )  ◄─── Written to Firestore & trigger Doctor Dashboard real-time update
             │
             ├───────────────────────┐
             ▼                       ▼
      ( in_review )         ( abandoned / timeout )
             │                       │
             ▼                       ▼
    ( in_consultation )         ( expired ) ──► Automatically deleted by Firestore TTL
             │                       │
             ▼                       │
        ( completed ) ───────────────┴──► Purged instantly via DELETE /api/session/{id}
```

---

## 4. Privacy & Anonymity Constraints
- **Zero Patient Identifiers:** Sessions do NOT store patient names, phone numbers, Aadhaar numbers, or addresses.
- **Token-Based Desk Identification:** Sessions are bound to a short token/code displayed to the patient (e.g., "Token #A-14").
- **No Media Retention:** Audio binary payloads are parsed purely in memory/temp buffer and erased immediately after ASR execution.
