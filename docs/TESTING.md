# VaaniDoc Testing & 20-Case Benchmark Evaluation Strategy

## 1. Testing Framework Overview
VaaniDoc enforces comprehensive automated and manual testing layers across backend services, frontend components, Firestore rules, and AI extraction accuracy.

```
┌─────────────────────────────────────────────────────────────┐
│                   TESTING & EVALUATION                      │
│                                                             │
│  ┌──────────────────────┐        ┌──────────────────────┐   │
│  │ Backend Unit & API   │        │ Frontend Component   │   │
│  │ (pytest, httpx)      │        │ (Vitest, React TL)   │   │
│  └──────────────────────┘        └──────────────────────┘   │
│  ┌──────────────────────┐        ┌──────────────────────┐   │
│  │ Firestore Rules Test │        │ Ephemeral Data Purge │   │
│  │ (@firebase/rules-test│        │ Integration Test     │   │
│  └──────────────────────┘        └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  20-Case AI Accuracy Benchmark & Evaluation Pipeline │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 20-Case AI Accuracy Evaluation Benchmark

To satisfy PRD Hard Constraint FR-12, a dedicated benchmark dataset containing 20 curated test cases across 9 Indian languages + English is pre-defined in `evaluation/dataset_20_cases.json`.

### 2.1 Test Case Matrix Breakdown

| Case ID | Language | Scenario / Complexity | Target Symptoms | Expected Urgency |
|---|---|---|---|---|
| **TC-01** | Hindi (hi-IN) | Simple fever & headache | Fever, Headache | MEDIUM |
| **TC-02** | Gujarati (gu-IN) | Acute chest pain radiating to arm | Chest Pain, Arm Numbness | EMERGENCY |
| **TC-03** | Marathi (mr-IN) | Chronic knee pain for 6 months | Knee Joint Pain | LOW |
| **TC-04** | Tamil (ta-IN) | Sudden severe breathlessness | Shortness of breath | EMERGENCY |
| **TC-05** | Telugu (te-IN) | Stomach ache after eating street food | Abdominal pain, Nausea | MEDIUM |
| **TC-06** | Bengali (bn-IN) | High fever with rash and body ache | Fever, Skin Rash, Myalgia | HIGH |
| **TC-07** | Kannada (kn-IN) | Cough & cold for 2 days | Cough, Rhinorrhea | LOW |
| **TC-08** | Malayalam (ml-IN)| Diarrhea and vomiting, mild dehydration | Loose stools, Vomiting | MEDIUM |
| **TC-09** | English (en-IN) | Routine blood pressure check request | Hypertension follow-up | LOW |
| **TC-10** | Hinglish | Mixed language: "Mujhe 2 din se fever hai and breathlessness feeling" | Fever, Breathlessness | HIGH |
| **TC-11** | Hindi (hi-IN) | Colloquial idioms: "छाती में पत्थर रखा जैसा लग रहा है" | Severe Chest Pressure | EMERGENCY |
| **TC-12** | Gujarati (gu-IN) | Diabetic foot ulcer with fever | Foot ulcer, Fever | HIGH |
| **TC-13** | Marathi (mr-IN) | Paediatric earache and crying | Otalgia, Crying | MEDIUM |
| **TC-14** | Tamil (ta-IN) | Sudden slurred speech and facial drooping | Facial weakness, Dysarthria | EMERGENCY |
| **TC-15** | Telugu (te-IN) | Burning micturition for 4 days | Dysuria, Frequency | MEDIUM |
| **TC-16** | Bengali (bn-IN) | Irrelevant extra talk + mild headache | Headache | LOW |
| **TC-17** | Kannada (kn-IN) | Incomplete narration: "pain in belly" | Abdominal pain | MEDIUM |
| **TC-18** | Hindi (hi-IN) | Asthma attack exacerbation | Wheezing, Severe Dyspnea | EMERGENCY |
| **TC-19** | Gujarati (gu-IN) | Mild skin allergy / itching | Pruritus, Rash | LOW |
| **TC-20** | Marathi (mr-IN) | High fever with rigors and disorientation | High Fever, Altered Sensorium | EMERGENCY |

---

## 3. Evaluation Metrics & Automated Scoring Script
The evaluation runner script (`backend/evaluation/evaluate_benchmark.py`) processes all 20 cases against the Gemini extraction pipeline and computes:

1. **Symptom Precision, Recall, & F1-Score:**
   $$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$
2. **Urgency Classification Accuracy:** Percentage of exact matches with ground truth urgency levels.
3. **Structured JSON Validity Rate:** Percentage of extractions conforming 100% to Pydantic schema without error.
4. **False Emergency Rate & Missed Emergency Rate:** Critical safety metrics tracking false alarms vs dangerous downgrades.

---

## 4. Session Deletion & Privacy Verification Test
An automated integration test verifies that calling `DELETE /api/session/{sessionId}`:
1. Instantly deletes the document in Cloud Firestore.
2. Returns a 404 on subsequent read requests.
3. Leaves zero leftover audio files in backend temporary directories.
