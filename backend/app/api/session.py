import os
import uuid
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from app.schemas.intake import CreateSessionRequest, ExtractIntakeRequest, ApiResponse
from app.services.session_service import session_service
from app.services.asr_service import speech_service
from app.services.extraction_service import extraction_service
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/session", tags=["Session"])

def get_req_id(request: Request) -> str:
    return getattr(request.state, "req_id", f"req_{uuid.uuid4().hex[:8]}")

@router.post("", response_model=ApiResponse)
async def create_session(req: CreateSessionRequest, request: Request):
    req_id = get_req_id(request)
    session = session_service.create_session(req.clinicId, req.language)
    return ApiResponse(
        success=True,
        data={
            "sessionId": session.session_id,
            "clinicId": session.clinic_id,
            "status": session.status,
            "language": session.language,
            "token": session.token,
            "createdAt": session.created_at,
            "expiresAt": session.expires_at
        },
        requestId=req_id
    )

@router.post("/{session_id}/input", response_model=ApiResponse)
async def submit_input(
    session_id: str,
    request: Request,
    input_type: str = Form(...),
    text: str = Form(None),
    audio: UploadFile = File(None)
):
    req_id = get_req_id(request)
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    transcript = ""
    if text and len(text.strip()) > 0:
        transcript = text.strip()
    elif audio:
        contents = await audio.read()
        if len(contents) > settings.MAX_AUDIO_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Audio file size exceeds maximum limit (10MB)")

        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"audio_{session_id}_{uuid.uuid4().hex[:6]}.webm")
        with open(temp_path, "wb") as f:
            f.write(contents)

        transcript = await speech_service.transcribe_and_cleanup(temp_path, session.language)
    else:
        transcript = text or ""


    session_service.update_input(session_id, transcript)

    return ApiResponse(
        success=True,
        data={
            "sessionId": session_id,
            "inputType": input_type,
            "transcript": transcript
        },
        requestId=req_id
    )

@router.post("/{session_id}/extract", response_model=ApiResponse)
async def extract_intake(session_id: str, req: ExtractIntakeRequest, request: Request):
    req_id = get_req_id(request)
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    intake = await extraction_service.extract_intake(req.transcript, req.language)
    session_service.set_intake(session_id, intake)

    return ApiResponse(
        success=True,
        data={
            "sessionId": session_id,
            "structuredIntake": intake.model_dump()
        },
        requestId=req_id
    )

@router.get("/{session_id}", response_model=ApiResponse)
async def get_session(session_id: str, request: Request):
    req_id = get_req_id(request)
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    return ApiResponse(
        success=True,
        data={
            "sessionId": session.session_id,
            "clinicId": session.clinic_id,
            "status": session.status,
            "language": session.language,
            "transcript": session.transcript,
            "token": session.token,
            "createdAt": session.created_at,
            "expiresAt": session.expires_at,
            "structuredIntake": session.structured_intake.model_dump() if session.structured_intake else None,
            "urgency": session.structured_intake.urgency.model_dump() if session.structured_intake else None
        },
        requestId=req_id
    )

@router.delete("/{session_id}", response_model=ApiResponse)
async def delete_session(session_id: str, request: Request):
    req_id = get_req_id(request)
    purged = session_service.delete_session(session_id)
    return ApiResponse(
        success=True,
        data={"sessionId": session_id, "purged": purged},
        requestId=req_id
    )

