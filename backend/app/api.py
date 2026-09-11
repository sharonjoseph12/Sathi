"""Sathi full API: auth, meds, symptoms, chat+SSE, caregiver/family, AI, journal, plans.
Port of VAni core minus SOS/blood-network. Works offline-friendly with MOCK AI."""
import asyncio
import json
import logging
import random
import string
from datetime import datetime, timezone

logger = logging.getLogger("sathi.api")

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.auth import check_pw, clear_login_attempts, current_user, get_db, hash_pw, need_roles, rate_limit_login, token_for
from app.database import engine
from app import safety as S
from app.ai_engine import companion_reply

models.Base.metadata.create_all(bind=engine)


def _migrate():
    """Lightweight additive migration for existing demo DBs."""
    from sqlalchemy import text as _t
    with engine.connect() as c:
        try:
            cols = [r[1] for r in c.execute(_t("PRAGMA table_info(medications)")).all()]
            if "batch" not in cols:
                c.execute(_t("ALTER TABLE medications ADD COLUMN batch TEXT DEFAULT ''"))
            chat_cols = [r[1] for r in c.execute(_t("PRAGMA table_info(chat_messages)")).all()]
            if "audio_base64" not in chat_cols:
                c.execute(_t("ALTER TABLE chat_messages ADD COLUMN audio_base64 TEXT DEFAULT ''"))
            c.commit()
        except Exception:
            pass


_migrate()

router = APIRouter()

# ---------- helpers ----------

def _code() -> str:
    return "DB-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _event(db: Session, pid: int, kind: str, desc: str, sev=None, meta=None):
    e = models.RecoveryEvent(patient_id=pid, event_type=kind, description=desc, severity=sev,
                             metadata_json=json.dumps(meta or {}))
    db.add(e)
    return e


def _notify(db: Session, user_id: int, title: str, body: str = "", kind: str = "info"):
    db.add(models.NotificationLog(user_id=user_id, title=title, body=body, kind=kind))


def _linked_user_ids(db: Session, pid: int):
    rows = db.query(models.CareLink).filter(models.CareLink.patient_id == pid,
                                            models.CareLink.status == "active").all()
    return [r.user_id for r in rows]


def _can_access(db: Session, user: models.User, pid: int) -> models.Patient:
    p = db.query(models.Patient).filter(models.Patient.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if p.owner_user_id == user.id:
        return p
    link = db.query(models.CareLink).filter(models.CareLink.patient_id == pid,
                                            models.CareLink.user_id == user.id,
                                            models.CareLink.status == "active").first()
    if link:
        return p
    raise HTTPException(status_code=403, detail="No access to this patient")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------- auth ----------

@router.post("/auth/register")
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    role = body.role if body.role in ("patient", "caregiver", "family") else "patient"
    u = models.User(name=body.name, email=body.email, phone=body.phone, role=role,
                    password_hash=hash_pw(body.password))
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"token": token_for(u.id, u.role), "user": {"id": u.id, "name": u.name, "email": u.email, "role": u.role}}


