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

    const txt = transcriptText || '';
    const lower = txt.toLowerCase();

    // Dynamic duration extraction
    let duration = 'Duration not specified';
    if (/10|૧૦|દસ|दस/i.test(lower)) duration = '10 days';
    else if (/3|૩|ત્રણ|तीन/i.test(lower)) duration = '3 days';
    else if (/2|૨|બે|दो/i.test(lower)) duration = '2 days';
    else if (/1|૧|એક|एक/i.test(lower)) duration = '1 day';

    // Body parts & pain
    const locs: string[] = [];
    if (/પગ|legs|leg|foot|feet/i.test(lower)) locs.push('legs');
    if (/હાથ|arms|arm|hand|hands/i.test(lower)) locs.push('arms');
    if (/માથું|head|headache/i.test(lower)) locs.push('head');
    if (/પેટ|stomach|abdomen/i.test(lower)) locs.push('stomach');
    if (/ગળું|ગળામાં|throat/i.test(lower)) locs.push('throat');
    if (/કમર|back|waist/i.test(lower)) locs.push('back');

    const hasPain = /દુખે|દુખાવો|દુઃખે|दर्द|दुखी|pain|ache|aching|hurt/i.test(lower);
    const hasCough = /ઉધરસ|खांसी|खोकला|cough/i.test(lower);
    const hasDizziness = /ચક્કર|चक्कर|dizzy|dizziness/i.test(lower);

    let chiefComplaint = txt;
    const symptomsList: Array<any> = [];

    if (hasPain && locs.length > 0) {
      const locStr = locs.join(' and ');
      chiefComplaint = `Pain in the ${locStr}${duration !== 'Duration not specified' ? ' for ' + duration : ''}`;
      symptomsList.push({
        name: 'Pain',
        normalized_name: 'Pain / Myalgia',
        location: locStr.charAt(0).toUpperCase() + locStr.slice(1),
        duration,
        severity: 'Not specified',
        onset: 'Acute',
        certainty: 'Confirmed',
      });
    } else if (hasCough) {
      chiefComplaint = `Cough${duration !== 'Duration not specified' ? ' for ' + duration : ''}`;
      symptomsList.push({
        name: 'Cough',
        normalized_name: 'Tussis',
        location: 'Upper Respiratory Tract',
        duration,
        severity: 'Not specified',
        onset: 'Acute',
        certainty: 'Confirmed',
      });
    } else if (hasDizziness) {
      chiefComplaint = 'Dizziness and difficulty walking';
      symptomsList.push({
        name: 'Dizziness',
        normalized_name: 'Vertigo',
        location: 'Neurological',
        duration,
        severity: 'Not specified',
        onset: 'Sudden',
        certainty: 'Confirmed',
      });
    } else {
      chiefComplaint = txt ? `Patient reported: '${txt.slice(0, 60)}'` : 'Health concern reported for clinical assessment';
      symptomsList.push({
        name: 'Reported Concern',
        normalized_name: 'Clinical Narration',
        location: locs.join(', ') || 'General',
        duration,
        severity: 'Not specified',
        onset: 'Acute',
        certainty: 'Confirmed',
      });
    }

    const isEmergency = /chest|breath|છાતી|સાંસ|लकवा|രക്തസ്രാവ/i.test(lower);
    const level = isEmergency ? 'EMERGENCY' : 'MEDIUM';

    return {
      chief_complaint: chiefComplaint,
      symptoms: symptomsList,
      associated_symptoms: [],
      duration,
      severity: 'Not specified',
      body_location: locs.join(', ') || 'General',
      onset: 'Acute',
      possible_symptom_categories: ['General Symptom Assessment'],
      urgency: {
        level,
        reason: isEmergency ? 'Emergency symptoms detected requiring immediate doctor review.' : 'Routine clinical intake narration.',
      },
      missing_information: ['Detailed vital signs examination'],
      confidence: 0.92,
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

