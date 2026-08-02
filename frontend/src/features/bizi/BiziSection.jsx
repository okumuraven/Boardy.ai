import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { isFounderRole } from "../../constants/roles";
import BiziRulebook from "./BiziRulebook";
import BiziApplicationForm from "./BiziApplicationForm";

// Kuzana's real form rejects everyone but the operating founder outright
// (kuzana_website.md §9) - shown to non-founders as a better-fitting
// offer, not a dead end (bizi_flow.md §1).
function ReferAFounder() {
  return (
    <div className="panel">
      <p className="panel-label">Know a founder who should apply?</p>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div className="home-stat-icon" style={{ fontSize: "1.6rem", marginBottom: 0 }}>🤝</div>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
          Bizi applications are for operating founders only. If you know one who's ready to grow
          with Kuzana, refer them - Kuzana pays up to <strong style={{ color: "var(--paper)" }}>Ksh 50,000</strong> if
          they're accepted.
        </p>
      </div>
      <a className="btn-primary" href="https://kuzana.co/referral" target="_blank" rel="noreferrer" style={{ display: "inline-block", textDecoration: "none" }}>
        Kuzana.co/referral
      </a>
    </div>
  );
}

const STATUS_LABEL = { submitted: "Submitted" };

function ApplicationList({ applications, onReadRulebook, onApplyAgain }) {
  return (
    <div className="panel">
      <p className="panel-label">Your Bizi applications</p>
      {applications.map((a) => (
        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.85rem 0", borderBottom: "1px solid var(--ink-line)" }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--paper)", fontSize: "0.95rem" }}>{a.company_name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              {(a.track || []).join(", ")} · {new Date(a.inserted_at).toLocaleDateString()}
            </div>
          </div>
          <span className="match-status-pill">{STATUS_LABEL[a.status] || a.status}</span>
        </div>
      ))}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button className="btn-ghost" onClick={onReadRulebook}>Read the Rulebook</button>
        <button className="btn-primary" onClick={onApplyAgain}>Apply again</button>
      </div>
    </div>
  );
}

function EntryCard({ onReadRulebook, onApply }) {
  return (
    <div className="panel">
      <p className="panel-label">Kuzana Bizi Program</p>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div className="home-stat-icon" style={{ fontSize: "1.6rem", marginBottom: 0 }}>🚀</div>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
          A $40,000 investment, months of workshops, a personal Strategy Board, and a Bizi Buddy -
          for founders ready to professionalize and scale.
        </p>
      </div>
      <div className="home-stats-row" style={{ maxWidth: "none", marginBottom: "1.5rem" }}>
        <div className="home-stat-tile">
          <div className="num">$40k</div>
          <div className="lbl">Investment</div>
        </div>
        <div className="home-stat-tile">
          <div className="num">1 in 7</div>
          <div className="lbl">Applicants accepted</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onReadRulebook}>Read the Rulebook</button>
        <button className="btn-primary" onClick={onApply} style={{ flex: 1 }}>Apply to become a Bizi</button>
      </div>
    </div>
  );
}

// The founders-only gate (bizi_flow.md §1) lives here, not in the
// caller - ProfileView can unconditionally render <BiziSection
// profile={profile} /> and this component decides what the person
// actually sees. The backend enforces the same check server-side
// regardless (Vokazi.Bizi.eligible_role?/1) - this is a UI nicety, not
// the real boundary.
export default function BiziSection({ profile }) {
  const [view, setView] = useState("loading");
  const [applications, setApplications] = useState([]);
  const founder = isFounderRole(profile?.role);

  useEffect(() => {
    if (!profile?.id || !founder) return;
    apiFetch("/api/bizi_applications")
      .then((res) => res.json())
      .then((data) => {
        setApplications(data.applications || []);
        setView((data.applications || []).length > 0 ? "list" : "entry");
      })
      .catch(() => setView("entry"));
  }, [profile?.id, founder]);

  if (!founder) return <ReferAFounder />;

  const handleSubmitted = (application) => {
    setApplications([application, ...applications]);
    setView("confirmation");
  };

  if (view === "loading") return null;

  if (view === "rulebook") {
    return <BiziRulebook onBack={() => setView(applications.length > 0 ? "list" : "entry")} onApply={() => setView("form")} canApply />;
  }

  if (view === "form") {
    return <BiziApplicationForm profile={profile} onBack={() => setView(applications.length > 0 ? "list" : "entry")} onSubmitted={handleSubmitted} />;
  }

  if (view === "confirmation") {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
        <div className="stage-marker" style={{ width: 40, height: 40, margin: "0 auto 1.1rem", borderColor: "var(--signal)", background: "var(--signal-wash)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <p className="panel-label" style={{ justifyContent: "center" }}>Submitted</p>
        <p style={{ color: "var(--paper)", fontSize: "0.95rem", margin: 0, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
          Kuzana will contact you by email, phone, or WhatsApp about your application status.
        </p>
        <button className="btn-ghost" style={{ marginTop: "1.5rem" }} onClick={() => setView("list")}>
          Back to my applications
        </button>
      </div>
    );
  }

  if (view === "list") {
    return (
      <ApplicationList
        applications={applications}
        onReadRulebook={() => setView("rulebook")}
        onApplyAgain={() => setView("form")}
      />
    );
  }

  return <EntryCard onReadRulebook={() => setView("rulebook")} onApply={() => setView("form")} />;
}
