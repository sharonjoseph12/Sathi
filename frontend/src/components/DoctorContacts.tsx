import { useState, useEffect } from "react";
import { Card, Btn, Input } from "./ui";
import {
  PhoneCall,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Stethoscope,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { speakSmart } from "../lib/voice";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";

export type DoctorContact = {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  phone: string;
  hours: string;
  notes?: string;
  isEmergency?: boolean;
};

const DEFAULT_DOCTORS: DoctorContact[] = [
  {
    id: "doc-1",
    name: "Dr. Rajesh Sharma",
    specialty: "Chief Cardiologist",
    hospital: "Apollo Heart Institute",
    phone: "+91 98200 12345",
    hours: "Mon – Sat, 10:00 AM – 4:00 PM",
    notes: "Primary cardiologist for post-stent recovery & cardiac monitoring.",
  },
  {
    id: "doc-2",
    name: "Dr. Anjali Mehta",
    specialty: "General Physician & Recovery",
    hospital: "Family Health Clinic",
    phone: "+91 98111 23456",
    hours: "Mon – Fri, 09:00 AM – 1:00 PM",
    notes: "Routine post-discharge reviews, blood pressure & vitals check.",
  },
  {
    id: "doc-3",
    name: "Hospital Emergency On-Call Desk",
    specialty: "24/7 Emergency Triage & ICU",
    hospital: "Apollo Emergency Wing",
    phone: "+91 98765 43210",
    hours: "24 Hours / 7 Days",
    notes: "Immediate triage dispatch & ambulance coordination.",
    isEmergency: true,
  },
];

const STORAGE_KEY = "@sathi_doctors_list";

export function DoctorContacts() {
  const profile = useAdaptiveProfile();
  const isElder = profile.isElder;

  const [doctors, setDoctors] = useState<DoctorContact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_DOCTORS;
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    hospital: "",
    phone: "",
    hours: "Mon – Sat, 10:00 AM – 2:00 PM",
    notes: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
    } catch { /* ignore */ }
  }, [doctors]);

  const callDoctor = (doc: DoctorContact) => {
    toast.info(`Calling ${doc.name}...`);
    void speakSmart(`Calling ${doc.name}`);
    window.location.href = `tel:${doc.phone.replace(/\s+/g, "")}`;
  };

  const addDoctor = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please enter Doctor's name and phone number.");
      return;
    }
    const newDoc: DoctorContact = {
      id: "doc-" + Date.now(),
      name: form.name.startsWith("Dr.") ? form.name : `Dr. ${form.name}`,
      specialty: form.specialty || "Specialist",
      hospital: form.hospital || "Private Clinic",
      phone: form.phone,
      hours: form.hours,
      notes: form.notes,
    };
    setDoctors((prev) => [newDoc, ...prev]);
    toast.success(`${newDoc.name} added to Doctor Contacts!`);
    setForm({
      name: "",
      specialty: "",
      hospital: "",
      phone: "",
      hours: "Mon – Sat, 10:00 AM – 2:00 PM",
      notes: "",
    });
    setShowAdd(false);
  };

  const removeDoctor = (id: string, name: string) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    toast.success(`${name} removed.`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
            <Stethoscope className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Doctors & Specialists</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Verified direct contacts for your medical recovery team
          </p>
        </div>
        <Btn
          kind="ghost"
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>{showAdd ? "Cancel" : "Add Doctor"}</span>
        </Btn>
      </div>

      {showAdd && (
        <Card className="border-2 border-primary/30 bg-surface shadow-elev-2 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold text-ink mb-3">Add Doctor / Specialist</h3>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-ink">
              Doctor Name
              <Input
                placeholder="e.g. Dr. Rajesh Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={isElder ? "!min-h-[50px] !text-base" : ""}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-semibold text-ink">
                Specialty
                <Input
                  placeholder="e.g. Cardiologist"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className={isElder ? "!min-h-[50px] !text-base" : ""}
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-ink">
                Hospital / Clinic
                <Input
                  placeholder="e.g. Apollo Hospital"
                  value={form.hospital}
                  onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                  className={isElder ? "!min-h-[50px] !text-base" : ""}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-semibold text-ink">
                Phone Number (Direct Call)
                <Input
                  placeholder="e.g. +91 98200 12345"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={isElder ? "!min-h-[50px] !text-base" : ""}
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-ink">
                Clinic Hours
                <Input
                  placeholder="e.g. Mon – Sat 10am-2pm"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  className={isElder ? "!min-h-[50px] !text-base" : ""}
                />
              </label>
            </div>

            <Btn onClick={addDoctor} className="mt-1 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Save Doctor Contact</span>
            </Btn>
          </div>
        </Card>
      )}

      {/* Doctor Cards List */}
      <div className="grid gap-3">
        {doctors.map((doc) => (
          <Card
            key={doc.id}
            className={`border transition-all shadow-elev-1 ${
              doc.isEmergency
                ? "border-danger/40 bg-danger-bg/20"
                : "border-border bg-surface hover:border-primary/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-bold text-ink ${isElder ? "text-lg" : "text-base"}`}>
                    {doc.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      doc.isEmergency
                        ? "bg-danger text-white"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {doc.specialty}
                  </span>
                </div>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{doc.hospital}</span>
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{doc.hours}</span>
                </p>

                {doc.notes && (
                  <p className="mt-2 text-xs text-ink-muted border-t border-border pt-1.5 italic">
                    {doc.notes}
                  </p>
                )}
              </div>

              {/* Delete button if custom added */}
              {!doc.isEmergency && !DEFAULT_DOCTORS.some((d) => d.id === doc.id) && (
                <button
                  type="button"
                  onClick={() => removeDoctor(doc.id, doc.name)}
                  aria-label={`Delete ${doc.name}`}
                  className="text-danger hover:opacity-80 p-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Direct Call & Action Buttons */}
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-border">
              <Btn
                kind={doc.isEmergency ? "danger" : "primary"}
                onClick={() => callDoctor(doc)}
                className={`flex-1 flex items-center justify-center gap-2 font-bold shadow-sm ${
                  isElder ? "!min-h-[56px] !text-lg" : "!min-h-[44px] !text-sm"
                }`}
              >
                <PhoneCall className="h-4 w-4 stroke-[2.5]" />
                <span>Call {doc.name.split(" ")[1] || "Doctor"} ({doc.phone})</span>
              </Btn>

              <a
                href={`https://wa.me/${doc.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl border border-border bg-surface text-ink hover:bg-surface-sunken hover:border-primary transition-all"
                aria-label={`Send WhatsApp message to ${doc.name}`}
              >
                <MessageSquare className="h-4 w-4 text-success" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
