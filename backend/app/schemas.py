from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    language: str = "en"

    class Config:
        orm_mode = True


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: str = "patient"
    phone: str = ""


class LoginIn(BaseModel):
    email: str
    password: str


class SettingsIn(BaseModel):
    language: Optional[str] = None
    theme: Optional[str] = None
    anchor_times: Optional[str] = None


class CaregiverBase(BaseModel):
    name: str
    phone: str
    relationship_type: str
    notification_enabled: bool = True


class CaregiverCreate(CaregiverBase):
    pass


class Caregiver(CaregiverBase):
    id: int
    patient_id: int

    class Config:
        orm_mode = True


class MedicationBase(BaseModel):
    name: str
    dose: str = ""
    frequency: str = ""
    time: str = ""
    instructions: str = ""
    active: bool = True
    expand: bool = False  # auto-map frequency to anchor times


class MedicationCreate(MedicationBase):
    pass


class Medication(MedicationBase):
    id: int
    patient_id: int
    simplified: str = ""
    status: str = "active"

    class Config:
        orm_mode = True


class DoseLogIn(BaseModel):
    status: str = "taken"
    scheduled_time: str = ""
    date: str = ""


class SymptomIn(BaseModel):
    text: str
    severity: int = 0


class FollowUpIn(BaseModel):
    title: str
    doctor: str = ""
    date_time: str = ""
    location: str = ""
    notes: str = ""


class ChatSendIn(BaseModel):
    receiver_id: int
    patient_id: int
    text: str = ""
    audio_base64: str = ""


class LinkConnectIn(BaseModel):
    code: str


class JournalIn(BaseModel):
    mood: int = 3
    energy: int = 3
    text: str = ""


class PlanIn(BaseModel):
    hospital: str = ""
    data: str = "{}"


class ReminderIn(BaseModel):
    message: str
    scheduled_for: str = ""
    recurrence: str = "once"
    channel: str = "text"


class FeedbackIn(BaseModel):
    type: str = "feedback"
    message: str


class NoteIn(BaseModel):
    event_type: str = "NOTE"
    description: str


class PatientCreate(BaseModel):
    name: str
    phone: str
    age: int = 0
    condition: str = ""
    discharge_date: str = ""
    emergency_contact: str = ""
    language: str = "en"


class RecoveryEventBase(BaseModel):
    event_type: str
    description: str
    severity: Optional[str] = None
    metadata_json: Optional[str] = None


class RecoveryEventCreate(RecoveryEventBase):
    pass


class RecoveryEvent(RecoveryEventBase):
    id: int
    patient_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class PatientBase(BaseModel):
    name: str
    language: str = "en"
    phone: str


class PatientCreateOld(PatientBase):
    pass


class Patient(PatientBase):
    id: int
    created_at: datetime
    caregivers: List[Caregiver] = []
    medications: List[Medication] = []

    class Config:
        orm_mode = True


class VoiceQueryRequest(BaseModel):
    query: str
    language: str = "en"


class VoiceQueryResponse(BaseModel):
    response_text: str
    action_taken: Optional[str] = None
    safety_status: str = "NORMAL"


class AIChatIn(BaseModel):
    patient_id: int
    message: str


class IntentIn(BaseModel):
    text: str


class SimplifyIn(BaseModel):
    text: str
