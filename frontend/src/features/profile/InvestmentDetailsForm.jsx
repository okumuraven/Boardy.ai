import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { BUSINESS_STAGES } from "../../constants/businessStages";
import { FUNDING_TYPES, fundingTypeLabel } from "../../constants/fundingTypes";
import { INDUSTRIES } from "../../constants/industries";

const EMPTY = {
  business_stage: "",
  funding_amount_sought: "",
  funding_types: [],
  key_financials: "",
  check_size: "",
  sectors_of_interest: [],
};

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

// The optional structured "funding/investment" layer (Phase 4, Investor &
// Lender View) - shown on Profile only to whoever it applies to: anyone
// seeking funding (looking_for_tags includes "funding") gets the
// founder-side fields, anyone with role "investor" gets the mirror
// investor/lender fields. Both halves share funding_types (what a
// founder wants vs. what an investor/lender provides).
export default function InvestmentDetailsForm({ profile }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const isInvestor = profile?.role === "investor";

  useEffect(() => {
    if (!profile?.id) return;
    apiFetch(`/api/profiles/investment`)
      .then((res) => res.json())
      .then((data) => setForm({ ...EMPTY, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const save = () => {
    setSaving(true);
    setError("");
    setSaved(false);

    apiFetch(`/api/profiles/investment`, {
      method: "POST",
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't save those details.");
        setForm({ ...EMPTY, ...data });
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
      <p className="panel-label">{isInvestor ? "Investment criteria" : "Funding details"}</p>

      {isInvestor ? (
        <>
          <label className="investment-field-label">Check size</label>
          <div className="field" style={{ marginBottom: "1rem" }}>
            <input
              className="premium-input"
              placeholder="e.g. KES 500K - 2M"
              value={form.check_size || ""}
              onChange={(e) => setForm({ ...form, check_size: e.target.value })}
            />
          </div>

          <label className="investment-field-label">Sectors of interest</label>
          <div className="directory-chip-row" style={{ marginBottom: "1rem" }}>
            {INDUSTRIES.map((i) =>
              chip(form.sectors_of_interest.includes(i), i, () =>
                setForm({ ...form, sectors_of_interest: toggle(form.sectors_of_interest, i) })
              )
            )}
          </div>

          <label className="investment-field-label">What capital do you provide?</label>
          <div className="directory-chip-row" style={{ marginBottom: "1rem" }}>
            {FUNDING_TYPES.map((t) =>
              chip(form.funding_types.includes(t), fundingTypeLabel(t), () =>
                setForm({ ...form, funding_types: toggle(form.funding_types, t) })
              )
            )}
          </div>
        </>
      ) : (
        <>
          <label className="investment-field-label">Business stage</label>
          <div className="field" style={{ marginBottom: "1rem" }}>
            <select
              className="premium-input"
              value={form.business_stage || ""}
              onChange={(e) => setForm({ ...form, business_stage: e.target.value })}
            >
              <option value="">Not set</option>
              {BUSINESS_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <label className="investment-field-label">Amount sought</label>
          <div className="field" style={{ marginBottom: "1rem" }}>
            <input
              className="premium-input"
              placeholder="e.g. KES 2,000,000"
              value={form.funding_amount_sought || ""}
              onChange={(e) => setForm({ ...form, funding_amount_sought: e.target.value })}
            />
          </div>

          <label className="investment-field-label">What type of funding?</label>
          <div className="directory-chip-row" style={{ marginBottom: "1rem" }}>
            {FUNDING_TYPES.map((t) =>
              chip(form.funding_types.includes(t), fundingTypeLabel(t), () =>
                setForm({ ...form, funding_types: toggle(form.funding_types, t) })
              )
            )}
          </div>

          <label className="investment-field-label">
            Key financials — be specific: turnover, profit, or growth, your choice, just say which
          </label>
          <textarea
            className="premium-input investment-textarea"
            placeholder="e.g. KES 1.2M turnover in 2025, pre-profit"
            value={form.key_financials || ""}
            onChange={(e) => setForm({ ...form, key_financials: e.target.value })}
            rows={3}
          />
        </>
      )}

      {error && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>{error}</p>}
      {saved && !error && <p style={{ color: "var(--signal)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>Saved.</p>}

      <button className="btn-primary" style={{ marginTop: "1.1rem" }} disabled={saving} onClick={save}>
        {saving ? "Saving..." : "Save details"}
      </button>
    </div>
  );
}
