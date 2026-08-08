const CRITERIA = [
  { key: "photo", label: "Profile photo" },
  { key: "interview", label: "Voice interview completed" },
];

// Self-serve nudge toward the "Verified" checkmark
// (Vokazi.Accounts.Profile.complete?/2) - ProfileView.jsx only renders
// this while profile.verified is still false, so it disappears the
// moment there's nothing left to do instead of lingering as clutter.
export default function ProfileCompletion({ completion }) {
  const safeCompletion = completion || {};
  const doneCount = CRITERIA.filter((c) => safeCompletion[c.key]).length;
  const percent = Math.round((doneCount / CRITERIA.length) * 100);

  return (
    <div className="panel">
      <p className="panel-label">Profile completion</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }}></div>
      </div>
      <p className="mono-value" style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.5rem 0 1rem", textAlign: "right" }}>
        {percent}% complete
      </p>

      <ul className="stage-list" style={{ marginTop: 0 }}>
        {CRITERIA.map((c) => {
          const done = !!safeCompletion[c.key];
          return (
            <li key={c.key} className={`stage-item ${done ? "done" : "pending"}`}>
              <span className="stage-marker">
                {done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </span>
              {c.label}
            </li>
          );
        })}
      </ul>

      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.75rem" }}>
        Complete both to earn the Verified checkmark.
      </p>
    </div>
  );
}
