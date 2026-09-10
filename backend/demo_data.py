"""Seed demo data: users, patient, link, meds, follow-up, journal, plan."""
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base  # noqa: E402
from app import models  # noqa: E402
from app.auth import hash_pw  # noqa: E402


def init_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    meena_user = models.User(name="Meena Rao", email="meena@sathi.demo", phone="555-0100",
                             role="patient", password_hash=hash_pw("demo1234"), language="en")
    priya = models.User(name="Priya", email="priya@sathi.demo", phone="555-0101",
                        role="caregiver", password_hash=hash_pw("demo1234"))
    son = models.User(name="Arjun", email="arjun@sathi.demo", phone="555-0102",
                      role="family", password_hash=hash_pw("demo1234"))
    db.add_all([meena_user, priya, son])
    db.commit()

    meena = models.Patient(name="Meena Rao", age=62, condition="Post-discharge recovery",
                           discharge_date="2026-09-05", emergency_contact="Priya 555-0101",
                           language="en", phone="555-0100", link_code="DB-DEMO01",
                           owner_user_id=meena_user.id)
    db.add(meena)
    db.commit()
    db.refresh(meena)

    db.add_all([
        models.CareLink(patient_id=meena.id, user_id=priya.id, relationship="caregiver", status="active"),
        models.CareLink(patient_id=meena.id, user_id=son.id, relationship="family", status="active"),
        models.Caregiver(patient_id=meena.id, name="Priya", phone="555-0101", relationship_type="Daughter"),
    ])
    db.add_all([
        models.Medication(patient_id=meena.id, name="Amoxicillin 500mg", dose="1 capsule",
                          frequency="Twice daily", time="08:00 AM", instructions="Take PC",
                          simplified="Take 1 capsule by mouth twice a day after meals"),
        models.Medication(patient_id=meena.id, name="Paracetamol 650mg", dose="1 tablet",
                          frequency="SOS", time="02:00 PM", instructions="Take SOS for fever",
                          simplified="Take 1 tablet only when needed for fever"),
        models.Medication(patient_id=meena.id, name="Atorvastatin 40mg", dose="1 tablet",
                          frequency="Once daily", time="10:00 PM", instructions="Take HS",
                          simplified="Take 1 tablet at bedtime"),
    ])
    db.add(models.FollowUp(patient_id=meena.id, title="Cardiology review", doctor="Dr. Sharma",
                           date_time="18 Sept, 10:30 AM", location="City Hospital, Room 4"))
    db.add(models.DischargePlan(patient_id=meena.id, hospital="City Hospital",
                                data='{"medicines": [], "notes": "Walk daily, low salt diet"}', version=1))
    db.add(models.JournalEntry(user_id=meena_user.id, mood=4, energy=3, text="Feeling a little better today."))
    db.add(models.RecoveryEvent(patient_id=meena.id, event_type="FOLLOW_UP",
                                description="Follow-up appointment on 18 Sept, 10:30 AM"))
    db.commit()
    print("Seeded: meena@sathi.demo / priya@sathi.demo / arjun@sathi.demo (pw: demo1234), link DB-DEMO01")
    db.close()


if __name__ == "__main__":
    init_db()
