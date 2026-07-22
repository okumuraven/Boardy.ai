import { useState, useEffect } from "react";
import NotificationBell from "../notifications";
import HomeView from "../home/HomeView";
import MatchesView from "../matches/MatchesView";
import CalendarView from "../calendar/CalendarView";
import ProfileView from "../profile/ProfileView";
import { HomeIcon, MatchesIcon, CalendarIcon, ProfileIcon } from "./icons";

const TABS = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "matches", label: "Matches", Icon: MatchesIcon },
  { key: "calendar", label: "Calendar", Icon: CalendarIcon },
  { key: "profile", label: "Profile", Icon: ProfileIcon },
];

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// The persistent shell (rail on desktop, bottom tab bar on mobile via CSS
// alone - same markup, same state) that replaced the old full-screen-swap
// pattern in App.jsx. `pendingMatchOpen` is how a notification click
// (Bell dropdown, Web Push, or the service-worker/URL-param fallback in
// App.jsx) reaches the right match regardless of which tab is active.
// GitHub OAuth (Social Profile connect) redirects back to `/` - land on
// Profile so the connected/error banner is immediately visible. Read as
// a lazy initial state (not an effect) so it's resolved before
// SocialProfileSection's own mount effect clears these same query params
// - effects fire child-first, so an effect here would lose the race.
const initialTabFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has("github_connected") || params.has("github_connect_error")) return "profile";
  return "home";
};

export default function AppShell({ profile, onInterviewComplete, onFindMatch, onProfileUpdated, pendingMatchOpen, onConsumePendingMatchOpen }) {
  const [activeTab, setActiveTab] = useState(initialTabFromUrl);
  const [openRequest, setOpenRequest] = useState(null);

  useEffect(() => {
    if (pendingMatchOpen) {
      setActiveTab("matches");
      setOpenRequest(pendingMatchOpen);
      onConsumePendingMatchOpen?.();
    }
  }, [pendingMatchOpen]);

  const handleBellOpen = (notification) => {
    try {
      const data = JSON.parse(notification.link);
      if (data.match_id) {
        setActiveTab("matches");
        setOpenRequest({ matchId: data.match_id, openScheduling: !!data.open_scheduling });
      }
    } catch {
      // Older notifications predate this JSON link format - nothing to navigate to.
    }
  };

  // From a Calendar card: jump to that match's chat with the schedule panel open.
  const openMatchScheduling = (matchId) => {
    setActiveTab("matches");
    setOpenRequest({ matchId, openScheduling: true });
  };

  const navButtons = (className, activeClassName) =>
    TABS.map(({ key, label, Icon }) => (
      <button
        key={key}
        className={`${className} ${activeTab === key ? activeClassName : ""}`}
        title={label}
        aria-label={label}
        onClick={() => setActiveTab(key)}
      >
        <Icon />
        <span className="lbl">{label}</span>
      </button>
    ));

  return (
    <div className="app-shell">
      <nav className="shell-rail">
        <div className="rail-brand">V</div>
        <div className="rail-nav">{navButtons("rail-btn", "active")}</div>
        <div className="rail-bottom">
          <NotificationBell profile={profile} onOpen={handleBellOpen} />
          <button className="rail-avatar" title={profile?.name || "Profile"} onClick={() => setActiveTab("profile")}>
            {initials(profile?.name)}
          </button>
        </div>
      </nav>

      <div className="shell-content">
        <div className={`shell-view ${activeTab === "home" ? "active" : ""}`}>
          <HomeView profile={profile} onInterviewComplete={onInterviewComplete} onFindMatch={onFindMatch} />
        </div>
        <div className={`shell-view ${activeTab === "matches" ? "active" : ""}`}>
          <MatchesView profile={profile} openRequest={openRequest} onConsumeOpenRequest={() => setOpenRequest(null)} />
        </div>
        <div className={`shell-view ${activeTab === "calendar" ? "active" : ""}`}>
          <CalendarView profile={profile} onOpenMatch={openMatchScheduling} />
        </div>
        <div className={`shell-view ${activeTab === "profile" ? "active" : ""}`}>
          <ProfileView profile={profile} onProfileUpdated={onProfileUpdated} />
        </div>
      </div>

      <nav className="shell-tabbar">{navButtons("tab-btn", "active")}</nav>
    </div>
  );
}
