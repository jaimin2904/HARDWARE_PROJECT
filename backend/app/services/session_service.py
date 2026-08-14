import time
import uuid
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List
from app.schemas.intake import ClinicalIntake, UrgencyAssessment, SessionStatus
from app.config import settings
from app.utils.logger import logger

from app.services.supabase_service import supabase_service

class EphemeralSessionData:
    def __init__(self, session_id: str, clinic_id: str, language: str):
        now = datetime.now(timezone.utc)
        self.session_id = session_id
        self.clinic_id = clinic_id
        self.language = language
        self.status: SessionStatus = "waiting"
        self.transcript = ""
        self.structured_intake: Optional[ClinicalIntake] = None
        self.created_at = now.isoformat()
        self.expires_at = (now + timedelta(hours=settings.SESSION_TTL_HOURS)).isoformat()
        self._expire_timestamp = (now + timedelta(hours=settings.SESSION_TTL_HOURS)).timestamp()
        self.token = f"#A-{uuid.uuid4().hex[:2].upper()}"

class SessionService:
    def __init__(self):
        self._sessions: Dict[str, EphemeralSessionData] = {}
        self._lock = threading.Lock()

    def create_session(self, clinic_id: str, language: str) -> EphemeralSessionData:
        self.cleanup_expired_sessions()
        session_id = f"sess_{uuid.uuid4().hex[:10]}"
        session = EphemeralSessionData(session_id, clinic_id, language)
        with self._lock:
            self._sessions[session_id] = session

        supabase_service.upsert_patient_session(
            session_id=session.session_id,
            clinic_id=session.clinic_id,
            language=session.language,
            status=session.status,
            token=session.token,
            expires_at=session.expires_at
        )
        logger.info(f"Created ephemeral session {session_id} for clinic {clinic_id}")
        return session

    def get_session(self, session_id: str) -> Optional[EphemeralSessionData]:
        with self._lock:
            session = self._sessions.get(session_id)
        if session and time.time() > session._expire_timestamp:
            self.delete_session(session_id)
            return None
        return session

    def list_sessions_for_clinic(self, clinic_id: str) -> List[EphemeralSessionData]:
        self.cleanup_expired_sessions()
        supabase_sessions = supabase_service.fetch_active_sessions(clinic_id)
        with self._lock:
            in_mem = [s for s in self._sessions.values() if s.clinic_id == clinic_id]
            if supabase_sessions:
                # Merge Supabase sessions if available
                smap = {s.session_id: s for s in in_mem}
                for sb in supabase_sessions:
                    sid = sb.get("session_id")
                    if sid and sid not in smap:
                        sess = EphemeralSessionData(sid, sb.get("clinic_id", clinic_id), sb.get("language", "en-IN"))
                        sess.transcript = sb.get("original_text", "")
                        sess.status = sb.get("status", "waiting")
                        sess.token = sb.get("token", f"#A-{sid[:4].upper()}")
                        smap[sid] = sess
                return list(smap.values())
            return in_mem

    def update_input(self, session_id: str, transcript: str):
        session = self.get_session(session_id)
        if session:
            with self._lock:
                session.transcript = transcript
            supabase_service.upsert_patient_session(
                session_id=session.session_id,
                clinic_id=session.clinic_id,
                language=session.language,
                original_text=transcript,
                status=session.status,
                token=session.token,
                expires_at=session.expires_at
            )

    def set_intake(self, session_id: str, intake: ClinicalIntake):
        session = self.get_session(session_id)
        if session:
            with self._lock:
                session.structured_intake = intake
            
            symptoms_list = [s.model_dump() for s in intake.symptoms]
            category_str = ", ".join(intake.possible_symptom_categories) if intake.possible_symptom_categories else "General"
            
            supabase_service.upsert_patient_session(
                session_id=session.session_id,
                clinic_id=session.clinic_id,
                language=session.language,
                original_text=session.transcript,
                english_summary=intake.chief_complaint,
                symptoms=symptoms_list,
                duration=intake.duration,
                category=category_str,
                urgency=intake.urgency.level,
                status=session.status,
                token=session.token,
                expires_at=session.expires_at
            )

    def update_status(self, session_id: str, status: SessionStatus):
        session = self.get_session(session_id)
        if session:
            with self._lock:
                session.status = status
            supabase_service.update_session_status(session_id, status)

    def delete_session(self, session_id: str) -> bool:
        supabase_service.delete_patient_session(session_id)
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.info(f"Explicitly purged ephemeral session data for {session_id}")
                return True
        return False


    def cleanup_expired_sessions(self):
        now_ts = time.time()
        to_delete = []
        with self._lock:
            for sid, sess in self._sessions.items():
                if now_ts > sess._expire_timestamp:
                    to_delete.append(sid)
            for sid in to_delete:
                del self._sessions[sid]
        if to_delete:
            logger.info(f"Auto-purged {len(to_delete)} expired ephemeral sessions.")

session_service = SessionService()

