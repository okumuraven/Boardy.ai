import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { isCapitalSideRole } from "../../constants/roles";
import { CalendarIcon, CallHistoryIcon, DirectoryIcon, MatchesIcon } from "../shell/icons";
import "./Home.css";
import Dashboard from "../../components/Dashboard";

// Real SVG, not emoji (renders inconsistently across OS/browsers and
// reads as unpolished next to the rest of the app's actual icon set -
// every nav item already uses one). No sparkle glyph exists in
// features/shell/icons.jsx yet, so a small one is defined here rather
// than reusing an unrelated shape for "new match".
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M7 7l2.5 2.5M14.5 14.5L17 17M17 7l-2.5 2.5M9.5 14.5L7 17" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  );
}

// accent is the left-border/section color for this activity type - a
// colored border alongside colored icon since a bare gray divider line
// gave every row the same neutral weight regardless of what actually
// happened.
const TYPE_GLYPH = {
  chat_message: { Icon: MatchesIcon, bg: "var(--ink-line)", color: "var(--muted)", accent: "var(--ink-line-strong)" },
  calendar_reminder: { Icon: CalendarIcon, bg: "var(--warn-wash)", color: "var(--warn)", accent: "var(--warn)" },
  new_match: { Icon: SparkleIcon, bg: "var(--signal-wash)", color: "var(--signal)", accent: "var(--signal)" },
  incoming_call: { Icon: CallHistoryIcon, bg: "var(--brass-wash)", color: "var(--brass)", accent: "var(--brass)" },
};

const timeAgo = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Some accounts return their name in all-caps - the CSS equivalent
// (lowercase + ::first-letter uppercase) turned out to render
// inconsistently in practice (still showed all-lowercase live), so
// this does it in JS instead: deterministic, no pseudo-element
// cross-browser quirks to fight. An already-correctly-cased name comes
// through unaffected either way.
const titleCase = (word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word);

// Real stats (no invented numbers) plus the existing voice-interview /
// profile-summary management panel underneath, now living inside the
// shell's content area instead of being the entire screen.
export default function HomeView({ profile, onInterviewComplete, onFindMatch, onOpenProfile, onOpenActivity }) {
  const [matches, setMatches] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;

    apiFetch(`/api/matches`)
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => {});

    apiFetch(`/api/notifications`)
      .then((res) => res.json())
      .then((data) => setActivity((data.notifications || []).slice(0, 5)))
      .catch(() => {});
  }, [profile?.id]);

  const awaitingResponse = matches.filter((m) => m.status === "pending_consent" && m.my_response !== "accepted").length;
  const showInvestmentPrompt = isCapitalSideRole(profile?.role) || profile?.looking_for_tags?.includes("funding");

  return (
    <div className="home-view">
      <div className="home-view-content">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.6rem", margin: "0 0 0.25rem" }}>
          Welcome back, {titleCase(profile?.name?.split(" ")[0]) || "there"}.
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 1rem" }}>
          Here's what's moving across your introductions.
        </p>
        {/* The same tri-color bar used in every email footer and the
            landing page footer - a small, deliberate touch so the brand
            reads the same here as everywhere else, not a decoration
            invented just for this page. */}
        <div className="home-header-bar"></div>

        {showInvestmentPrompt && (
          <div className="home-investment-prompt">
            <p>
              {isCapitalSideRole(profile?.role)
                ? "Add your investment criteria so founders know what you're looking for."
                : "Add your funding details so investors and lenders can find you in the Directory."}
            </p>
            <button className="btn-ghost btn-sm" onClick={onOpenProfile}>Go to Profile</button>
          </div>
        )}

        {/* Stats + recent activity side by side on wide screens - the
            stats row is deliberately compact (2 small tiles), and on a
            wide desktop viewport that left the entire right side of the
            page empty with activity dumped full-width below instead.
            Stacks back to a single column on narrower screens. */}
        <div className="home-top-row">
          <div className="home-stats-row">
            <div className="home-stat-tile home-stat-tile-brass">
              <div className="home-stat-icon"><DirectoryIcon /></div>
              <div className="num">{matches.length}</div>
              <div className="lbl">Active introductions</div>
            </div>
            <div className="home-stat-tile home-stat-tile-signal">
              <div className="home-stat-icon"><ClockIcon /></div>
              <div className="num">{awaitingResponse}</div>
              <div className="lbl">Awaiting your response</div>
            </div>
          </div>

          {activity.length > 0 && (
            <div className="home-activity-col">
              <p className="panel-label home-section-label" style={{ marginBottom: "0.5rem" }}>
                <SparkleIcon /> Recent activity
              </p>
              <div className="home-activity-card">
                {activity.map((n) => {
                  const glyph = TYPE_GLYPH[n.type] || TYPE_GLYPH.chat_message;
                  const Icon = glyph.Icon;
                  return (
                    <div
                      className="home-activity-row"
                      key={n.id}
                      style={{ borderLeftColor: glyph.accent }}
                      onClick={() => onOpenActivity?.(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && onOpenActivity?.(n)}
                    >
                      <div className="home-activity-glyph" style={{ background: glyph.bg, color: glyph.color }}>
                        <Icon />
                      </div>
                      <div>
                        <div className="home-activity-text">{n.body}</div>
                        <div className="home-activity-time">{timeAgo(n.inserted_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Not wrapped in an outer card like the sections above - every
            state Dashboard can render (ProfileSummary's Your Offer/Need
            panels, VoiceInterview, ChatInterview's own .panel) already
            provides its own ink-raised card. An identical-colored outer
            wrapper here would nest a card inside an indistinguishable
            card instead of adding real structure. */}
        <p className="panel-label home-section-label" style={{ marginBottom: "1rem", paddingTop: "0.5rem", borderTop: "1px solid var(--ink-line)" }}>
          <MicIcon /> Your voice interview
        </p>
        <Dashboard profile={profile} onInterviewComplete={onInterviewComplete} onFindMatch={onFindMatch} />
      </div>
    </div>
  );
}
