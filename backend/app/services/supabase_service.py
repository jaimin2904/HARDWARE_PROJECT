from typing import Optional, List, Dict, Any
from app.config import settings
from app.utils.logger import logger

class SupabaseService:
    def __init__(self):
        self._client = None
        self._init_client()

    def _init_client(self):
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        has_url = bool(url and "YOUR_SUPABASE" not in url)
        has_key = bool(key and "YOUR_SUPABASE" not in key)
        
        logger.info(f"Supabase Config Check: URL Configured={has_url}, Key Configured={has_key}")

        if has_url and has_key:
            try:
                from supabase import create_client
                self._client = create_client(url, key)
                logger.info("Supabase client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase client: {e}")
                self._client = None
        else:
            logger.info("Supabase credentials not fully configured; operating in in-memory session mode.")


    @property
    def is_enabled(self) -> bool:
        return self._client is not None

    def upsert_patient_session(
        self,
        session_id: str,
        clinic_id: str,
        language: str,
        original_text: str = "",
        english_summary: str = "",
        symptoms: Optional[List[Dict[str, Any]]] = None,
        duration: str = "",
        category: str = "",
        urgency: str = "MEDIUM",
        status: str = "waiting",
        token: str = "",
        expires_at: Optional[str] = None
    ) -> bool:
        if not self.is_enabled:
            return False
        try:
            payload = {
                "session_id": session_id,
                "clinic_id": clinic_id,
                "language": language,
                "original_text": original_text,
                "english_summary": english_summary,
                "symptoms": symptoms or [],
                "duration": duration,
                "category": category,
                "urgency": urgency,
                "status": status,
                "token": token,
                "expires_at": expires_at
            }
            # Upsert into patient_sessions on session_id conflict
            response = self._client.table("patient_sessions").upsert(payload, on_conflict="session_id").execute()
            logger.info(f"Supabase upsert succeeded for temporary session {session_id}")
            return True
        except Exception as e:
            logger.warning(f"Supabase upsert failed for session {session_id}: {e}")
            return False

    def fetch_active_sessions(self, clinic_id: str) -> List[Dict[str, Any]]:
        if not self.is_enabled:
            return []
        try:
            response = (
                self._client.table("patient_sessions")
                .select("*")
                .eq("clinic_id", clinic_id)
                .neq("status", "completed")
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.warning(f"Supabase fetch active sessions failed for clinic {clinic_id}: {e}")
            return []

    def update_session_status(self, session_id: str, status: str) -> bool:
        if not self.is_enabled:
            return False
        try:
            self._client.table("patient_sessions").update({"status": status}).eq("session_id", session_id).execute()
            logger.info(f"Supabase status update to '{status}' for session {session_id}")
            return True
        except Exception as e:
            logger.warning(f"Supabase status update failed for session {session_id}: {e}")
            return False

    def delete_patient_session(self, session_id: str) -> bool:
        if not self.is_enabled:
            return False
        try:
            self._client.table("patient_sessions").delete().eq("session_id", session_id).execute()
            logger.info(f"Supabase explicit session purge succeeded for {session_id}")
            return True
        except Exception as e:
            logger.warning(f"Supabase delete session failed for {session_id}: {e}")
            return False

supabase_service = SupabaseService()
