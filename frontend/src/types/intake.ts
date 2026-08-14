export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type SessionStatus = 'waiting' | 'in_review' | 'in_consultation' | 'completed' | 'expired';

export interface SymptomDetail {
  name: string;
  normalized_name: string;
  location?: string;
  duration?: string;
  severity?: string;
  onset?: string;
  certainty?: string;
}

export interface UrgencyAssessment {
  level: UrgencyLevel;
  reason: string;
  matched_rules?: string[];
}

export interface ClinicalIntake {
  chief_complaint: string;
  symptoms: SymptomDetail[];
  associated_symptoms: string[];
  duration: string;
  severity: string;
  body_location: string;
  onset: string;
  possible_symptom_categories: string[];
  urgency: UrgencyAssessment;
  missing_information: string[];
  confidence: number;
}

export interface EphemeralSession {
  sessionId: string;
  clinicId: string;
  status: SessionStatus;
  language: string;
  transcript: string;
  structuredIntake?: ClinicalIntake;
  urgency?: UrgencyAssessment;
  createdAt: string;
  expiresAt: string;
  token?: string;
}

export interface LanguageOption {
  code: string;       // BCP-47 code e.g. "hi-IN"
  name: string;       // Native script e.g. "हिंदी"
  englishName: string;// "Hindi"
  speechSupported: boolean;
  textSupported: boolean;
}
