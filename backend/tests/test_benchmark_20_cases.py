import pytest
from app.services.extraction_service import extraction_service
from app.services.urgency_engine import compute_rule_urgency

BENCHMARK_20_CASES = [
    {
        "id": "CASE-01",
        "lang": "hi-IN",
        "type": "Emergency Cardiac",
        "transcript": "मुझे छाती में बहुत तेज़ दर्द हो रहा है और सांस लेने में तकलीफ है",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "Chest Discomfort / Pain"
    },
    {
        "id": "CASE-02",
        "lang": "gu-IN",
        "type": "Emergency Cardiac Triage",
        "transcript": "મને છેલ્લા ૩ દિવસથી ખૂબ તાવ આવે છે અને છાતીમાં સહેજ દુખાવો થાય છે.",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "Chest Discomfort / Pain"
    },
    {
        "id": "CASE-03",
        "lang": "mr-IN",
        "type": "High Fever & Headache",
        "transcript": "मला गेल्या ३ दिवसांपासून खूप ताप आला आहे आणि डोके दुखी होत आहे.",
        "expected_urgency": "HIGH",
        "expected_symptom": "Fever"
    },
    {
        "id": "CASE-04",
        "lang": "ta-IN",
        "type": "High Fever & Vomiting",
        "transcript": "எனக்கு 3 நாட்களாக கடுமையான காய்ச்சல் மற்றும் வாந்தி உள்ளது.",
        "expected_urgency": "HIGH",
        "expected_symptom": "Fever"
    },
    {
        "id": "CASE-05",
        "lang": "te-IN",
        "type": "Emergency Respiratory Distress",
        "transcript": "నాకు 3 రోజులుగా శ్వాస తీసుకోవడంలో తీవ్రమైన ఇబ్బంది ఉంది మరియు ఛాతీ నొప్పి వస్తోంది.",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "Shortness of Breath"
    },
    {
        "id": "CASE-06",
        "lang": "kn-IN",
        "type": "High Fever & Headache",
        "transcript": "ನನಗೆ 3 ದಿನಗಳಿಂದ ತೀವ್ರ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ.",
        "expected_urgency": "HIGH",
        "expected_symptom": "Fever"
    },
    {
        "id": "CASE-07",
        "lang": "ml-IN",
        "type": "Emergency Severe Bleeding",
        "transcript": "എനിക്ക് പെട്ടെന്ന് കഠിനമായ രക്തസ്രാവവും ബോധക്ഷയവും ഉണ്ടായി.",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "General Discomfort"
    },
    {
        "id": "CASE-08",
        "lang": "bn-IN",
        "type": "High Fever & Vomiting",
        "transcript": "আমার ৩ দিন ধরে খুব জ্বর এবং বমি হচ্ছে।",
        "expected_urgency": "HIGH",
        "expected_symptom": "Fever"
    },
    {
        "id": "CASE-09",
        "lang": "pa-IN",
        "type": "High Fever & Head Pain",
        "transcript": "ਮੈਨੂੰ 3 ਦਿਨਾਂ ਤੋਂ ਤੇਜ਼ ਬੁਖਾਰ ਅਤੇ ਸਿਰ ਦਰਦ ਹੈ।",
        "expected_urgency": "HIGH",
        "expected_symptom": "Fever"
    },
    {
        "id": "CASE-10",
        "lang": "en-IN",
        "type": "Emergency Slurred Speech",
        "transcript": "My father suddenly had slurred speech and numbness on the right side of his body.",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "General Discomfort"
    },
    {
        "id": "CASE-11",
        "lang": "hi-IN",
        "type": "Low Chronic Knee Pain",
        "transcript": "मुझे पिछले 6 महीने से घुटने में दर्द रहता है",
        "expected_urgency": "LOW",
        "expected_symptom": "Knee Joint Pain"
    },
    {
        "id": "CASE-12",
        "lang": "gu-IN",
        "type": "Low Mild Cough",
        "transcript": "મને ૨ અઠવાડિયાથી થોડી ઉધરસ આવે છે.",
        "expected_urgency": "LOW",
        "expected_symptom": "General Discomfort"
    },
    {
        "id": "CASE-13",
        "lang": "mr-IN",
        "type": "Low Knee Joint Pain",
        "transcript": "मला गेल्या ६ महिन्यांपासून गुडघेदुखीचा त्रास आहे.",
        "expected_urgency": "LOW",
        "expected_symptom": "Knee Joint Pain"
    },
    {
        "id": "CASE-14",
        "lang": "en-IN",
        "type": "Emergency Coughing Blood",
        "transcript": "I have been coughing up blood since this morning and my chest hurts.",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "Chest Discomfort / Pain"
    },
    {
        "id": "CASE-15",
        "lang": "hi-IN",
        "type": "High Vomiting and Abdominal Pain",
        "transcript": "मुझे कल रात से लगातार उल्टी और पेट में तेज़ दर्द हो रहा है",
        "expected_urgency": "HIGH",
        "expected_symptom": "Vomiting"
    },
    {
        "id": "CASE-16",
        "lang": "ta-IN",
        "type": "Low Chronic Back Pain",
        "transcript": "எனக்கு 1 மாதமாக முதுகு வலி இருக்கிறது.",
        "expected_urgency": "LOW",
        "expected_symptom": "General Discomfort"
    },
    {
        "id": "CASE-17",
        "lang": "te-IN",
        "type": "Low Mild Rash",
        "transcript": "నాకు 2 రోజులుగా చర్మంపై చిన్న దద్దుర్లు వచ్చాయి.",
        "expected_urgency": "LOW",
        "expected_symptom": "General Discomfort"
    },
    {
        "id": "CASE-18",
        "lang": "bn-IN",
        "type": "Emergency Chest Pain & Fainting",
        "transcript": "আমার ভাই হঠাৎ বুকে তীব্র ব্যথায় জ্ঞান হারিয়ে ফেলেছে।",
        "expected_urgency": "EMERGENCY",
        "expected_symptom": "Chest Discomfort / Pain"
    },
    {
        "id": "CASE-19",
        "lang": "hi-IN",
        "type": "Medium Hinglish Fever",
        "transcript": "Mujhe 2 days se fever hai and throat mein pain ho raha hai.",
        "expected_urgency": "MEDIUM",
        "expected_symptom": "Fever"
    },
    {
        "id": "CASE-20",
        "lang": "en-IN",
        "type": "High Abdominal Pain & Fever",
        "transcript": "I have severe lower abdominal pain and high fever since yesterday.",
        "expected_urgency": "HIGH",
        "expected_symptom": "Fever"
    }
]

