import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { BIZI_TRACKS, HEARD_ABOUT_OPTIONS, CURRENT_BATCH, suggestTrack } from "../../constants/biziTracks";
import { ELIGIBILITY_GROUPS, ELIGIBILITY_KEYS, emptyEligibility, allEligibilityChecked } from "../../constants/biziEligibility";

const DESC_MIN = 70;
const DESC_MAX = 140;

const toggleTrack = (tracks, value) =>
  tracks.includes(value) ? tracks.filter((t) => t !== value) : [...tracks, value];

// Real fields, verbatim from form.kuzana.co/apply (kuzana_website.md
// §9), pre-filled wherever Connect already has the data (name, email,
// company, phone) so an existing member never retypes what's already on
// their profile (bizi_flow.md §3) - the cold public form doesn't have
// that luxury, this one does.
export default function BiziApplicationForm({ profile, onBack, onSubmitted }) {
  const [form, setForm] = useState({
    preferred_name: profile?.name || "",
    other_names: "",
    email: profile?.email || "",
    whatsapp: profile?.phone_number || "",
    company_name: profile?.company || "",
    business_description: "",
    // Real form says "Track(s)" - plural, multi-select - suggestTrack
    // just seeds the closest guess, it's never a forced single choice.
    tracks: [suggestTrack(profile?.industry)],
    heard_about_us: "Kuzana Connect",
    referred_by: "",
    question_for_us: "",
  });
  const [eligibility, setEligibility] = useState(emptyEligibility());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggleEligibility = (key) => setEligibility({ ...eligibility, [key]: !eligibility[key] });

  const descLength = form.business_description.length;
  const descValid = descLength >= DESC_MIN && descLength <= DESC_MAX;
  const checkedCount = ELIGIBILITY_KEYS.filter((key) => eligibility[key]).length;
  const canSubmit =
    form.preferred_name && form.email && form.whatsapp && form.company_name &&
    descValid && form.tracks.length > 0 && form.heard_about_us && allEligibilityChecked(eligibility);

  // A disabled button with no explanation reads as broken, not as "you're
  // not done yet" - this is the exact list of what's still missing,
  // rebuilt on every render so it's never stale.
  const missingReasons = [];
  if (!form.preferred_name) missingReasons.push("your name");
  if (!form.email) missingReasons.push("your email");
  if (!form.whatsapp) missingReasons.push("your WhatsApp number");
  if (!form.company_name) missingReasons.push("your company name");
  if (!descValid) missingReasons.push(`a business description between ${DESC_MIN}-${DESC_MAX} characters (currently ${descLength})`);
  if (form.tracks.length === 0) missingReasons.push("at least one track");
  if (checkedCount < ELIGIBILITY_KEYS.length) {
    missingReasons.push(`${ELIGIBILITY_KEYS.length - checkedCount} more eligibility item${ELIGIBILITY_KEYS.length - checkedCount === 1 ? "" : "s"} checked`);
  }

  const submit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    const { tracks, ...rest } = form;
    apiFetch("/api/bizi_applications", {
      method: "POST",
      body: JSON.stringify({ ...rest, track: tracks, batch_target: CURRENT_BATCH.label, eligibility }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't submit your application.");
        onSubmitted(data.application);
      })
      .catch((err) => setError(typeof err.message === "string" ? err.message : "Something went wrong. Try again."))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="panel">
      <p className="panel-label">Apply to become a Bizi</p>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
        Honesty matters more than completeness here - if you don't know an answer for sure, just
        say so.
      </p>
      <div className="panel warn" style={{ padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>
        <p style={{ color: "var(--paper)", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
          You're applying for <strong>{CURRENT_BATCH.label}</strong>, starting {CURRENT_BATCH.startsOn}.
          Soft deadline: <strong>{CURRENT_BATCH.softDeadline}</strong> - applications after that may be
          pushed to {CURRENT_BATCH.rollsToLabel}.
        </p>
      </div>

      <label className="setup-field">
        <span className="setup-field-label">Name you like to be called</span>
        <div className="setup-field-control">
          <input value={form.preferred_name} onChange={set("preferred_name")} />
        </div>
      </label>

      <label className="setup-field">
        <span className="setup-field-label">Other names (optional)</span>
        <div className="setup-field-control">
          <input value={form.other_names} onChange={set("other_names")} />
        </div>
      </label>

      <label className="setup-field">
        <span className="setup-field-label">Email</span>
        <div className="setup-field-control">
          <input type="email" value={form.email} onChange={set("email")} />
        </div>
      </label>

      <label className="setup-field">
        <span className="setup-field-label">WhatsApp</span>
        <div className="setup-field-control">
          <input value={form.whatsapp} onChange={set("whatsapp")} placeholder="e.g. 07XX XXX XXX" />
        </div>
      </label>

      <label className="setup-field">
        <span className="setup-field-label">Company name</span>
        <div className="setup-field-control">
          <input value={form.company_name} onChange={set("company_name")} />
        </div>
      </label>

      <label className="setup-field">
        <span className="setup-field-label">
          What does your business do? ({descLength}/{DESC_MAX}, minimum {DESC_MIN})
        </span>
        <textarea
          className="premium-input investment-textarea"
          rows={3}
          maxLength={DESC_MAX}
          value={form.business_description}
          onChange={set("business_description")}
        />
      </label>

      <label className="setup-field">
        <span className="setup-field-label">Which track(s) are you applying for?</span>
      </label>
      <div className="directory-chip-row" style={{ marginBottom: "1.25rem" }}>
        {BIZI_TRACKS.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${form.tracks.includes(t) ? "selected" : ""}`}
            onClick={() => setForm({ ...form, tracks: toggleTrack(form.tracks, t) })}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="setup-field">
        <span className="setup-field-label">How did you hear about this application?</span>
        <div className="setup-field-control">
          <select value={form.heard_about_us} onChange={set("heard_about_us")}>
            {HEARD_ABOUT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </label>

      {form.heard_about_us === "Referral" && (
        <label className="setup-field">
          <span className="setup-field-label">If referral, who referred you?</span>
          <div className="setup-field-control">
            <input value={form.referred_by} onChange={set("referred_by")} />
          </div>
        </label>
      )}

      <p className="panel-label" style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Eligibility - must check all</span>
        <span style={{ color: checkedCount === ELIGIBILITY_KEYS.length ? "var(--signal)" : "var(--warn)", fontWeight: 700 }}>
          {checkedCount} / {ELIGIBILITY_KEYS.length} checked
        </span>
      </p>
      {ELIGIBILITY_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--brass)", fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            {group.label}
          </p>
          {group.items.map((item) => (
            <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.5rem", fontSize: "0.88rem", color: "var(--paper)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!eligibility[item.key]}
                onChange={() => toggleEligibility(item.key)}
                style={{ marginTop: "0.2rem" }}
              />
              {item.label}
            </label>
          ))}
        </div>
      ))}

      <label className="setup-field">
        <span className="setup-field-label">Do you have a question for us? (optional)</span>
        <textarea
          className="premium-input investment-textarea"
          rows={2}
          value={form.question_for_us}
          onChange={set("question_for_us")}
        />
      </label>

      {error && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>{error}</p>}

      {!canSubmit && missingReasons.length > 0 && (
        <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "1rem 0 0", lineHeight: 1.5 }}>
          Still needed before you can submit: {missingReasons.join(", ")}.
        </p>
      )}

      <p style={{ color: "var(--muted)", fontSize: "0.78rem", margin: "1.25rem 0 0", lineHeight: 1.5 }}>
        By submitting, you agree to being contacted by Kuzana via email, phone, or WhatsApp about
        your application status.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack} disabled={submitting}>Back</button>
        <button className="btn-primary" onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? "Submitting..." : "Submit application"}
        </button>
      </div>
    </div>
  );
}
