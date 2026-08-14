from pydantic import BaseModel, Field
from typing import List, Optional, Any, Literal

UrgencyLevel = Literal['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']
SessionStatus = Literal['waiting', 'in_review', 'in_consultation', 'completed', 'expired']

class SymptomDetail(BaseModel):
    name: str = Field(description="Symptom name in English")
    normalized_name: str = Field(description="Standardized medical terminology")
    location: Optional[str] = Field(default=None, description="Anatomical location")
    duration: Optional[str] = Field(default=None, description="Duration")
    severity: Optional[str] = Field(default=None, description="Mild, Moderate, Severe")
    onset: Optional[str] = Field(default=None, description="Acute, Gradual, Sudden")
    certainty: Optional[str] = Field(default="Confirmed", description="Confirmed, Denied, Suspected")

class UrgencyAssessment(BaseModel):
    level: UrgencyLevel = Field(description="LOW | MEDIUM | HIGH | EMERGENCY")
    reason: str = Field(description="Clinical reason for urgency rating")
    matched_rules: List[str] = Field(default_factory=list, description="Rule safety flags triggered")

class ClinicalIntake(BaseModel):
    chief_complaint: str = Field(description="Primary summary of patient narration in English")
    symptoms: List[SymptomDetail] = Field(default_factory=list, description="Primary extracted symptoms")
    associated_symptoms: List[str] = Field(default_factory=list, description="Secondary symptoms")
    duration: str = Field(description="Overall onset/duration")
    severity: str = Field(description="Overall severity")
    body_location: str = Field(description="Involved body parts")
    onset: str = Field(description="Onset characteristics")
    possible_symptom_categories: List[str] = Field(description="Broad clinical categories (NOT medical diagnosis)")
    urgency: UrgencyAssessment = Field(description="Urgency classification")
    missing_information: List[str] = Field(default_factory=list, description="Unmentioned clinical details")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Extraction confidence score")

class CreateSessionRequest(BaseModel):
    clinicId: str = "clinic_rural_01"
    language: str = "hi-IN"

class ExtractIntakeRequest(BaseModel):
    transcript: str
    language: str

class StatusUpdateRequest(BaseModel):
    status: SessionStatus

class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[dict] = None
    requestId: str