@pytest.mark.asyncio
async def test_run_20_case_benchmark():
    correct_urgency = 0
    valid_schema_count = 0
    missed_emergencies = 0
    false_emergencies = 0

    total_cases = len(BENCHMARK_20_CASES)

    for case in BENCHMARK_20_CASES:
        intake = await extraction_service.extract_intake(case["transcript"], case["lang"])

        # 1. Verify JSON Schema validity & non-null required fields
        assert intake.chief_complaint is not None and len(intake.chief_complaint) > 0
        assert isinstance(intake.symptoms, list) and len(intake.symptoms) > 0
        assert intake.urgency is not None and intake.urgency.level in ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]
        valid_schema_count += 1

        # 2. Verify Urgency Triage Accuracy
        actual_level = intake.urgency.level
        expected_level = case["expected_urgency"]

        if actual_level == expected_level:
            correct_urgency += 1

        # Safety Check: Missed Emergency (Expected EMERGENCY but got LOW/MEDIUM)
        if expected_level == "EMERGENCY" and actual_level not in ["EMERGENCY"]:
            missed_emergencies += 1

        # Safety Check: False Emergency (Expected LOW/MEDIUM but got EMERGENCY)
        if expected_level in ["LOW", "MEDIUM"] and actual_level == "EMERGENCY":
            false_emergencies += 1

        if actual_level != expected_level:
            safe_transcript = case['transcript'].encode('ascii', 'backslashreplace').decode('ascii')
            print(f"Mismatch in {case['id']} ({case['lang']} - {case['type']}): Expected {expected_level}, Got {actual_level} for '{safe_transcript}'")


    accuracy = (correct_urgency / total_cases) * 100
    schema_rate = (valid_schema_count / total_cases) * 100

    print(f"\n--- VAANIDOC 20-CASE BENCHMARK RESULTS ---")
    print(f"Total Test Cases Evaluated: {total_cases}")
    print(f"Schema Validity Rate: {schema_rate:.1f}%")
    print(f"Urgency Classification Accuracy: {accuracy:.1f}% ({correct_urgency}/{total_cases})")
    print(f"Missed Emergency Rate: {missed_emergencies}")
    print(f"False Emergency Count: {false_emergencies}")

    # Benchmark Assertions as per PRD Section 2 & 16
    assert schema_rate == 100.0, "JSON Schema Validity must be 100%"
    assert accuracy >= 85.0, f"Urgency accuracy must be >= 85%, got {accuracy:.1f}%"
    assert missed_emergencies == 0, "Zero tolerance for missed emergencies!"

