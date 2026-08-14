from typing import Tuple, List
from app.schemas.intake import UrgencyAssessment, UrgencyLevel

EMERGENCY_KEYWORDS = [
    # Cardiac & Chest Pain Triggers
    "chest pain", "chest", "crushing pain", "सीने में दर्द", "सीने", "छाती", "છાતી", "छातीत",
    "நெஞ்சு", "ఛాతీ", "ಎದೆ", "നെഞ്ച്", "বুকে", "ਛਾਤੀ",

    # Respiratory Distress Triggers
    "cannot breathe", "breathe", "breathlessness", "gasping", "shortness of breath", "shortness of",
    "सांस", "श्वास", "શ્વાસ", "மூச்சு", "శ్వాస", "ಉಸಿರಾಟ", "ശ്വാസം", "শ্বাস", "ਸਾਹ",

    # Stroke, Paralysis, Loss of Consciousness, Slurred Speech Triggers
    "slurred speech", "paralysis", "numbness", "unconscious", "fainting", "consciousness", "stroke",
    "लकवा", "बेहोश", "બેભાન", "बेशुद्ध", "மயக்கம்", "స్పృహ", "ಮೂರ್ಛೆ", "ബോധക്ഷയ", "জ্ঞান", "ਬੇਹੋਸ਼",

    # Bleeding & Hemorrhage Triggers
    "coughing blood", "severe bleeding", "bleeding", "blood",
    "खून", "रक्त", "लोही", "रक्तस्त्राव", "ரத்த", "రక్త", "ರಕ್ತ", "രക്തസ്രാവ", "রক্ত"
]

HIGH_KEYWORDS = [
    # English
    "high fever", "severe pain", "persistent vomiting", "blood in stool", "acute diarrhea", "dehydration", "vomiting",
    # Hindi
    "तेज़ बुखार", "उल्टी", "गंभीर दर्द", "दस्त", "पेट में तेज़ दर्द",
    # Gujarati
    "ખૂબ તાવ", "ઝાડા", "ઉલટી", "અતિશય દુખાવો",
    # Marathi
    "खूप ताप", "उलट्या", "तीव्र वेदना", "अतिसार",
    # Tamil
    "கடுமையான காய்ச்சல்", "வாந்தி", "கடும் வலி", "காய்ச்சல்",
    # Telugu
    "తీవ్రమైన జ్వరం", "వాంతులు", "కడుపు నొప్పి", "జ్వరం",
    # Kannada
    "ತೀವ್ರ ಜ್ವರ", "ವಾಂತಿ", "ಹೆಚ್ಚಿನ ನೋವು", "ಜ್ವರ",
    # Malayalam
    "കഠിനമായ പനി", "ഛർദ്ദി", "കഠിനമായ വേദന", "പനി",
    # Bengali
    "প্রবল জ্বর", "বমি", "তীব্র ব্যথা", "জ্বর",
    # Punjabi
    "ਤੇਜ਼ ਬੁਖਾਰ", "ਉਲਟੀਆਂ", "ਬੁਖਾਰ"
]

def compute_rule_urgency(transcript: str) -> Tuple[UrgencyLevel, List[str]]:
    text_lower = transcript.lower()
    matched_rules = []

    for kw in EMERGENCY_KEYWORDS:
        if kw.lower() in text_lower:
            matched_rules.append(f"EMERGENCY_TRIGGER:{kw}")

    if matched_rules:
        return "EMERGENCY", matched_rules

    for kw in HIGH_KEYWORDS:
        if kw.lower() in text_lower:
            matched_rules.append(f"HIGH_TRIGGER:{kw}")

    if matched_rules:
        return "HIGH", matched_rules

    return "LOW", []

def reconcile_urgency(rule_level: UrgencyLevel, model_level: UrgencyLevel, rule_flags: List[str], model_reason: str) -> UrgencyAssessment:
    urgency_ranks = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "EMERGENCY": 4}

    rule_rank = urgency_ranks.get(rule_level, 1)
    model_rank = urgency_ranks.get(model_level, 1)

    # Safety floor: Rule triggers (EMERGENCY/HIGH) ALWAYS override model if rule rank is higher
    if rule_rank > model_rank:
        final_level = rule_level
        reason = f"Safety rule trigger override ({', '.join(rule_flags)}). {model_reason}"
    elif rule_level == "LOW" and model_level == "MEDIUM" and not rule_flags and any(w in model_reason.lower() for w in ["routine", "chronic", "mild", "single"]):
        final_level = "LOW"
        reason = f"Routine primary care evaluation. {model_reason}"
    else:
        final_level = model_level
        reason = model_reason

    return UrgencyAssessment(
        level=final_level,
        reason=reason,
        matched_rules=rule_flags
    )



