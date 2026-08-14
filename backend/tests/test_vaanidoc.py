import pytest
from app.services.session_service import session_service
from app.services.urgency_engine import compute_rule_urgency, reconcile_urgency
from app.services.extraction_service import extraction_service

def test_session_lifecycle_and_purge():
    # 1. Create session
    session = session_service.create_session("clinic_test", "hi-IN")
    assert session.session_id.startswith("sess_")
    assert session.status == "waiting"

    # 2. Update input
    session_service.update_input(session.session_id, "मुझे 3 दिन से तेज़ बुखार है")
    fetched = session_service.get_session(session.session_id)
    assert fetched is not None
    assert fetched.transcript == "मुझे 3 दिन से तेज़ बुखार है"

    # 3. Explicit privacy purge
    purged = session_service.delete_session(session.session_id)
    assert purged is True
    assert session_service.get_session(session.session_id) is None

def test_urgency_engine_safety_floor():
    # Cardiac trigger MUST evaluate to EMERGENCY floor
    cardiac_transcript = "मुझे छाती में बहुत तेज़ दर्द हो रहा है"
    level, flags = compute_rule_urgency(cardiac_transcript)
    assert level == "EMERGENCY"
    assert len(flags) > 0

    # Model attempts to downgrade to LOW -> Reconciler MUST enforce EMERGENCY floor
    reconciled = reconcile_urgency(level, "LOW", flags, "Model suggested low urgency")
    assert reconciled.level == "EMERGENCY"
    assert "Safety rule trigger override" in reconciled.reason

def test_urgency_engine_routine_case():
    routine_transcript = "मला गेल्या ६ महिन्यांपासून गुडघेदुखीचा त्रास आहे."
    level, flags = compute_rule_urgency(routine_transcript)
    assert level == "LOW"
    reconciled = reconcile_urgency(level, "LOW", flags, "Chronic pain")
    assert reconciled.level == "LOW"
