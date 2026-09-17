import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { isFounderRole } from "../../constants/roles";
import { biziStatusLabel } from "../../constants/biziStatuses";
import BiziRulebook from "./BiziRulebook";
import BiziApplicationForm from "./BiziApplicationForm";
import BiziVerificationChat from "./BiziVerificationChat";
import "./Bizi.css";

// Per Ceez (Kuzana community coordinator), applicants now go through
// Kuzana's own external quiz instead of our in-app form - our
// Bizi.Applications backend, the admin review pipeline, and the
// verification chat (attachments/voice notes/document tagging, phases
// B/C) are all left fully intact below, just unreachable from the UI:
// a deliberate PAUSE, not a removal, in case Kuzana wants to adopt our
// verification system later. Re-enabling it is reverting this one
// constant/the three call sites below, nothing more.
const BIZI_QUIZ_URL = "https://kuzana.co/quiz/?source=linkedin&campaign=Quiz";
const goToQuiz = () => window.open(BIZI_QUIZ_URL, "_blank", "noopener,noreferrer");

// Real SVG, not emoji - matches the anti-emoji-icon convention used
// across the rest of the app.
const PartnershipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="12" r="6" />
    <circle cx="15" cy="12" r="6" />
  </svg>
);

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3 3-3-3c-1-1-2-3-2-5 0-4 2-8 5-10Z" />
    <circle cx="12" cy="10" r="2" />
    <path d="M8 16l-3 3M16 16l3 3" />
  </svg>
);

// Kuzana's real form rejects everyone but the operating founder outright
// (kuzana_website.md §9) - shown to non-founders as a better-fitting
// offer, not a dead end (bizi_flow.md §1).
function ReferAFounder() {
  return (
    <div className="panel">
      <p className="panel-label">Know a founder who should apply?</p>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div className="home-stat-icon" style={{ background: "var(--brass-wash)", color: "var(--brass)", marginBottom: 0 }}><PartnershipIcon /></div>
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

function ApplicationList({ applications, onReadRulebook, onApplyAgain, onOpenChat }) {
  return (
    <div className="panel">
      <p className="panel-label">Your Bizi applications</p>
      {applications.map((a) => (
        <div
          key={a.id}
          onClick={() => onOpenChat(a)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.85rem 0", borderBottom: "1px solid var(--ink-line)", cursor: "pointer" }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "var(--paper)", fontSize: "0.95rem" }}>{a.company_name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              {(a.track || []).join(", ")} · {new Date(a.inserted_at).toLocaleDateString()}
            </div>
          </div>
          <span className={`match-status-pill ${a.status === 'approved' ? 'signal' : ''}`}>{biziStatusLabel(a.status)}</span>
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
        <div className="home-stat-icon" style={{ background: "var(--signal-wash)", color: "#b8860b", marginBottom: 0 }}><RocketIcon /></div>
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
export default function BiziSection({ profile, openRequest, onConsumeOpenRequest }) {
  const [view, setView] = useState("loading");
  const [applications, setApplications] = useState([]);
  const [activeApplication, setActiveApplication] = useState(null);
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

  // Landing here from the Calendar tab's "View" on a booked call
  // (Phase D) - same deep-link shape AppShell already uses for Matches
  // (pendingMatchOpen), just resolved once the applications list is
  // actually loaded instead of immediately.
  useEffect(() => {
    if (!openRequest?.applicationId || applications.length === 0) return;
    const application = applications.find((a) => String(a.id) === String(openRequest.applicationId));
    if (application) {
      setActiveApplication(application);
      setView("chat");
    }
    onConsumeOpenRequest?.();
  }, [openRequest, applications]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitted = (application) => {
    setApplications([application, ...applications]);
    setView("confirmation");
  };

  const content = () => {
    if (!founder) return <ReferAFounder />;
    if (view === "loading") return null;

    if (view === "rulebook") {
      return <BiziRulebook onBack={() => setView(applications.length > 0 ? "list" : "entry")} onApply={goToQuiz} canApply />;
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

    if (view === "chat" && activeApplication) {
      return <BiziVerificationChat application={activeApplication} profile={profile} onBack={() => setView("list")} />;
    }

    if (view === "list") {
      return (
        <ApplicationList
          applications={applications}
          onReadRulebook={() => setView("rulebook")}
          onApplyAgain={goToQuiz}
          onOpenChat={(application) => {
            setActiveApplication(application);
            setView("chat");
          }}
        />
      );
    }

    return <EntryCard onReadRulebook={() => setView("rulebook")} onApply={goToQuiz} />;
  };

  const isChatView = view === "chat" && activeApplication;

  return (
    <div className={`bizi-tab-view ${isChatView ? "chat-view" : ""}`}>
      {isChatView ? content() : <div className="bizi-tab-content">{content()}</div>}
    </div>
  );
}
