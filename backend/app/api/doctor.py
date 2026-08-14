import uuid
from fastapi import APIRouter, HTTPException, Request
from app.schemas.intake import ApiResponse, StatusUpdateRequest
from app.services.session_service import session_service
from app.config import settings

router = APIRouter(prefix="/api/doctor", tags=["Doctor"])

def get_req_id(request: Request) -> str:
    return getattr(request.state, "req_id", f"req_{uuid.uuid4().hex[:8]}")

@router.get("/sessions", response_model=ApiResponse)
async def list_doctor_sessions(request: Request, clinicId: str = settings.DEFAULT_CLINIC_ID):
    req_id = get_req_id(request)
    sessions = session_service.list_sessions_for_clinic(clinicId)
    sessions_list = []
    for sess in sessions:
        sessions_list.append({
            "sessionId": sess.session_id,
            "clinicId": sess.clinic_id,
            "status": sess.status,
            "language": sess.language,
            "transcript": sess.transcript,
            "token": sess.token,
            "createdAt": sess.created_at,
            "expiresAt": sess.expires_at,
            "structuredIntake": sess.structured_intake.model_dump() if sess.structured_intake else None,
            "urgency": sess.structured_intake.urgency.model_dump() if sess.structured_intake else None
        })

    return ApiResponse(
        success=True,
        data=sessions_list,
        requestId=req_id
    )

@router.patch("/session/{session_id}/status", response_model=ApiResponse)
async def update_status(session_id: str, req: StatusUpdateRequest, request: Request):
    req_id = get_req_id(request)
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    session_service.update_status(session_id, req.status)
    return ApiResponse(
        success=True,
        data={"sessionId": session_id, "status": req.status},
        requestId=req_id
    )

