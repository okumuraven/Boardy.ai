import { ELIGIBILITY_GROUPS } from "../../constants/biziEligibility";

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CheckList = ({ items }) => (
  <ul className="stage-list" style={{ margin: 0, gap: "0.65rem" }}>
    {items.map((item) => (
      <li key={item.key || item} className="stage-item done" style={{ fontSize: "0.9rem", alignItems: "flex-start" }}>
        <span className="stage-marker" style={{ marginTop: "0.05rem" }}><CheckIcon /></span>
        <span>{item.label || item}</span>
      </li>
    ))}
  </ul>
);

// Every section traces back to a real source document (kuzana_playbook.md,
// kuzana_website.md §9), not generic accelerator boilerplate - see
// bizi_flow.md §5. Never gated behind starting an application - anyone
// can read this out of pure curiosity (bizi_flow.md §2). Redesigned
// 2026-08-01 to reuse the app's own existing stat-tile (HomeView) and
// checkmark-list (InterviewProcessing) visual language instead of plain
// paragraphs/bullets, so this reads as one product, not a bolted-on page.
export default function BiziRulebook({ onBack, onApply, canApply }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="panel">
        <p className="panel-label">Bizi Rulebook</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.4rem", margin: "0 0 1.25rem" }}>
          What it actually is
        </h2>

        <div className="home-stats-row" style={{ maxWidth: "none", marginBottom: "1.5rem" }}>
          <div className="home-stat-tile">
            <div className="home-stat-icon">💰</div>
            <div className="num">$40k</div>
            <div className="lbl">Total investment</div>
          </div>
          <div className="home-stat-tile">
            <div className="home-stat-icon">📈</div>
            <div className="num">6 mo</div>
            <div className="lbl">Goal: 2x your business</div>
          </div>
          <div className="home-stat-tile">
            <div className="home-stat-icon">🤝</div>
            <div className="num">7-33%</div>
            <div className="lbl">Equity taken, historically</div>
          </div>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.6, margin: 0 }}>
          $20,000 cash (with potential for up to $100,000 in follow-on funding - not guaranteed)
          plus $20,000 in support credit for accounting, workshops, and board access. Negotiated per
          company, not a fixed rate.
        </p>
      </div>

      <div className="panel">
        <p className="panel-label">Eligibility - must meet all of these</p>
        {ELIGIBILITY_GROUPS.map((group, i) => (
          <div key={group.label} style={{ marginBottom: i < ELIGIBILITY_GROUPS.length - 1 ? "1.4rem" : 0 }}>
            <p style={{ color: "var(--brass)", fontSize: "0.76rem", fontWeight: 600, margin: "0 0 0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {group.label}
            </p>
            <CheckList items={group.items} />
          </div>
        ))}
      </div>

      <div className="panel">
        <p className="panel-label">What's expected once you're in</p>
        <CheckList
          items={[
            "Late or absent from a workshop: $50/hour or $400/full-day, deducted from your own support credit.",
            "Each company gets exactly one thing to focus on at a time - Kuzana won't discuss anything else until that's solved.",
            "Direct, honest feedback, always - four positives before any criticism, but never softened past the point of being useful.",
          ]}
        />
      </div>

      <div className="panel warn">
        <p className="panel-label warn">Reasons this might not be for you</p>
        <p style={{ color: "var(--paper)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
          In Kyle's own words: Kuzana will demand a level of focus and hard work that can strain
          personal relationships. Feedback is direct, sometimes blunt. Kuzana may not have run a
          business in your exact industry. But you keep control - your equity, your board seats,
          your company.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" onClick={onBack}>Back</button>
        {canApply && (
          <button className="btn-primary" onClick={onApply} style={{ flex: 1 }}>
            Apply to become a Bizi
          </button>
        )}
      </div>
    </div>
  );
}