@router.post("/auth/login")
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    rate_limit_login(body.email.strip().lower())
    u = db.query(models.User).filter(models.User.email == body.email).first()
    if not u or not check_pw(body.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    clear_login_attempts(body.email.strip().lower())
    links = db.query(models.CareLink).filter(models.CareLink.user_id == u.id,
                                             models.CareLink.status == "active").all()
    mine = db.query(models.Patient).filter(models.Patient.owner_user_id == u.id).all()
    return {"token": token_for(u.id, u.role),
            "user": {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "language": u.language},
            "patients": [{"id": p.id, "name": p.name} for p in mine] +
                        [{"id": l.patient_id, "name": f"Linked #{l.patient_id}"} for l in links]}


@router.get("/auth/me")
def me(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    links = db.query(models.CareLink).filter(models.CareLink.user_id == user.id,
                                             models.CareLink.status == "active").all()
    out = []
    for p in db.query(models.Patient).filter(models.Patient.owner_user_id == user.id).all():
        out.append({"id": p.id, "name": p.name, "rel": "owner"})
    for l in links:
        p = db.query(models.Patient).filter(models.Patient.id == l.patient_id).first()
        out.append({"id": l.patient_id, "name": p.name if p else f"#{l.patient_id}", "rel": l.relationship})
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role,
            "language": user.language, "theme": user.theme, "anchor_times": user.anchor_times,
            "patients": out}


@router.put("/users/settings")
def settings(body: schemas.SettingsIn, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    if body.language:
        user.language = body.language
    if body.theme:
        user.theme = body.theme
    if body.anchor_times:
        user.anchor_times = body.anchor_times
    db.commit()
    return {"status": "ok"}


# ---------- patients & links ----------

@router.post("/patients")
def create_patient(body: schemas.PatientCreate, user: models.User = Depends(current_user),
                   db: Session = Depends(get_db)):
    p = models.Patient(name=body.name, phone=body.phone, age=body.age, condition=body.condition,
                       discharge_date=body.discharge_date, emergency_contact=body.emergency_contact,
                       language=body.language, link_code=_code(), owner_user_id=user.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    _event(db, p.id, "NOTE", f"Recovery plan created for {p.name}")
    db.commit()
    return {"id": p.id, "name": p.name, "link_code": p.link_code}


@router.get("/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    return _can_access(db, user, patient_id)


@router.get("/patients/{patient_id}/link-code")
def link_code(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    p = _can_access(db, user, patient_id)
    if not p.link_code:
        p.link_code = _code()
        db.commit()
    return {"code": p.link_code}


@router.post("/links/connect")
def connect(body: schemas.LinkConnectIn, user: models.User = Depends(need_roles("caregiver", "family")),
            db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.link_code == body.code.strip().upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Invalid link code")
    rel = "family" if user.role == "family" else "caregiver"
    ex = db.query(models.CareLink).filter(models.CareLink.patient_id == p.id,
                                          models.CareLink.user_id == user.id).first()
    if ex:
        ex.status = "active"
        ex.relationship = rel
    else:
        db.add(models.CareLink(patient_id=p.id, user_id=user.id, relationship=rel, status="active"))
    _event(db, p.id, "CAREGIVER_ALERT", f"{user.name} linked as {rel}")
    db.commit()
    return {"status": "ok", "patient_id": p.id, "patient_name": p.name}


@router.get("/links/mine")
def my_links(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"patient_id": l.patient_id, "relationship": l.relationship, "status": l.status}
            for l in db.query(models.CareLink).filter(models.CareLink.user_id == user.id).all()]


# ---------- medications ----------

@router.get("/patients/{patient_id}/medications", response_model=List[schemas.Medication])
def get_medications(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    return db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                              models.Medication.status == "active").all()


@router.post("/patients/{patient_id}/medications")
def add_medication(patient_id: int, body: schemas.MedicationCreate, user: models.User = Depends(current_user),
                   db: Session = Depends(get_db)):
    p = _can_access(db, user, patient_id)
    simp = S.simplify_jargon(body.instructions or "")["simplified"]
    slots = []
    if body.expand:
        try:
            anchors = json.loads(p.owner_user_id and db.query(models.User)
                                 .filter(models.User.id == p.owner_user_id).first().anchor_times or "{}")
        except Exception:
            anchors = {}
        anchors = {"morning": "08:00", "afternoon": "14:00", "evening": "20:00", "night": "22:00", **anchors}
        slots = S.expand_frequency(f"{body.frequency} {body.instructions}", anchors)
    import uuid as _uuid
    batch = _uuid.uuid4().hex[:8] if slots else ""
    made = []
    for label, t in (slots or [("", body.time)]):
        m = models.Medication(patient_id=patient_id, name=body.name, dose=body.dose, frequency=body.frequency,
                              time=t or body.time, instructions=body.instructions, simplified=simp,
                              active=body.active, status="active" if body.active else "archived", batch=batch)
        db.add(m)
        made.append((label, t))
    _event(db, patient_id, "NOTE", f"Medication added: {body.name}" +
           (f" → {len(made)} slots ({', '.join(t for _, t in made)})" if slots else ""))
    db.commit()
    first = db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                               models.Medication.batch == batch).first() if batch else None
    if first:
        return {"status": "ok", "expanded": made, "batch": batch, "id": first.id}
    m0 = db.query(models.Medication).filter(models.Medication.patient_id == patient_id)\
        .order_by(models.Medication.id.desc()).first()
    return {"status": "ok", "id": m0.id, "simplified": simp}


@router.put("/patients/{patient_id}/medications/{medication_id}", response_model=schemas.Medication)
def edit_medication(patient_id: int, medication_id: int, body: schemas.MedicationCreate,
                    user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    m = db.query(models.Medication).filter(models.Medication.id == medication_id,
                                           models.Medication.patient_id == patient_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medication not found")
    for k in ("name", "dose", "frequency", "time", "instructions", "active"):
        setattr(m, k, getattr(body, k))
    m.simplified = S.simplify_jargon(body.instructions or "")["simplified"]
    m.status = "active" if body.active else "archived"
    db.commit()
    db.refresh(m)
    return m


@router.delete("/patients/{patient_id}/medications/{medication_id}")
def del_medication(patient_id: int, medication_id: int, user: models.User = Depends(current_user),
                   db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    m = db.query(models.Medication).filter(models.Medication.id == medication_id,
                                           models.Medication.patient_id == patient_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medication not found")
    m.status = "archived"
    m.active = False
    if getattr(m, "batch", ""):
        for sib in db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                                      models.Medication.batch == m.batch).all():
            sib.status = "archived"
            sib.active = False
    db.commit()
    return {"status": "archived"}


@router.post("/patients/{patient_id}/medications/{medication_id}/confirm")
def confirm_medication(patient_id: int, medication_id: int, user: models.User = Depends(current_user),
                       db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    med = db.query(models.Medication).filter(models.Medication.id == medication_id,
                                             models.Medication.patient_id == patient_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    _log_dose(db, med, "taken", med.time or "", _today())
    _event(db, patient_id, "MEDICATION_TAKEN", f"Confirmed taking {med.name}")
    db.commit()
    return {"status": "success"}


@router.post("/patients/{patient_id}/medications/{medication_id}/log")
def log_dose(patient_id: int, medication_id: int, body: schemas.DoseLogIn,
             user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    med = db.query(models.Medication).filter(models.Medication.id == medication_id,
                                             models.Medication.patient_id == patient_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    st = body.status if body.status in ("taken", "missed", "snoozed", "pending") else "pending"
    log = _log_dose(db, med, st, body.scheduled_time or med.time or "", body.date or _today())
    _event(db, patient_id, "MEDICATION_TAKEN" if st == "taken" else "MEDICATION_MISSED",
           f"{med.name} marked {st}", meta={"status": st})
    if st == "missed" and not log.escalated:
        log.escalated = True
        for uid in _linked_user_ids(db, patient_id):
            _notify(db, uid, "Missed dose", f"{med.name} marked missed.", kind="MISSED_DOSE")
        _event(db, patient_id, "CAREGIVER_ALERT", f"Caregiver notified: missed {med.name}")
    db.commit()
    return {"status": "success", "dose_status": st}


def _log_dose(db: Session, med: models.Medication, st: str, sched: str, date: str) -> models.DoseLog:
    ex = db.query(models.DoseLog).filter(models.DoseLog.medication_id == med.id,
                                         models.DoseLog.date == date,
                                         models.DoseLog.scheduled_time == sched).first()
    if ex:
        ex.status = st
        ex.taken_at = datetime.now(timezone.utc) if st == "taken" else None
        return ex
    log = models.DoseLog(medication_id=med.id, scheduled_time=sched, date=date, status=st,
                         taken_at=datetime.now(timezone.utc) if st == "taken" else None)
    db.add(log)
    return log


@router.get("/patients/{patient_id}/doses/today")
def doses_today(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    meds = db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                              models.Medication.status == "active").all()
    ids = [m.id for m in meds]
    logs = {l.medication_id: l.status for l in
            db.query(models.DoseLog).filter(models.DoseLog.medication_id.in_(ids),
                                            models.DoseLog.date == _today()).all()} if ids else {}
    return [{"medication_id": m.id, "name": m.name, "time": m.time, "status": logs.get(m.id, "pending")}
            for m in meds]


# ---------- symptoms ----------

@router.post("/patients/{patient_id}/symptoms")
def report_symptom(patient_id: int, body: schemas.SymptomIn, user: models.User = Depends(current_user),
                   db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    risk = S.risk_from_severity(body.severity or None, body.text)
    db.add(models.SymptomLog(patient_id=patient_id, symptoms=json.dumps([body.text]),
                             severity=body.severity or 0, risk=risk))
    sev_label = "severe" if (body.severity or 0) >= 7 else ("moderate" if (body.severity or 0) >= 4 else "unknown")
    safety_status = S.evaluate_safety_symptom(body.text, sev_label)
    _event(db, patient_id, "SYMPTOM_REPORTED", f"Reported: {body.text}",
           sev=safety_status, meta={"severity": body.severity})
    
    ai_followup = ""
    if safety_status != "ESCALATE":
        from app import groq_client as GC
        try:
            res = GC.chat([
                {"role": "system", "content": "You are a post-hospital care nurse. The patient logged a symptom. Ask a single, short follow-up clarifying question (under 10 words). No pleasantries, just the question."},
                {"role": "user", "content": f"Patient reported: {body.text}"}
            ], temperature=0.3, max_tokens=50)
            if res:
                ai_followup = res.strip().replace('"', '')
        except Exception:
            pass

    if safety_status == "ESCALATE":
        _event(db, patient_id, "SAFETY_ALERT", "Safety review triggered", sev="ESCALATE")
        _event(db, patient_id, "CAREGIVER_ALERT", "Caregiver notified of potential concern")
        for uid in _linked_user_ids(db, patient_id):
            _notify(db, uid, "Symptom alert", body.text[:120], kind="SYMPTOM_ALERT")
    db.commit()
    return {"status": "success", "safety_status": safety_status, "risk": risk, "ai_followup": ai_followup}



@router.get("/patients/{patient_id}/symptoms")
def list_symptoms(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    rows = db.query(models.SymptomLog).filter(models.SymptomLog.patient_id == patient_id)\
        .order_by(models.SymptomLog.created_at.desc()).limit(50).all()
    return [{"id": r.id, "symptoms": json.loads(r.symptoms or "[]"), "severity": r.severity,
             "risk": r.risk, "notes": r.notes, "at": r.created_at} for r in rows]


# ---------- follow-ups / timeline / stats ----------

@router.get("/patients/{patient_id}/followups")
def list_fu(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    return [{"id": f.id, "title": f.title, "doctor": f.doctor, "date_time": f.date_time,
             "location": f.location, "notes": f.notes, "completed": f.completed}
            for f in db.query(models.FollowUp).filter(models.FollowUp.patient_id == patient_id).all()]


@router.post("/patients/{patient_id}/followups")
def add_fu(patient_id: int, body: schemas.FollowUpIn, user: models.User = Depends(current_user),
           db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    f = models.FollowUp(patient_id=patient_id, title=body.title, doctor=body.doctor,
                        date_time=body.date_time, location=body.location, notes=body.notes)
    db.add(f)
    _event(db, patient_id, "FOLLOW_UP", f"Follow-up: {body.title} {body.date_time}".strip())
    db.commit()
    return {"status": "ok", "id": f.id}


@router.post("/patients/{patient_id}/followups/{fid}/done")
def done_fu(patient_id: int, fid: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    f = db.query(models.FollowUp).filter(models.FollowUp.id == fid, models.FollowUp.patient_id == patient_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    f.completed = True
    db.commit()
    return {"status": "ok"}


@router.get("/patients/{patient_id}/timeline")
def get_timeline(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    rows = db.query(models.RecoveryEvent).filter(models.RecoveryEvent.patient_id == patient_id)\
        .order_by(models.RecoveryEvent.created_at.desc()).limit(100).all()
    return [{"id": r.id, "event_type": r.event_type, "description": r.description,
             "severity": r.severity, "created_at": r.created_at} for r in rows]


@router.post("/patients/{patient_id}/timeline")
def add_note(patient_id: int, body: schemas.NoteIn, user: models.User = Depends(current_user),
             db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    _event(db, patient_id, body.event_type, body.description)
    db.commit()
    return {"status": "ok"}


@router.get("/patients/{patient_id}/stats")
def stats(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    meds = db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                              models.Medication.status == "active").all()
    ids = [m.id for m in meds]
    today_logs = db.query(models.DoseLog).filter(models.DoseLog.medication_id.in_(ids),
                                                 models.DoseLog.date == _today()).all() if ids else []
    taken_today = sum(1 for l in today_logs if l.status == "taken")
    total = len(meds) or 1
    pct = round(taken_today / total * 100)
    dates = sorted({l.date for l in db.query(models.DoseLog)
                    .filter(models.DoseLog.medication_id.in_(ids), models.DoseLog.status == "taken").all()} if ids else set())
    streak = len(dates)
    xp = sum(10 for _ in db.query(models.DoseLog)
             .filter(models.DoseLog.medication_id.in_(ids), models.DoseLog.status == "taken").all()) if ids else 0
    fu = db.query(models.FollowUp).filter(models.FollowUp.patient_id == patient_id,
                                          models.FollowUp.completed == False).first()  # noqa: E712
    week = []
    for back in range(6, -1, -1):
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d") if back == 0 else \
            datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() - back * 86400, timezone.utc).strftime("%Y-%m-%d")
        tk = sum(1 for l in db.query(models.DoseLog).filter(models.DoseLog.medication_id.in_(ids),
                                                            models.DoseLog.date == day,
                                                            models.DoseLog.status == "taken").all()) if ids else 0
        week.append({"date": day, "pct": round(tk / total * 100) if total else 0})
    return {"adherence": pct, "taken_today": taken_today, "total": len(meds), "streak": streak, "xp": xp,
            "next_followup": f"{fu.title} {fu.date_time}".strip() if fu else None, "week": week}


@router.get("/patients/{patient_id}/ai-report")
def ai_report(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    tl = get_timeline(patient_id, user, db)
    meds = db.query(models.Medication).filter(models.Medication.patient_id == patient_id).all()
    adherence = stats(patient_id, user, db)

    def _fmt_ts(e: dict) -> str:
        ts = e.get("created_at", "")
        s = str(ts)[:10] if ts else "—"
        return f"- {s}: {e.get('event_type', '')} - {e.get('description', '')}"

    tl_str = "\n".join(_fmt_ts(e) for e in tl[:20]) or "No recent events."
    meds_str = ", ".join(m.name for m in meds) or "none listed"
    
    prompt = f"""You are a clinical AI assistant. Write a concise, 3-paragraph summary of this patient's recovery over the last week for their doctor to read.
The paragraphs should be: 1. Overall Progress, 2. Medication Adherence, 3. Notable Concerns.
Be professional and clinical.

Patient Data:
Adherence: {adherence['adherence']}%
Active Meds: {meds_str}
Recent Timeline:
{tl_str}
"""
    from app import groq_client as GC
    report = "AI report could not be generated at this time."
    try:
        res = GC.chat([{"role": "system", "content": prompt}], temperature=0.2, max_tokens=500)
        if res:
            report = res.strip()
    except Exception:
        pass
    
    return {"report": report}


# ---------- chat + SSE ----------

_subs: dict[int, list[asyncio.Queue]] = {}


def _push(uid: int, payload: dict):
    for q in _subs.get(uid, []):
        try:
            q.put_nowait(payload)
        except Exception:
            pass


@router.get("/chat/stream")
async def chat_stream(token: str = Query("")):
    import jwt as _jwt
    from app.auth import SECRET, ALGO

    try:
        data = _jwt.decode(token, SECRET, algorithms=[ALGO])
        uid = int(data["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    q: asyncio.Queue = asyncio.Queue()
    _subs.setdefault(uid, []).append(q)

    async def gen():
        yield 'data: {"type":"connected"}\n\n'
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=25)
                    yield f"data: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            try:
                _subs.get(uid, []).remove(q)
            except ValueError:
                pass

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/chat/messages")
def send_chat(body: schemas.ChatSendIn, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, body.patient_id)
    peer = db.query(models.User).filter(models.User.id == body.receiver_id).first()
    if not peer:
        raise HTTPException(status_code=404, detail="Recipient not found")
    m = models.ChatMessage(sender_id=user.id, receiver_id=body.receiver_id,
                           patient_id=body.patient_id, text=body.text or "",
                           audio_base64=(body.audio_base64 or "")[:500000])
    db.add(m)
    db.commit()
    db.refresh(m)
    payload = {"type": "message", "data": {"id": m.id, "senderId": user.id, "receiverId": body.receiver_id,
                                           "patientContextId": body.patient_id, "text": body.text,
                                           "hasAudio": bool(body.audio_base64),
                                           "createdAt": m.created_at.isoformat()}}
    _push(body.receiver_id, payload)
    _notify(db, body.receiver_id, f"New message from {user.name}",
            ("🎤 Voice message" if body.audio_base64 and not body.text else (body.text or "")[:100]), kind="CHAT")
    db.commit()
    return {"status": "sent", "id": m.id}


@router.get("/chat/messages")
def history(patient_id: int, peer_id: int, user: models.User = Depends(current_user),
            db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    rows = db.query(models.ChatMessage).filter(models.ChatMessage.patient_id == patient_id,
        ((models.ChatMessage.sender_id == user.id) & (models.ChatMessage.receiver_id == peer_id)) |
        ((models.ChatMessage.sender_id == peer_id) & (models.ChatMessage.receiver_id == user.id)))\
        .order_by(models.ChatMessage.created_at.asc()).limit(100).all()
    return [{"id": r.id, "senderId": r.sender_id, "text": r.text,
             "audio": r.audio_base64 or "", "at": r.created_at} for r in rows]


# ---------- caregiver & family ----------

@router.get("/caregiver/patients")
def cg_patients(user: models.User = Depends(need_roles("caregiver", "family")), db: Session = Depends(get_db)):
    links = db.query(models.CareLink).filter(models.CareLink.user_id == user.id,
                                             models.CareLink.status == "active").all()
    cards = []
    for l in links:
        p = db.query(models.Patient).filter(models.Patient.id == l.patient_id).first()
        if not p:
            continue
        meds = db.query(models.Medication).filter(models.Medication.patient_id == p.id,
                                                  models.Medication.status == "active").all()
        ids = [m.id for m in meds]
        logs = {x.medication_id: x.status for x in db.query(models.DoseLog)
                .filter(models.DoseLog.medication_id.in_(ids), models.DoseLog.date == _today()).all()} if ids else []
        taken = sum(1 for v in logs.values() if v == "taken")
        syms = db.query(models.SymptomLog).filter(models.SymptomLog.patient_id == p.id)\
            .order_by(models.SymptomLog.created_at.desc()).limit(3).all()
        risk = syms[0].risk if syms else "low"
        cards.append({"id": p.id, "name": p.name, "condition": p.condition, "rel": l.relationship,
                      "adherence": round(taken / (len(meds) or 1) * 100), "risk": risk,
                      "recent": [json.loads(s.symptoms or "[]")[0] if json.loads(s.symptoms or "[]") else "" for s in syms]})
    return cards


@router.get("/caregiver/patients/{pid}")
def cg_detail(pid: int, user: models.User = Depends(need_roles("caregiver", "family")),
              db: Session = Depends(get_db)):
    _can_access(db, user, pid)
    return {"timeline": get_timeline(pid, user, db), "symptoms": list_symptoms(pid, user, db),
            "doses": doses_today(pid, user, db), "followups": list_fu(pid, user, db)}


@router.post("/caregiver/patients/{pid}/nudge")
def nudge(pid: int, msg: str = "Thinking of you — keep up the recovery!",
          user: models.User = Depends(need_roles("caregiver", "family")), db: Session = Depends(get_db)):
    p = _can_access(db, user, pid)
    owner = db.query(models.User).filter(models.User.id == p.owner_user_id).first()
    targets = [owner.id] if owner else []
    if targets:
        since = datetime.now(timezone.utc).timestamp() - 3600
        recent = sum(1 for n in db.query(models.NotificationLog)
                     .filter(models.NotificationLog.user_id.in_(targets),
                             models.NotificationLog.kind == "NUDGE").all()
                     if n.created_at and n.created_at.replace(tzinfo=timezone.utc).timestamp() > since
                     and (n.title or "").endswith(user.name))
        if recent >= 3:
            raise HTTPException(status_code=429, detail="Nudge limit: 3 per hour per patient")
    for uid in targets:
        _notify(db, uid, f"Message from {user.name}", msg, kind="NUDGE")
        _push(uid, {"type": "notification", "data": {"title": f"Message from {user.name}", "body": msg}})
    db.commit()
    return {"status": "sent"}


@router.get("/family/overview")
def family_overview(user: models.User = Depends(need_roles("family", "caregiver")), db: Session = Depends(get_db)):
    return cg_patients(user, db)


# ---------- AI ----------

@router.post("/ai/chat")
def ai_chat(body: schemas.AIChatIn, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    p = _can_access(db, user, body.patient_id)
    meds = db.query(models.Medication).filter(models.Medication.patient_id == p.id,
                                              models.Medication.status == "active").all()
    syms = db.query(models.SymptomLog).filter(models.SymptomLog.patient_id == p.id)\
        .order_by(models.SymptomLog.created_at.desc()).limit(5).all()
    st = stats(body.patient_id, user, db)
    fu = db.query(models.FollowUp).filter(models.FollowUp.patient_id == p.id,
                                          models.FollowUp.completed == False).first()  # noqa: E712
    ctx = {"name": p.name, "meds": [{"name": m.name, "time": m.time} for m in meds],
           "symptoms": [{"text": json.loads(s.symptoms or '[""]')[0], "risk": s.risk} for s in syms],
           "adherence": st["adherence"],
           "next_followup": f"{fu.title} {fu.date_time}".strip() if fu else None,
           "risk": syms[0].risk if syms else "low"}
    intent = S.route_intent(body.message)
    reply = companion_reply(body.message, ctx)
    safety_flag = S.evaluate_safety_symptom(body.message)
    if safety_flag == "ESCALATE":
        reply = {"message": "What you describe could need prompt medical attention. Please contact your doctor or local emergency number now, and I have flagged this for your caregiver.",
                 "actions": []}
        _event(db, p.id, "SAFETY_ALERT", f"AI chat flagged: {body.message[:100]}", sev="ESCALATE")
        db.commit()
    return {**reply, "intent": intent, "safety": safety_flag}


@router.post("/ai/intent")
def ai_intent(body: schemas.IntentIn):
    return S.route_intent(body.text)


@router.post("/ai/simplify")
def ai_simplify(body: schemas.SimplifyIn):
    return S.simplify_jargon(body.text)


@router.post("/ai/drug-check")
def ai_drugcheck(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    meds = db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                              models.Medication.status == "active").all()
    return S.drug_check([m.name for m in meds])


@router.post("/ai/handwriting-ocr")
async def ai_handwriting_ocr(payload: dict, user: models.User = Depends(current_user)):
    """Analyze doctor's handwritten prescription using Hugging Face Donut model chinmays18/medical-prescription-ocr."""
    import asyncio
    from app import handwriting_ocr

    image_b64 = (payload.get("image") or "").strip()
    if not image_b64:
        return {"medicines": [], "overall_instructions": "", "raw_text": "", "needs_review": True,
                "message": "No image provided. Please upload a prescription photo."}

    try:
        # Run CPU/GPU heavy model inference in a thread pool to avoid blocking async loop
        result = await asyncio.to_thread(handwriting_ocr.process_prescription_handwriting, image_b64)
        return result
    except Exception as exc:
        logging.getLogger("sathi.api").error(f"Handwriting OCR error: {exc}", exc_info=True)
        return {
            "medicines": [],
            "overall_instructions": "",
            "raw_text": "",
            "needs_review": True,
            "message": f"Handwriting model processing encountered an issue: {exc}. Please verify manually.",
        }


@router.post("/ai/ocr")
async def ai_ocr(payload: dict, user: models.User = Depends(current_user)):
    """Extract prescription details. Supports engine='donut' (Hugging Face handwriting) or 'groq' (Vision)."""
    engine = (payload.get("engine") or "").lower().strip()
    if engine in ("donut", "handwriting", "chinmays18"):
        return await ai_handwriting_ocr(payload, user)

    from app import groq_client as GC
    image_b64 = (payload.get("image") or "").strip()
    if not image_b64:
        return {"medicines": [], "overall_instructions": "", "needs_review": True,
                "message": "No image provided. Please upload a prescription photo."}

    # Strip data URL prefix if present
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    OCR_PROMPT = """Analyze this prescription/discharge document image and extract all medicines.
Return ONLY a JSON object with this exact structure:
{
  "medicines": [
    {"name": "Medicine Name", "dose": "500mg", "frequency": "Twice daily", "time": "08:00 AM", "instructions": "after meals"}
  ],
  "overall_instructions": "any general instructions from the document"
}
Rules:
- Extract exact medicine names, dosages, frequencies, and timing.
- Convert abbreviations: OD=once daily, BD=twice daily, TDS=three times daily, PO=by mouth, PC=after meals, AC=before meals.
- If any field is unclear, use empty string — NEVER guess doses.
- Return ONLY the JSON, no other text."""

    raw = GC.vision(image_b64, OCR_PROMPT)
    if not raw:
        return {"medicines": [], "overall_instructions": "", "needs_review": True,
                "message": "AI extraction unavailable. Please add medicines manually — never guess doses from a photo."}

    try:
        import re as _re
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = _re.sub(r"^```\w*\n?", "", cleaned)
            cleaned = _re.sub(r"\n?```$", "", cleaned)
        data = json.loads(cleaned)
        meds = data.get("medicines", [])
        overall = data.get("overall_instructions", "")
        return {"medicines": meds, "overall_instructions": overall, "needs_review": True,
                "message": f"{len(meds)} medicine(s) detected by AI — review everything before importing."}
    except (json.JSONDecodeError, ValueError):
        return {"medicines": [], "overall_instructions": "", "needs_review": True,
                "message": "AI could not parse the image clearly. Please add medicines manually."}



# ---------- voice: server STT (Groq Whisper) + TTS (Edge neural, no key) ----------

@router.post("/ai/transcribe")
def ai_transcribe(payload: dict, user: models.User = Depends(current_user)):
    """Transcribe a voice note (data-URL audio) via Groq Whisper-large-v3-turbo.

    Lets voice input work in browsers without Web Speech support. Returns
    {"text", "language"} or {"text": "", "message"} on graceful failure."""
    import base64 as _b64
    audio_b64 = ((payload or {}).get("audio") or "").strip()
    if not audio_b64:
        return {"text": "", "message": "No audio provided."}
    if "," in audio_b64:
        audio_b64 = audio_b64.split(",", 1)[1]
    if len(audio_b64) > 12_000_000:
        return {"text": "", "message": "Audio too long — keep voice notes under ~2 minutes."}
    try:
        raw = _b64.b64decode(audio_b64)
    except Exception:
        return {"text": "", "message": "Could not decode audio. Please try again."}
    import os as _os
    if not _os.getenv("GROQ_API_KEY"):
        return {"text": "", "message": "Voice transcription is not configured on the server."}
    try:
        from groq import Groq as _Groq
        r = _Groq().audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=("voice.webm", raw),
            response_format="verbose_json",
        )
        text = (getattr(r, "text", "") or "").strip()
        lang = getattr(r, "language", "") or ""
        return {"text": text, "language": lang}
    except Exception as e:
        print(f"[whisper] transcribe error: {e}")
        return {"text": "", "message": "Transcription failed — please type instead."}


_TTS_VOICES = {
    "en": "en-IN-NeerjaNeural", "hi": "hi-IN-SwaraNeural", "kn": "kn-IN-SapnaNeural",
    "ta": "ta-IN-PallaviNeural", "te": "te-IN-ShrutiNeural", "bn": "bn-IN-TanishaaNeural",
    "mr": "mr-IN-AarohiNeural", "gu": "gu-IN-DhwaniNeural", "ml": "ml-IN-SobhanaNeural",
    "ur": "ur-PK-AsadNeural", "es": "es-ES-ElviraNeural", "pa": "pa-IN-GaganNeural",
}


@router.post("/ai/speak")
async def ai_speak(payload: dict, user: models.User = Depends(current_user)):
    """Neural TTS via Microsoft Edge voices (no API key). Returns mp3 data-URL.

    Client plays this when available and falls back to browser speechSynthesis."""
    import base64 as _b64
    import os as _os
    import tempfile as _tf
    text = str((payload or {}).get("text") or "").strip()[:500]
    lang = str((payload or {}).get("lang") or "en").split("-")[0]
    if not text:
        return {"audio": "", "message": "No text provided."}
    try:
        import edge_tts as _edge
    except ImportError:
        return {"audio": "", "message": "Server voice not installed."}
    voice = _TTS_VOICES.get(lang, _TTS_VOICES["en"])
    tmp = _tf.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp.close()
    try:
        await _edge.Communicate(text, voice).save(tmp.name)
        with open(tmp.name, "rb") as f:
            audio = _b64.b64encode(f.read()).decode()
        return {"audio": "data:audio/mpeg;base64," + audio, "voice": voice}
    except Exception as e:
        print(f"[edge-tts] speak error: {e}")
        return {"audio": "", "message": "Server voice failed — using on-device voice."}
    finally:
        try:
            _os.remove(tmp.name)
        except Exception:
            pass



@router.post("/patients/{patient_id}/symptoms/text")
def report_symptom_text(patient_id: int, symptom_text: str = Query(...), severity: str = Query("unknown"),
                        user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    sev = 8 if severity == "severe" else (4 if severity == "moderate" else 0)
    return report_symptom(patient_id, schemas.SymptomIn(text=symptom_text, severity=sev), user, db)


# ---------- journal / plans / reminders / notifications / support ----------

@router.get("/journal")
def journal_list(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(models.JournalEntry).filter(models.JournalEntry.user_id == user.id)\
        .order_by(models.JournalEntry.created_at.desc()).limit(30).all()
    return [{"id": r.id, "mood": r.mood, "energy": r.energy, "text": r.text, "at": r.created_at} for r in rows]


@router.post("/journal")
def journal_add(body: schemas.JournalIn, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    db.add(models.JournalEntry(user_id=user.id, mood=body.mood, energy=body.energy, text=body.text))
    db.commit()
    return {"status": "ok"}


@router.get("/patients/{patient_id}/plans")
def plans(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    rows = db.query(models.DischargePlan).filter(models.DischargePlan.patient_id == patient_id)\
        .order_by(models.DischargePlan.version.desc()).all()
    return [{"id": r.id, "hospital": r.hospital, "version": r.version, "is_active": r.is_active,
             "data": r.data, "at": r.created_at} for r in rows]


@router.post("/patients/{patient_id}/plans")
def plans_add(patient_id: int, body: schemas.PlanIn, user: models.User = Depends(current_user),
              db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    last = db.query(models.DischargePlan).filter(models.DischargePlan.patient_id == patient_id)\
        .order_by(models.DischargePlan.version.desc()).first()
    v = (last.version + 1) if last else 1
    for r in db.query(models.DischargePlan).filter(models.DischargePlan.patient_id == patient_id).all():
        r.is_active = False
    plan = models.DischargePlan(patient_id=patient_id, hospital=body.hospital, data=body.data, version=v, is_active=True)
    db.add(plan)
    try:  # auto-import simple med list: [{"name","dose","time",...}]
        for m in json.loads(body.data or "{}").get("medicines", []):
            if m.get("name"):
                db.add(models.Medication(patient_id=patient_id, name=m["name"], dose=m.get("dose", ""),
                                         frequency=m.get("frequency", ""), time=m.get("time", "08:00 AM"),
                                         instructions=m.get("instructions", "")))
    except Exception:
        pass
    _event(db, patient_id, "NOTE", f"Discharge plan v{v} added")
    db.commit()
    return {"status": "ok", "version": v}


@router.get("/patients/{patient_id}/reminders")
def rems(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    return [{"id": r.id, "message": r.message, "scheduled_for": r.scheduled_for,
             "recurrence": r.recurrence, "channel": r.channel, "status": r.status}
            for r in db.query(models.Reminder).filter(models.Reminder.patient_id == patient_id).all()]


@router.post("/patients/{patient_id}/reminders")
def rems_add(patient_id: int, body: schemas.ReminderIn, user: models.User = Depends(current_user),
             db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    db.add(models.Reminder(patient_id=patient_id, sender_id=user.id, message=body.message,
                           scheduled_for=body.scheduled_for, recurrence=body.recurrence, channel=body.channel))
    db.commit()
    return {"status": "ok"}


@router.delete("/patients/{patient_id}/reminders/{rid}")
def rems_del(patient_id: int, rid: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _can_access(db, user, patient_id)
    r = db.query(models.Reminder).filter(models.Reminder.id == rid, models.Reminder.patient_id == patient_id).first()
    if r:
        db.delete(r)
        db.commit()
    return {"status": "ok"}


@router.get("/notifications")
def notifs(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(models.NotificationLog).filter(models.NotificationLog.user_id == user.id)\
        .order_by(models.NotificationLog.created_at.desc()).limit(30).all()
    return [{"id": r.id, "title": r.title, "body": r.body, "kind": r.kind, "read": r.read, "at": r.created_at}
            for r in rows]


@router.post("/notifications/{nid}/read")
def notif_read(nid: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    n = db.query(models.NotificationLog).filter(models.NotificationLog.id == nid,
                                                models.NotificationLog.user_id == user.id).first()
    if n:
        n.read = True
        db.commit()
    return {"status": "ok"}


@router.post("/support")
def support(body: schemas.FeedbackIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    db.add(models.Feedback(user_id=user.id, type=body.type, message=body.message))
    db.commit()
    return {"status": "thanks"}


# ---------- SOS / emergency ----------

@router.post("/patients/{patient_id}/sos/alert")
def sos_alert(patient_id: int, payload: dict, user: models.User = Depends(current_user),
              db: Session = Depends(get_db)):
    """Patient-triggered SOS: log escalation + notify every linked caregiver/family.

    No auto-dispatch is performed — the client directs the patient to dial
    112/108 while the care team is alerted. Works even when AI providers are down."""
    p = _can_access(db, user, patient_id)
    note = str((payload or {}).get("note") or "").strip()[:200]
    _event(db, patient_id, "SAFETY_ALERT", f"SOS triggered{(': ' + note) if note else ''}", sev="ESCALATE")
    _event(db, patient_id, "CAREGIVER_ALERT", "Care team notified of SOS")
    notified = 0
    for uid in _linked_user_ids(db, patient_id):
        _notify(db, uid, f"SOS alert from {p.name}",
                note or "Patient triggered an emergency alert. Please check in, or advise calling emergency services (112).",
                kind="SOS_ALERT")
        _push(uid, {"type": "notification",
                    "data": {"title": f"SOS alert from {p.name}", "body": note or "Emergency alert triggered."}})
        notified += 1
    db.commit()
    return {"status": "sent", "notified": notified}


@router.get("/patients/{patient_id}/emergency-card")
def emergency_card(patient_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Compact first-responder summary: identity, condition, meds, recent symptoms, contacts."""
    p = _can_access(db, user, patient_id)
    meds = db.query(models.Medication).filter(models.Medication.patient_id == patient_id,
                                              models.Medication.status == "active").all()
    syms = db.query(models.SymptomLog).filter(models.SymptomLog.patient_id == patient_id)\
        .order_by(models.SymptomLog.created_at.desc()).limit(3).all()
    fu = db.query(models.FollowUp).filter(models.FollowUp.patient_id == patient_id,
                                          models.FollowUp.completed == False).first()  # noqa: E712
    return {
        "name": p.name, "age": p.age, "condition": p.condition,
        "language": p.language, "emergency_contact": p.emergency_contact,
        "medications": [{"name": m.name, "dose": m.dose, "time": m.time} for m in meds],
        "recent_symptoms": [json.loads(s.symptoms or '[""]')[0] for s in syms],
        "next_followup": f"{fu.title} {fu.date_time}".strip() if fu else None,
        "note": "Sathi emergency card — support info only, not a medical record. Call 112 in an emergency.",
    }
