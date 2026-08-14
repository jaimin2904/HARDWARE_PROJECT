from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.api import session, doctor
from app.schemas.intake import ApiResponse
from app.utils.logger import logger
import time
import uuid

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Backend Service for VaaniDoc — Ephemeral Multilingual Health Intake"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Request ID & Privacy Audit Middleware
@app.middleware("http")
async def privacy_audit_middleware(request: Request, call_next):
    req_id = f"req_{uuid.uuid4().hex[:8]}"
    request.state.req_id = req_id
    start_time = time.time()

    logger.info(f"[{req_id}] START {request.method} {request.url.path}")

    response = await call_next(request)

    duration = (time.time() - start_time) * 1000
    logger.info(f"[{req_id}] END {request.method} {request.url.path} -> {response.status_code} ({duration:.2f}ms)")

    response.headers["X-Request-ID"] = req_id
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = getattr(request.state, "req_id", "req_unknown")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {"code": str(exc.status_code), "message": exc.detail},
            "requestId": req_id
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "req_id", "req_unknown")
    logger.error(f"[{req_id}] Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": {"code": "500", "message": "Internal Server Error"},
            "requestId": req_id
        }
    )

# Include Routers
app.include_router(session.router)
app.include_router(doctor.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

