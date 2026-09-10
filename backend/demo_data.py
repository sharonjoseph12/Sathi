"""Seed rich demo data for judges: full week of adherence, symptoms + escalation,
SOS alert, caregiver/family views, chat, journal, plans, reminders, notifications.

Run:  cd backend; $env:PYTHONPATH='.'; python demo_data.py
Logins (pw: demo1234): meena@sathi.demo (patient), priya@sathi.demo (caregiver),
arjun@sathi.demo (family). Patient link code: DB-DEMO01.
"""
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base  # noqa: E402
from app import models  # noqa: E402
from app.auth import hash_pw  # noqa: E402

NOW = datetime.now(timezone.utc)


def days_ago(n: int, hour: int = 9, minute: int = 0) -> datetime:
    d = (NOW - timedelta(days=n)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return d


def day_str(n: int) -> str:
    return (NOW - timedelta(days=n)).strftime("%Y-%m-%d")


def init_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ---------- users ----------
    meena_user = models.User(name="Meena Rao", email="meena@sathi.demo", phone="555-0100",
                             role="patient", password_hash=hash_pw("demo1234"), language="en")
    priya = models.User(name="Priya", email="priya@sathi.demo", phone="555-0101",
                        role="caregiver", password_hash=hash_pw("demo1234"))
    arjun = models.User(name="Arjun", email="arjun@sathi.demo", phone="555-0102",
                        role="family", password_hash=hash_pw("demo1234"))
    db.add_all([meena_user, priya, arjun])
    db.commit()

    # ---------- patient ----------
    meena = models.Patient(name="Meena Rao", age=62, condition="Post-discharge recovery",
                           discharge_date="2026-09-05", emergency_contact="Priya 555-0101",
                           language="en", phone="555-0100", link_code="DB-DEMO01",
                           owner_user_id=meena_user.id)
    db.add(meena)
    db.commit()
    db.refresh(meena)

    db.add_all([
        models.CareLink(patient_id=meena.id, user_id=priya.id, relationship="caregiver", status="active"),
        models.CareLink(patient_id=meena.id, user_id=arjun.id, relationship="family", status="active"),
        models.Caregiver(patient_id=meena.id, name="Priya", phone="555-0101", relationship_type="Daughter"),
    ])

    # ---------- medications (includes Aspirin+Warfarin pair for drug-check demo) ----------
    meds = [
        models.Medication(patient_id=meena.id, name="Amoxicillin 500mg", dose="1 capsule",
                          frequency="Twice daily", time="08:00 AM", instructions="Take PC",
                          simplified="Take 1 capsule by mouth twice a day after meals"),
        models.Medication(patient_id=meena.id, name="Paracetamol 650mg", dose="1 tablet",
                          frequency="SOS", time="02:00 PM", instructions="Take SOS for fever",
                          simplified="Take 1 tablet only when needed for fever"),
        models.Medication(patient_id=meena.id, name="Atorvastatin 40mg", dose="1 tablet",
                          frequency="Once daily", time="10:00 PM", instructions="Take HS",
                          simplified="Take 1 tablet at bedtime"),
        models.Medication(patient_id=meena.id, name="Aspirin 75mg", dose="1 tablet",
                          frequency="Once daily", time="08:00 AM", instructions="Take OD PC",
                          simplified="Take 1 tablet once a day after meals"),
        models.Medication(patient_id=meena.id, name="Warfarin 5mg", dose="1 tablet",
                          frequency="Once daily", time="08:00 PM", instructions="Take OD",
                          simplified="Take 1 tablet once a day"),
    ]
    db.add_all(meds)
    db.commit()

    # ---------- dose logs: 7-day adherence story (taken) + 1 missed dose yesterday ----------
    for back in range(6, -1, -1):
        for m in meds[:3]:
            # Skip Paracetamol on some days (SOS med, not always taken) for realism
            if m.name.startswith("Paracetamol") and back in (5, 3, 1):
                continue
            db.add(models.DoseLog(medication_id=m.id, scheduled_time=m.time,
                                  date=day_str(back), status="taken",
                                  taken_at=days_ago(back, 8 if "08" in m.time else 14)))
    # One missed dose yesterday -> caregiver escalation story
    missed = models.DoseLog(medication_id=meds[4].id, scheduled_time=meds[4].time,
                            date=day_str(1), status="missed", escalated=True)
    db.add(missed)
    db.commit()

    # ---------- symptoms: mild headache (MONITOR) + breathless (ESCALATE) ----------
    db.add_all([
        models.SymptomLog(patient_id=meena.id, symptoms='["mild headache"]',
                          severity=3, risk="low", created_at=days_ago(2, 10)),
        models.SymptomLog(patient_id=meena.id, symptoms='["headache worse than yesterday"]',
                          severity=5, risk="medium", created_at=days_ago(1, 11)),
        models.SymptomLog(patient_id=meena.id, symptoms='["breathing feels worse than yesterday"]',
                          severity=8, risk="high", created_at=days_ago(0, 9)),
    ])
    db.commit()

    # ---------- recovery timeline: the full story judges can scroll ----------
    events = [
        (6, "NOTE", "Recovery plan created for Meena Rao", None),
        (6, "FOLLOW_UP", "Follow-up appointment on 18 Sept, 10:30 AM", None),
        (5, "MEDICATION_TAKEN", "Confirmed taking Amoxicillin 500mg", None),
        (4, "SYMPTOM_REPORTED", "Reported: mild headache", "MONITOR"),
        (3, "MEDICATION_TAKEN", "Confirmed taking Atorvastatin 40mg", None),
        (2, "SYMPTOM_REPORTED", "Reported: headache worse than yesterday", "MONITOR"),
        (1, "MEDICATION_MISSED", "Warfarin 5mg marked missed", None),
        (1, "CAREGIVER_ALERT", "Caregiver notified: missed Warfarin 5mg", None),
        (0, "SYMPTOM_REPORTED", "Reported: breathing feels worse than yesterday", "ESCALATE"),
        (0, "SAFETY_ALERT", "Safety review triggered", "ESCALATE"),
        (0, "CAREGIVER_ALERT", "Caregiver notified of potential concern", None),
        (0, "SAFETY_ALERT", "SOS triggered (demo drill)", "ESCALATE"),
        (0, "CAREGIVER_ALERT", "Care team notified of SOS", None),
    ]
    for back, kind, desc, sev in events:
        db.add(models.RecoveryEvent(patient_id=meena.id, event_type=kind, description=desc,
                                    severity=sev, created_at=days_ago(back, 12)))
    db.commit()

    # ---------- follow-ups: 1 upcoming + 1 completed ----------
    db.add_all([
        models.FollowUp(patient_id=meena.id, title="Cardiology review", doctor="Dr. Sharma",
                        date_time="18 Sept, 10:30 AM", location="City Hospital, Room 4"),
        models.FollowUp(patient_id=meena.id, title="Blood test (CBC)", doctor="City Lab",
                        date_time="08 Sept, 09:00 AM", location="City Lab", completed=True),
    ])

    # ---------- discharge plans: v1 + active v2 ----------
    db.add_all([
        models.DischargePlan(patient_id=meena.id, hospital="City Hospital",
                             data='{"medicines": [], "notes": "Walk daily, low salt diet"}',
                             version=1, is_active=False, created_at=days_ago(6)),
        models.DischargePlan(patient_id=meena.id, hospital="City Hospital",
                             data='{"medicines": [{"name": "Amoxicillin 500mg"}], "notes": "Walk daily, low salt diet, fluids"}',
                             version=2, is_active=True, created_at=days_ago(2)),
    ])

    # ---------- journal: 3 entries, improving mood ----------
    db.add_all([
        models.JournalEntry(user_id=meena_user.id, mood=2, energy=2,
                            text="Tired today, headache won't go.", created_at=days_ago(2)),
        models.JournalEntry(user_id=meena_user.id, mood=3, energy=3,
                            text="Bit better, took morning meds on time.", created_at=days_ago(1)),
        models.JournalEntry(user_id=meena_user.id, mood=4, energy=3,
                            text="Feeling a little better today.", created_at=days_ago(0)),
    ])

    # ---------- reminders from caregiver ----------
    db.add_all([
        models.Reminder(patient_id=meena.id, sender_id=priya.id, message="Evening walk at 6pm",
                        scheduled_for="06:00 PM daily", recurrence="daily", channel="text"),
        models.Reminder(patient_id=meena.id, sender_id=priya.id, message="Drink water with afternoon dose",
                        scheduled_for="02:00 PM daily", recurrence="daily", channel="voice"),
    ])

    # ---------- notifications: caregiver + family inboxes pre-loaded ----------
    db.add_all([
        models.NotificationLog(user_id=priya.id, title="Symptom alert",
                               body="breathing feels worse than yesterday", kind="SYMPTOM_ALERT",
                               created_at=days_ago(0, 9)),
        models.NotificationLog(user_id=priya.id, title="SOS alert from Meena Rao",
                               body="Demo drill SOS — care team notified.", kind="SOS_ALERT",
                               created_at=days_ago(0, 10)),
        models.NotificationLog(user_id=priya.id, title="Missed dose",
                               body="Warfarin 5mg marked missed.", kind="MISSED_DOSE",
                               created_at=days_ago(1, 20)),
        models.NotificationLog(user_id=arjun.id, title="SOS alert from Meena Rao",
                               body="Demo drill SOS — care team notified.", kind="SOS_ALERT",
                               created_at=days_ago(0, 10)),
        models.NotificationLog(user_id=meena_user.id, title="Message from Priya",
                               body="Thinking of you — keep up the recovery!", kind="NUDGE",
                               created_at=days_ago(0, 8)),
    ])

    # ---------- care-team chat thread ----------
    db.add_all([
        models.ChatMessage(sender_id=meena_user.id, receiver_id=priya.id, patient_id=meena.id,
                           text="Did I take my morning medicine?", created_at=days_ago(0, 8, 30)),
        models.ChatMessage(sender_id=priya.id, receiver_id=meena_user.id, patient_id=meena.id,
                           text="Yes, logged at 8 AM. Don't forget the 2 PM dose.", created_at=days_ago(0, 8, 35)),
        models.ChatMessage(sender_id=meena_user.id, receiver_id=priya.id, patient_id=meena.id,
                           text="My breathing feels a little worse today.", created_at=days_ago(0, 9, 5)),
    ])
    db.commit()
    db.close()
    print("Seeded full demo: meena/priya/arjun @demo (pw: demo1234), link DB-DEMO01")
    print("  7-day doses, 3 symptoms, 13 timeline events, SOS drill, chat thread,")
    print("  5 caregiver/family notifications, journal x3, plans v1+v2, reminders x2, Aspirin+Warfarin pair")


if __name__ == "__main__":
    init_db()
