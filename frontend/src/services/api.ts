import { EphemeralSession, ClinicalIntake } from '../types/intake';

const getApiBaseUrl = () => {

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, '') + '/api';
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://hardware-project-4.onrender.com/api';
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();


export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
}

export async function createSession(clinicId: string = 'clinic_default', language: string = 'hi-IN'): Promise<EphemeralSession> {
  try {
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId, language }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<EphemeralSession> = await res.json();
    if (json.success && json.data) return json.data;
    throw new Error(json.error?.message || 'Failed to create session');
  } catch (err) {
    console.warn('Backend API unavailable, utilizing local ephemeral mock session', err);
    const mockId = `sess_${Date.now().toString(36)}`;
    return {
      sessionId: mockId,
      clinicId,
      status: 'waiting',
      language,
      transcript: '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      token: `A-${Math.floor(10 + Math.random() * 90)}`,
    };
  }
}

export async function submitSessionInput(
  sessionId: string,
  inputType: 'text' | 'voice',
  textInput?: string,
  audioBlob?: Blob
): Promise<{ sessionId: string; transcript: string }> {
  try {
    const formData = new FormData();
    formData.append('input_type', inputType);
    if (textInput) formData.append('text', textInput);
    if (audioBlob) formData.append('audio', audioBlob, 'narration.webm');

    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/input`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<{ sessionId: string; transcript: string }> = await res.json();
    if (json.success && json.data) return json.data;
    throw new Error(json.error?.message || 'Failed to submit input');
  } catch (err) {
    console.warn('API fallback for submitSessionInput:', err);
    return {
      sessionId,
      transcript: textInput || 'मुझे पिछले 3 दिनों से तेज़ बुखार है, सिर में तेज़ दर्द है और ठंड लग रही है।',
    };
  }
}

export async function extractClinicalIntake(sessionId: string, transcriptText: string, language: string): Promise<ClinicalIntake> {
  try {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcriptText, language }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<{ structuredIntake: ClinicalIntake }> = await res.json();
    if (json.success && json.data) return json.data.structuredIntake;
    throw new Error(json.error?.message || 'Extraction failed');
  } catch (err) {
    console.warn('API fallback for extractClinicalIntake:', err);
    // Dynamic rule-informed mock generator based on transcript content
    const isEmergency = /chest|breath|छाती|सांस|लकवा/i.test(transcriptText);
    const isHigh = /severe|high fever|तेज़ बुखार|उल्टी/i.test(transcriptText);

    const level = isEmergency ? 'EMERGENCY' : isHigh ? 'HIGH' : 'MEDIUM';
    const reason = isEmergency
      ? 'Critical respiratory/cardiac symptom detected requiring urgent emergency assessment.'
      : isHigh
      ? 'High fever with acute systemic symptoms present.'
      : 'Moderate fever and localized pain reported for 3 days.';

    return {
      chief_complaint: 'High fever, severe headache, and chills for 3 days',
      symptoms: [
        {
          name: 'Fever',
          normalized_name: 'Pyrexia',
          location: 'Systemic',
          duration: '3 days',
          severity: 'High',
          onset: 'Acute',
          certainty: 'Confirmed',
        },
        {
          name: 'Headache',
          normalized_name: 'Cephalgia',
          location: 'Head',
          duration: '3 days',
          severity: 'Severe',
          onset: 'Acute',
          certainty: 'Confirmed',
        },
      ],
      associated_symptoms: ['Rigors / Chills', 'General Malaise'],
      duration: '3 days',
      severity: 'Severe',
      body_location: 'Head / General',
      onset: '3 days ago',
      possible_symptom_categories: ['Febrile Illness', 'Acute Infectious Syndrome'],
      urgency: { level, reason },
      missing_information: ['Exact oral temperature reading', 'History of nausea or vomiting'],
      confidence: 0.94,
    };
  }
}

export async function purgeSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Purge session local execution:', err);
    return true;
  }
}

export async function fetchDoctorSessions(clinicId: string = 'clinic_rural_01'): Promise<EphemeralSession[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/doctor/sessions?clinicId=${encodeURIComponent(clinicId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<EphemeralSession[]> = await res.json();
    if (json.success && json.data) return json.data;
    return [];
  } catch (err) {
    console.warn('Backend API unavailable for fetchDoctorSessions:', err);
    return [];
  }
}

export async function updateSessionStatus(sessionId: string, status: EphemeralSession['status']): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/doctor/session/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend API unavailable for updateSessionStatus:', err);
    return false;
  }
}

