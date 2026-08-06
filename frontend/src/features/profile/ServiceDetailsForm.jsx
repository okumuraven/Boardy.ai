import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { RATE_TYPES, rateTypeLabel } from "../../constants/rateTypes";

const EMPTY = { rate_types: [], available_for_hire: null };

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

// The two fields that actually help a founder decide "should I hire
// this person" (profile.md §4.2) - consultants/service providers had
// nothing of their own before this, reusing the same generic
// offer/tags/portfolio fields as every other role.
export default function ServiceDetailsForm({ profile }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.id) return;
    apiFetch("/api/profiles/me")
      .then((res) => res.json())
      .then((data) =>
        setForm({
          rate_types: data.rate_types || [],
          available_for_hire: data.available_for_hire,
        })
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const save = () => {
    setSaving(true);
    setError("");
    setSaved(false);

    apiFetch("/api/profiles/service_details", {
      method: "POST",
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't save those details.");
        setForm(data);
        setSaved(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  if (loading) return null;

  const chip = (active, label, onClick) => (
    <button key={label} type="button" className={`chip ${active ? "selected" : ""}`} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div className="panel">
      <p className="panel-label">Rate & availability</p>

      <label className="investment-field-label">How do you charge?</label>
      <div className="directory-chip-row" style={{ marginBottom: "1rem" }}>
        {RATE_TYPES.map((t) =>
          chip(form.rate_types.includes(t), rateTypeLabel(t), () =>
            setForm({ ...form, rate_types: toggle(form.rate_types, t) })
          )
        )}
      </div>

      <label className="profile-photos-visibility" style={{ marginBottom: 0 }}>
        <input
          type="checkbox"
          checked={!!form.available_for_hire}
          onChange={(e) => setForm({ ...form, available_for_hire: e.target.checked })}
        />
        <span>Open to new clients right now</span>
      </label>

      {error && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>{error}</p>}
      {saved && !error && <p style={{ color: "var(--signal)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>Saved.</p>}

      <button className="btn-primary" style={{ marginTop: "1.1rem" }} disabled={saving} onClick={save}>
        {saving ? "Saving..." : "Save details"}
      </button>
    </div>
  );
}
