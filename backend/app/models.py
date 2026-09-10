from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, default="")
    role = Column(String, default="patient")  # patient | caregiver | family
    password_hash = Column(String)
    language = Column(String, default="en")
    theme = Column(String, default="light")
    anchor_times = Column(Text, default='{"morning":"08:00","afternoon":"14:00","evening":"20:00","night":"22:00"}')
    created_at = Column(DateTime, default=_now)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer, default=0)
    condition = Column(String, default="")
    discharge_date = Column(String, default="")
    emergency_contact = Column(String, default="")
    language = Column(String, default="en")
    phone = Column(String, unique=True, index=True)
    link_code = Column(String, unique=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=_now)

    caregivers = relationship("Caregiver", back_populates="patient")
    medications = relationship("Medication", back_populates="patient")
    recovery_events = relationship("RecoveryEvent", back_populates="patient")


class CareLink(Base):
    """Many-to-many patient <-> user (caregiver/family), replaces single FKs."""
    __tablename__ = "care_links"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    relationship = Column(String, default="caregiver")  # caregiver | family
    status = Column(String, default="active")  # active | revoked | pending
    created_at = Column(DateTime, default=_now)
    __table_args__ = (UniqueConstraint("patient_id", "user_id", name="uq_patient_user"),)


class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    name = Column(String)
    phone = Column(String)
    relationship_type = Column(String)
    notification_enabled = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="caregivers")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    name = Column(String, index=True)
    dose = Column(String)
    frequency = Column(String)
    time = Column(String)
    instructions = Column(String)
    simplified = Column(String, default="")
    color = Column(String, default="#7C3AED")
    batch = Column(String, default="", index=True)  # groups anchor-expanded rows
    status = Column(String, default="active")  # active | archived
    active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="medications")


class DoseLog(Base):
    __tablename__ = "dose_logs"
    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), index=True)
    scheduled_time = Column(String, default="")
    date = Column(String, index=True, default="")  # YYYY-MM-DD
    status = Column(String, default="pending")  # taken | missed | pending | snoozed
    taken_at = Column(DateTime, nullable=True)
    escalated = Column(Boolean, default=False)


class SymptomLog(Base):
    __tablename__ = "symptom_logs"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    symptoms = Column(Text, default="[]")  # JSON list
    severity = Column(Integer, default=0)  # 1-10
    notes = Column(String, default="")
    risk = Column(String, default="low")  # low | medium | high
    created_at = Column(DateTime, default=_now)


class FollowUp(Base):
    __tablename__ = "follow_ups"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    title = Column(String)
    doctor = Column(String, default="")
    date_time = Column(String, default="")
    location = Column(String, default="")
    notes = Column(String, default="")
    completed = Column(Boolean, default=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    text = Column(Text)
    audio_base64 = Column(Text, default="")  # voice note (data URL or raw base64)
    created_at = Column(DateTime, default=_now)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    mood = Column(Integer, default=3)  # 1-5
    energy = Column(Integer, default=3)  # 1-5
    text = Column(Text, default="")
    created_at = Column(DateTime, default=_now)


class DischargePlan(Base):
    __tablename__ = "discharge_plans"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    hospital = Column(String, default="")
    data = Column(Text, default="{}")  # JSON
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text)
    scheduled_for = Column(String, default="")
    recurrence = Column(String, default="once")
    channel = Column(String, default="text")  # text | voice
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=_now)


class NotificationLog(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)
    body = Column(String, default="")
    kind = Column(String, default="info")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(String, default="feedback")
    message = Column(Text)
    created_at = Column(DateTime, default=_now)


class RecoveryEvent(Base):
    __tablename__ = "recovery_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    event_type = Column(String, index=True) # MEDICATION_TAKEN, MEDICATION_MISSED, SYMPTOM_REPORTED, SAFETY_ALERT, FOLLOW_UP, CAREGIVER_ALERT
    description = Column(String)
    severity = Column(String, nullable=True) # For symptoms: mild, moderate, severe. For alerts: NORMAL, MONITOR, ESCALATE
    metadata_json = Column(Text, nullable=True) # To store any extra fields like 'symptom', 'trend'
    created_at = Column(DateTime, default=_now)

    patient = relationship("Patient", back_populates="recovery_events")
