"use client";

import { useState } from "react";

type MedInfo = {
  food_allergies: string;
  medication_allergies: string;
  environmental_allergies: string;
  conditions: string;
  doctor_name: string;
  doctor_phone: string;
  insurance_provider: string;
  insurance_policy_number: string;
  emergency_contact_1_name: string;
  emergency_contact_1_relationship: string;
  emergency_contact_1_phone: string;
  emergency_contact_2_name: string;
  emergency_contact_2_relationship: string;
  emergency_contact_2_phone: string;
  additional_notes: string;
};

type Medication = { name: string; dose: string; frequency: string; instructions: string; time_of_day: string[] };

interface Props {
  camperId: string;
  camperName: string;
  initialMedical: Partial<MedInfo>;
  initialMedications: Medication[];
}

const TIME_OPTIONS = [
  { value: "breakfast", label: "☀️ Breakfast" },
  { value: "lunch",     label: "🌤️ Lunch" },
  { value: "dinner",    label: "🌅 Dinner" },
  { value: "bedtime",   label: "🌙 Bedtime" },
  { value: "as_needed", label: "⚡ As Needed" },
];

const EMPTY_MED: Medication = { name: "", dose: "", frequency: "", instructions: "", time_of_day: [] };

const SECTION_ICONS: Record<string, string> = {
  emergency: "🚨",
  allergies: "⚠️",
  conditions: "🏥",
  medications: "💊",
  doctor: "👨‍⚕️",
};

function Section({ id, title, children, defaultOpen = false }: { id: string; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-jubilee-navy flex items-center gap-2">
          <span>{SECTION_ICONS[id]}</span> {title}
        </span>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold resize-none"
      />
    </div>
  );
}

export default function MedicalInfoForm({ camperId, camperName, initialMedical, initialMedications }: Props) {
  const [medical, setMedical] = useState<MedInfo>({
    food_allergies: "",
    medication_allergies: "",
    environmental_allergies: "",
    conditions: "",
    doctor_name: "",
    doctor_phone: "",
    insurance_provider: "",
    insurance_policy_number: "",
    emergency_contact_1_name: "",
    emergency_contact_1_relationship: "",
    emergency_contact_1_phone: "",
    emergency_contact_2_name: "",
    emergency_contact_2_relationship: "",
    emergency_contact_2_phone: "",
    additional_notes: "",
    ...initialMedical,
  });
  const [medications, setMedications] = useState<Medication[]>(
    initialMedications.length > 0
      ? initialMedications.map(m => ({ ...m, time_of_day: m.time_of_day ?? [] }))
      : [EMPTY_MED]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof MedInfo) => (value: string) =>
    setMedical(m => ({ ...m, [key]: value }));

  const setMed = (i: number, key: keyof Medication) => (value: string) =>
    setMedications(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: value } : m));

  const toggleTime = (i: number, value: string) =>
    setMedications(prev => prev.map((m, idx) => {
      if (idx !== i) return m;
      const times = m.time_of_day.includes(value)
        ? m.time_of_day.filter(t => t !== value)
        : [...m.time_of_day, value];
      return { ...m, time_of_day: times };
    }));

  const addMed = () => setMedications(prev => [...prev, EMPTY_MED]);
  const removeMed = (i: number) => setMedications(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/camper/${camperId}/medical`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medical, medications: medications.filter(m => m.name.trim()) }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Section id="emergency" title="Emergency Contacts" defaultOpen={true}>
        <p className="text-xs text-gray-400 pt-2">Contact 1</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={medical.emergency_contact_1_name} onChange={set("emergency_contact_1_name")} placeholder="Jane Smith" />
          <Field label="Relationship" value={medical.emergency_contact_1_relationship} onChange={set("emergency_contact_1_relationship")} placeholder="Mother" />
        </div>
        <Field label="Phone" value={medical.emergency_contact_1_phone} onChange={set("emergency_contact_1_phone")} placeholder="(555) 000-0000" type="tel" />

        <p className="text-xs text-gray-400 pt-2">Contact 2</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={medical.emergency_contact_2_name} onChange={set("emergency_contact_2_name")} placeholder="John Smith" />
          <Field label="Relationship" value={medical.emergency_contact_2_relationship} onChange={set("emergency_contact_2_relationship")} placeholder="Father" />
        </div>
        <Field label="Phone" value={medical.emergency_contact_2_phone} onChange={set("emergency_contact_2_phone")} placeholder="(555) 000-0000" type="tel" />
      </Section>

      <Section id="allergies" title="Allergies">
        <div className="pt-2 space-y-3">
          <TextArea label="Food Allergies" value={medical.food_allergies} onChange={set("food_allergies")} placeholder="e.g. Peanuts, tree nuts, shellfish..." />
          <TextArea label="Medication Allergies" value={medical.medication_allergies} onChange={set("medication_allergies")} placeholder="e.g. Penicillin, sulfa drugs..." />
          <TextArea label="Environmental Allergies" value={medical.environmental_allergies} onChange={set("environmental_allergies")} placeholder="e.g. Bee stings, poison ivy, pollen..." />
        </div>
      </Section>

      <Section id="conditions" title="Medical Conditions & Notes">
        <div className="pt-2">
          <TextArea
            label="Conditions / Health Notes"
            value={medical.conditions}
            onChange={set("conditions")}
            placeholder="e.g. Asthma (has inhaler), anxiety, ADHD, diabetes (Type 1)..."
          />
          <div className="mt-3">
            <TextArea
              label="Additional Notes for Camp Staff"
              value={medical.additional_notes}
              onChange={set("additional_notes")}
              placeholder="Anything else staff should know..."
            />
          </div>
        </div>
      </Section>

      <Section id="medications" title="Medications">
        <div className="pt-2 space-y-4">
          {medications.map((med, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medication {i + 1}</p>
                {medications.length > 1 && (
                  <button type="button" onClick={() => removeMed(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                )}
              </div>
              <Field label="Medication Name" value={med.name} onChange={setMed(i, "name")} placeholder="e.g. Adderall, Benadryl..." />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dose" value={med.dose} onChange={setMed(i, "dose")} placeholder="e.g. 10mg" />
                <Field label="Frequency / Notes" value={med.frequency} onChange={setMed(i, "frequency")} placeholder="e.g. Once daily" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Given at</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map(opt => {
                    const checked = med.time_of_day.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleTime(i, opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${checked ? "bg-jubilee-navy text-white border-jubilee-navy" : "bg-white text-gray-600 border-gray-300 hover:border-jubilee-gold"}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <TextArea label="Special Instructions" value={med.instructions} onChange={setMed(i, "instructions")} placeholder="e.g. Take with food. Keep refrigerated." />
            </div>
          ))}
          <button
            type="button"
            onClick={addMed}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-2.5 text-sm text-gray-400 hover:border-jubilee-gold hover:text-jubilee-navy transition-colors"
          >
            + Add Another Medication
          </button>
        </div>
      </Section>

      <Section id="doctor" title="Insurance">
        <div className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Insurance Provider" value={medical.insurance_provider} onChange={set("insurance_provider")} placeholder="Blue Cross" />
            <Field label="Policy Number" value={medical.insurance_policy_number} onChange={set("insurance_policy_number")} placeholder="XYZ-123456" />
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-jubilee-navy text-white px-6 py-2.5 rounded-lg font-medium hover:bg-jubilee-gold disabled:opacity-50 transition-colors text-sm"
        >
          {saving ? "Saving…" : `Save ${camperName}'s Medical Info`}
        </button>
        {saved && <p className="text-jubilee-green text-sm font-medium">✓ Saved!</p>}
      </div>
    </form>
  );
}
