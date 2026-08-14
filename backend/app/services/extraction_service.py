import json
import re
from typing import Dict, List, Any
from app.schemas.intake import ClinicalIntake, SymptomDetail, UrgencyAssessment
from app.services.urgency_engine import compute_rule_urgency, reconcile_urgency
from app.config import settings
from app.utils.logger import logger

class ExtractionService:
    def _build_chief_complaint(
        self,
        raw_complaint: Optional[str],
        symptoms: List[SymptomDetail],
        duration: str,
        transcript: str = ""
    ) -> str:
        dur_clean = duration if duration and duration not in ["Unspecified", "Unknown", "Duration not specified"] else ""
        generic_phrases = [
            "general discomfort",
            "reported symptoms for clinical evaluation",
            "symptoms reported",
            "general symptoms",
            "patient reported symptoms",
            "patient reported:"
        ]

        # 1. Use LLM raw complaint if valid and not generic fallback
        if raw_complaint and len(raw_complaint.strip()) > 3:
            complaint_lower = raw_complaint.lower()
            if not any(g in complaint_lower for g in generic_phrases):
                complaint_clean = raw_complaint.strip().rstrip('.')
                if dur_clean and dur_clean.lower() not in complaint_clean.lower():
                    return f"{complaint_clean} for {dur_clean}"
                return complaint_clean

        # 2. Build dynamically from extracted symptoms list
        if symptoms:
            pain_syms = [s for s in symptoms if s.name and s.name.lower() == "pain" and s.location]
            other_syms = [s for s in symptoms if s.name and s.name.lower() != "pain"]

            parts = []
            if pain_syms:
                loc = pain_syms[0].location.lower()
                parts.append(f"Pain in the {loc}")

            for s in other_syms:
                if s.name and not any(g in s.name.lower() for g in generic_phrases + ["reported symptom"]):
                    parts.append(s.name)

            if parts:
                if len(parts) == 1:
                    complaint_text = parts[0]
                elif len(parts) == 2:
                    complaint_text = f"{parts[0]} and {parts[1].lower()}"
                else:
                    complaint_text = f"{', '.join(parts[:-1])} and {parts[-1].lower()}"

                if dur_clean and dur_clean.lower() not in complaint_text.lower():
                    return f"{complaint_text} for {dur_clean}"
                return complaint_text

        # 3. Dynamic patient transcript summary if no pre-defined keyword matched
        if transcript and len(transcript.strip()) > 0:
            clean_input = transcript.strip().rstrip('.')
            if dur_clean:
                return f"Health complaint: '{clean_input}' for {dur_clean}"
            return f"Health complaint: '{clean_input}'"

        if dur_clean:
            return f"Reported health concern for {dur_clean}"
        return "Patient reported symptoms requiring clinical intake evaluation"


    async def extract_intake(self, transcript: str, language_code: str) -> ClinicalIntake:
        rule_level, rule_flags = compute_rule_urgency(transcript)

        prompt = f"""
You are VaaniDoc AI, a clinical triage assistant for rural clinics in India.
Translate the patient transcript below from language '{language_code}' into structured English clinical intake fields.

STRICT MEDICAL SAFETY & EXTRACTION RULES:
1. DO NOT DIAGNOSE or prescribe treatments. Provide only broad 'possible_symptom_categories' (e.g. 'Febrile Illness', 'Acute Respiratory Syndrome').
2. DO NOT fabricate information, patient demographics, or medical history not present in the transcript.
3. If duration is not mentioned in the transcript, set "duration": "Duration not specified".
4. If severity is not explicitly mentioned by the patient, set "severity": "Not specified".
5. 'chief_complaint' MUST be generated from the extracted structured fields (e.g. 'Pain in the legs and arms for 10 days' or 'Cough and sore throat for 3 days'). DO NOT output generic text.

<patient_transcript>
{transcript}
</patient_transcript>

Return ONLY a JSON object with this exact structure:
{{
  "chief_complaint": "concise English complaint summary (e.g. Pain in the legs and arms for 10 days)",
  "symptoms": [
    {{
      "name": "Symptom English Name (e.g. Pain, Cough)",
      "normalized_name": "Standardized Clinical Term",
      "location": "Body Part e.g. Legs and Arms",
      "duration": "Duration e.g. 10 days or Duration not specified",
      "severity": "Mild/Moderate/Severe or Not specified",
      "onset": "Acute/Gradual/Sudden",
      "certainty": "Confirmed"
    }}
  ],
  "associated_symptoms": ["Secondary symptom 1"],
  "duration": "Overall duration string e.g. 10 days or Duration not specified",
  "severity": "Overall severity (Mild/Moderate/Severe or Not specified)",
  "body_location": "Involved anatomical regions e.g. Legs and Arms",
  "onset": "Onset summary e.g. 10 days ago or Acute",
  "possible_symptom_categories": ["Category 1", "Category 2"],
  "model_urgency": "LOW|MEDIUM|HIGH|EMERGENCY",
  "model_urgency_reason": "Clinical justification for urgency",
  "missing_information": ["Missing clinical detail 1"],
  "confidence": 0.95
}}
"""

        # 1. Groq High-Speed LLM Integration (LLaMA 3.3 70B)
        try:
            if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "MOCK_GROQ_KEY":
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                completion = await client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": "You are VaaniDoc AI, a clinical triage assistant for rural clinics in India. Output valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                )
                raw_text = completion.choices[0].message.content.strip()
                parsed = json.loads(raw_text)

                model_level = parsed.get("model_urgency", "MEDIUM")
                model_reason = parsed.get("model_urgency_reason", "Extracted via Groq AI LLaMA 3.3.")
                urgency = reconcile_urgency(rule_level, model_level, rule_flags, model_reason)

                duration_str = parsed.get("duration") or "Duration not specified"

                symptoms = [
                    SymptomDetail(
                        name=s.get("name", "Reported Symptom"),
                        normalized_name=s.get("normalized_name", s.get("name", "Symptom")),
                        location=s.get("location"),
                        duration=s.get("duration", duration_str),
                        severity=s.get("severity", "Not specified"),
                        onset=s.get("onset", "Acute"),
                        certainty=s.get("certainty", "Confirmed")
                    )
                    for s in parsed.get("symptoms", [])
                ]

                chief_complaint = self._build_chief_complaint(parsed.get("chief_complaint"), symptoms, duration_str, transcript)


                logger.info(f"Groq LLM extraction succeeded using model {settings.GROQ_MODEL}")
                return ClinicalIntake(
                    chief_complaint=chief_complaint,
                    symptoms=symptoms,
                    associated_symptoms=parsed.get("associated_symptoms", []),
                    duration=duration_str,
                    severity=parsed.get("severity", "Not specified"),
                    body_location=parsed.get("body_location", symptoms[0].location if symptoms else "General"),
                    onset=parsed.get("onset", "Unspecified"),
                    possible_symptom_categories=parsed.get("possible_symptom_categories", ["General Clinical Assessment"]),
                    urgency=urgency,
                    missing_information=parsed.get("missing_information", []),
                    confidence=float(parsed.get("confidence", 0.96))
                )
        except Exception as e:
            logger.warning(f"Groq LLM execution bypassed or failed ({e}). Attempting Gemini / Fallback pipeline.")

        # 2. Gemini LLM Integration with Structured Schema Enforcement
        try:
            if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "MOCK_GEMINI_KEY":
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(settings.GEMINI_MODEL)

                response = model.generate_content(prompt)
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text.split("```json", 1)[1].rsplit("```", 1)[0].strip()
                elif raw_text.startswith("```"):
                    raw_text = raw_text.split("```", 1)[1].rsplit("```", 1)[0].strip()

                parsed = json.loads(raw_text)

                model_level = parsed.get("model_urgency", "MEDIUM")
                model_reason = parsed.get("model_urgency_reason", "Extracted from narration.")
                urgency = reconcile_urgency(rule_level, model_level, rule_flags, model_reason)

                duration_str = parsed.get("duration") or "Duration not specified"

                symptoms = [
                    SymptomDetail(
                        name=s.get("name", "Reported Symptom"),
                        normalized_name=s.get("normalized_name", s.get("name", "Symptom")),
                        location=s.get("location"),
                        duration=s.get("duration", duration_str),
                        severity=s.get("severity", "Not specified"),
                        onset=s.get("onset", "Acute"),
                        certainty=s.get("certainty", "Confirmed")
                    )
                    for s in parsed.get("symptoms", [])
                ]

                chief_complaint = self._build_chief_complaint(parsed.get("chief_complaint"), symptoms, duration_str, transcript)


                return ClinicalIntake(
                    chief_complaint=chief_complaint,
                    symptoms=symptoms,
                    associated_symptoms=parsed.get("associated_symptoms", []),
                    duration=duration_str,
                    severity=parsed.get("severity", "Not specified"),
                    body_location=parsed.get("body_location", symptoms[0].location if symptoms else "General"),
                    onset=parsed.get("onset", "Unspecified"),
                    possible_symptom_categories=parsed.get("possible_symptom_categories", ["General Clinical Assessment"]),
                    urgency=urgency,
                    missing_information=parsed.get("missing_information", []),
                    confidence=float(parsed.get("confidence", 0.90))
                )
        except Exception as e:
            logger.warning(f"Gemini API execution bypassed or failed ({e}). Utilizing rule-based extraction engine.")

        # 3. Smart Rule-Based Fallback Parser
        return self._smart_rule_extraction(transcript, language_code, rule_level, rule_flags)

    def _smart_rule_extraction(self, text: str, lang: str, rule_level: str, rule_flags: List[str]) -> ClinicalIntake:
        text_lower = text.lower()
        symptoms: List[SymptomDetail] = []
        categories: List[str] = []
        associated: List[str] = []
        missing: List[str] = []

        # Dynamic Duration detection supporting Gujarati/Hindi/Marathi numeric and word patterns
        duration = "Duration not specified"
        num_dur = re.search(r"(\d+|૧૦|૧|૨|૩|૪|૫|૬|૭|૮|૯|दस|દસ|तीन|ત્રણ|दो|બે|एक|એક)\s*(days?|weeks?|months?|years?|દિવસથી|દિવસ|दिन|दिनों|हफ्तों|અઠવાડિયા|મહિના|மாதங்கள்|நாட்கள்|రోజుల|రోజులు|ദിവസം|മാസം|দিন)", text, re.IGNORECASE)
        if num_dur:
            raw_num = num_dur.group(1)
            raw_unit = num_dur.group(2).lower()
            if raw_num in ["૧૦", "દસ", "दस"]:
                num_str = "10"
            elif raw_num in ["૩", "ત્રણ", "तीन"]:
                num_str = "3"
            elif raw_num in ["૨", "બે", "दो"]:
                num_str = "2"
            elif raw_num in ["૧", "એક", "एक"]:
                num_str = "1"
            else:
                num_str = raw_num

            if any(u in raw_unit for u in ["month", "મહિના", "महिने", "মাস"]):
                duration = f"{num_str} months"
            elif any(u in raw_unit for u in ["week", "અઠવાડિયા", "हफ्तों"]):
                duration = f"{num_str} weeks"
            else:
                duration = f"{num_str} days"

        # Gujarati / Hindi / Marathi Pain & Extremities (Legs / Arms / Back / Head / Chest / Throat / Stomach)
        has_pain = any(k in text_lower for k in ["દુખે છે", "દુખાવો", "દુખે", "દુખાવ", "દુઃખે", "दर्द", "दुखी", "दुखणे", "pain", "ache", "aching", "hurt", "hurts"])
        locations = []
        if any(k in text_lower for k in ["પગ", "legs", "leg", "foot", "feet"]):
            locations.append("legs")
        if any(k in text_lower for k in ["હાથ", "arms", "arm", "hand", "hands"]):
            locations.append("arms")
        if any(k in text_lower for k in ["માથું", "head", "headache"]):
            locations.append("head")
        if any(k in text_lower for k in ["પેટ", "stomach", "abdomen"]):
            locations.append("stomach")
        if any(k in text_lower for k in ["છાતી", "chest"]):
            locations.append("chest")
        if any(k in text_lower for k in ["ગળું", "ગળામાં", "throat"]):
            locations.append("throat")
        if any(k in text_lower for k in ["કમર", "back", "waist"]):
            locations.append("back")

        if has_pain and locations:
            loc_str = " and ".join(locations) if len(locations) <= 2 else ", ".join(locations[:-1]) + " and " + locations[-1]
            symptoms.append(SymptomDetail(
                name="Pain",
                normalized_name="Pain / Myalgia",
                location=loc_str.capitalize(),
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("Musculoskeletal Category")

        # Cardiac / Respiratory emergency symptoms
        if any(k in text_lower for k in ["chest pain", "છાતી", "સીને", "நெஞ்சு", "ఛాతీ", "ಎದೆ", "നെഞ്ച്", "বুকে"]) and not has_pain:
            symptoms.append(SymptomDetail(
                name="Chest Discomfort / Pain",
                normalized_name="Thoracic Angina / Discomfort",
                location="Chest",
                duration=duration,
                severity="High" if rule_level in ["HIGH", "EMERGENCY"] else "Not specified",
                onset="Acute"
            ))
            categories.append("Acute Thoracic / Cardiac Category")

        if any(k in text_lower for k in ["breathe", "breathlessness", "सांस", "श्वास", "மூச்சு", "శ్వాస", "উসিರಾਟ"]):
            symptoms.append(SymptomDetail(
                name="Shortness of Breath",
                normalized_name="Dyspnea",
                location="Respiratory System",
                duration=duration,
                severity="Severe" if rule_level == "EMERGENCY" else "Not specified",
                onset="Acute"
            ))
            categories.append("Acute Respiratory Category")

        # Cough / Sore Throat
        if any(k in text_lower for k in ["cough", "ઉધરસ", "ઉધરસ છે", "खांसी", "खोकला", "இருமல்", "কাশি"]):
            symptoms.append(SymptomDetail(
                name="Cough",
                normalized_name="Tussis",
                location="Upper Respiratory Tract",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("Respiratory Symptoms")

        if any(k in text_lower for k in ["throat", "gala", "गले", "ગળામાં", "ഗ തൊണ്ട", "গলার"]) and "throat" not in locations:
            symptoms.append(SymptomDetail(
                name="Sore throat",
                normalized_name="Pharyngitis",
                location="Throat",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("Respiratory Symptoms")

        # Dizziness / Difficulty Walking
        if any(k in text_lower for k in ["chackar", "चक्कर", "ચક્કર", "ચક્કર આવ્યા", "dizzy", "dizziness", "મૂંઝવણ"]):
            symptoms.append(SymptomDetail(
                name="Dizziness",
                normalized_name="Vertigo / Giddiness",
                location="Neurological / Systemic",
                duration=duration,
                severity="Not specified",
                onset="Sudden"
            ))
            categories.append("Neurological Category")

        if any(k in text_lower for k in ["ચાલવામાં", "મુશ્કેલી", "चालताना", "चालणे", "walking", "trouble walking", "चालने में"]):
            symptoms.append(SymptomDetail(
                name="Difficulty walking",
                normalized_name="Gait Impairment",
                location="Musculoskeletal / Neurological",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("Neurological Category")

        # Stomach Burning / Nausea / Vomiting
        if any(k in text_lower for k in ["stomach", "पेटे", "পেটে", "જ્વાળા", "ज्वलन", "জ্বলন", "જ્વાળાપોળા", "burning"]):
            symptoms.append(SymptomDetail(
                name="Burning sensation in stomach",
                normalized_name="Dyspepsia / Gastric Burning",
                location="Abdomen / Stomach",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("Gastrointestinal Symptoms")

        if any(k in text_lower for k in ["nausea", "बमि", "বমি", "ઉલટી", "vomit", "vomiting"]):
            symptoms.append(SymptomDetail(
                name="Nausea",
                normalized_name="Nausea",
                location="Gastrointestinal",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("Gastrointestinal Symptoms")

        # Fever
        if any(k in text_lower for k in ["fever", "बुखार", "તાવ", "ताप", "காய்ச்சல்", "జ్వరం", "ಜ್ವರ", "പനി", "জ্বর", "ਬੁਖਾਰ"]):
            symptoms.append(SymptomDetail(
                name="Fever",
                normalized_name="Pyrexia",
                location="Systemic",
                duration=duration,
                severity="High" if rule_level in ["HIGH", "EMERGENCY"] else "Not specified",
                onset="Acute"
            ))
            categories.append("Febrile Illness Category")
            missing.append("Exact oral temperature reading")

        # Headache
        if any(k in text_lower for k in ["headache", "सिर दर्द", "डोके दुखी", "തലവേദന", "தலைவலி", "તથા માથાનો દુખાવો", "মাথাব্যথা"]) and "head" not in locations:
            symptoms.append(SymptomDetail(
                name="Headache",
                normalized_name="Cephalgia",
                location="Head",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            associated.append("General Malaise")

        # Emergency Bleeding / Syncope / Consciousness Loss
        if any(k in text_lower for k in ["രക്തസ്രാവ", "ബോധക്ഷയ", "bleeding", "unconscious", "haemorrhage", "syncope"]):
            symptoms.append(SymptomDetail(
                name="Acute Bleeding / Loss of Consciousness",
                normalized_name="Acute Hemorrhage / Syncope",
                location="Systemic / Neurological",
                duration=duration,
                severity="Severe",
                onset="Sudden"
            ))
            categories.append("Emergency Triage Category")

        # Safe fallback symptom if no specific keyword matched in local rule parser
        if not symptoms:
            symptoms.append(SymptomDetail(
                name="Symptom Narration",
                normalized_name="Clinical Narration",
                location="General",
                duration=duration,
                severity="Not specified",
                onset="Acute"
            ))
            categories.append("General Symptom Triage")

        # Determine Chief Complaint Dynamically
        chief_complaint = self._build_chief_complaint(None, symptoms, duration, text)

        # Reconcile Urgency
        model_level = "EMERGENCY" if rule_level == "EMERGENCY" else "HIGH" if rule_level == "HIGH" else "MEDIUM" if len(symptoms) > 1 else "LOW"
        model_reason = f"Rule-derived clinical extraction from patient narration in {lang}."
        urgency = reconcile_urgency(rule_level, model_level, rule_flags, model_reason)

        return ClinicalIntake(
            chief_complaint=chief_complaint,
            symptoms=symptoms,
            associated_symptoms=associated,
            duration=duration,
            severity="Severe" if urgency.level in ["HIGH", "EMERGENCY"] else "Not specified",
            body_location=symptoms[0].location if symptoms else "General",
            onset="Acute" if duration != "6 months" else "Gradual",
            possible_symptom_categories=list(set(categories)) or ["General Symptom Triage"],
            urgency=urgency,
            missing_information=missing or ["Detailed medical history"],
            confidence=0.92
        )

extraction_service = ExtractionService()


