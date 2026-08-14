import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Explicitly load .env file from backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    APP_NAME: str = "VaaniDoc API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "MOCK_GEMINI_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")


    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "AUTO") # GROQ, GEMINI, AUTO, MOCK

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_PUBLISHABLE_KEY", os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", "")))

    ASR_PROVIDER: str = os.getenv("ASR_PROVIDER", "MOCK") # MOCK, GOOGLE, AI4BHARAT
    MAX_AUDIO_SIZE_BYTES: int = 10 * 1024 * 1024 # 10MB limit
    SESSION_TTL_HOURS: int = 2
    DEFAULT_CLINIC_ID: str = "clinic_rural_01"

settings = Settings()


