import { useState, useEffect } from "react";
import NotificationBell from "../notifications";
import IncomingCallBanner from "./IncomingCallBanner";
import "./AppShell.css";
import FeedbackWidget from "../../components/FeedbackWidget";
import HomeView from "../home/HomeView";
import DirectoryView from "../directory";
import MatchesView from "../matches/MatchesView";
import CallHistoryView from "../calls";
import CalendarView from "../calendar/CalendarView";
import BiziSection from "../bizi/BiziSection";
import ProfileView from "../profile/ProfileView";
import ThemeToggle from "./ThemeToggle";
import KuzanaMark from "../../components/KuzanaMark";
import Avatar from "../../components/Avatar";
import { HomeIcon, DirectoryIcon, MatchesIcon, CallHistoryIcon, CalendarIcon, BiziIcon, ProfileIcon } from "./icons";

const TABS = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "directory", label: "Directory", Icon: DirectoryIcon },
  { key: "matches", label: "Matches", Icon: MatchesIcon },
  { key: "calls", label: "Calls", Icon: CallHistoryIcon },
  { key: "calendar", label: "Calendar", Icon: CalendarIcon },
  { key: "bizi", label: "Bizi", Icon: BiziIcon },
  { key: "profile", label: "Profile", Icon: ProfileIcon },
];

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

export default function AppShell({ profile, onInterviewComplete, onFindMatch, onProfileUpdated, onLogout, pendingMatchOpen, onConsumePendingMatchOpen }) {
  const [activeTab, setActiveTab] = useState(initialTabFromUrl);
  const [openRequest, setOpenRequest] = useState(null);
  const [biziOpenRequest, setBiziOpenRequest] = useState(null);
  // Every tab stays mounted (see below), so MatchesView's own one-time
  // fetch-on-mount never learns about a match created from the Directory
  // tab. Bumping this forces a refetch without tearing MatchesView down.
  const [matchesRefreshKey, setMatchesRefreshKey] = useState(0);
  // Mobile only (see the CSS): a match/chat open on the Matches tab hides
  // the bottom tab bar entirely, the same way WhatsApp/Telegram give a
  // conversation the whole screen instead of the app's main nav.
  const [matchChatOpen, setMatchChatOpen] = useState(false);

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

  // Shared by the global incoming-call banner and tapping a Call
  // History row - same navigation as a notification click, just without
  // an `open_scheduling` flag. Landing on the chat is enough: if a call
  // is still ringing, the backend re-pushes it the moment that
  // chat_room channel (re)joins, surfacing the real Accept/Decline UI.
  const openMatchChat = (matchId) => {
    setActiveTab("matches");
    setOpenRequest({ matchId, openScheduling: false });
  };

  // From a Calendar card's "View" on a booked Bizi call (Phase D).
  const openBiziApplication = (applicationId) => {
    setActiveTab("bizi");
    setBiziOpenRequest({ applicationId });
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
    <div className={`app-shell ${activeTab === "matches" && matchChatOpen ? "chat-open" : ""}`}>
      <IncomingCallBanner profile={profile} onAnswer={openMatchChat} />
      <FeedbackWidget />

      <nav className="shell-rail">
        <div className="rail-brand"><KuzanaMark /></div>
        <div className="rail-nav">{navButtons("rail-btn", "active")}</div>
        <div className="rail-bottom">
          <ThemeToggle />
          <NotificationBell profile={profile} onOpen={handleBellOpen} />
          <button className="rail-avatar-btn" title={profile?.name || "Profile"} onClick={() => setActiveTab("profile")}>
            <Avatar avatarUrl={profile?.avatar_url} name={profile?.name} className="rail-avatar" />
          </button>
        </div>
      </nav>

      <div className="shell-content">
        <div className={`shell-view ${activeTab === "home" ? "active" : ""}`}>
          <HomeView
            profile={profile}
            onInterviewComplete={onInterviewComplete}
            onFindMatch={onFindMatch}
            onOpenProfile={() => setActiveTab("profile")}
          />
        </div>
        <div className={`shell-view ${activeTab === "directory" ? "active" : ""}`}>
          <DirectoryView profile={profile} onMatchCreated={() => setMatchesRefreshKey((k) => k + 1)} />
        </div>
        <div className={`shell-view ${activeTab === "matches" ? "active" : ""}`}>
          <MatchesView
            profile={profile}
            openRequest={openRequest}
            onConsumeOpenRequest={() => setOpenRequest(null)}
            refreshKey={matchesRefreshKey}
            onChatOpenChange={setMatchChatOpen}
          />
        </div>
        <div className={`shell-view ${activeTab === "calls" ? "active" : ""}`}>
          <CallHistoryView profile={profile} onOpenMatch={openMatchChat} />
        </div>
        <div className={`shell-view ${activeTab === "calendar" ? "active" : ""}`}>
          <CalendarView profile={profile} onOpenMatch={openMatchScheduling} onOpenBizi={openBiziApplication} />
        </div>
        <div className={`shell-view ${activeTab === "bizi" ? "active" : ""}`}>
          <BiziSection profile={profile} openRequest={biziOpenRequest} onConsumeOpenRequest={() => setBiziOpenRequest(null)} />
        </div>
        <div className={`shell-view ${activeTab === "profile" ? "active" : ""}`}>
          <ProfileView profile={profile} onProfileUpdated={onProfileUpdated} onLogout={onLogout} />
        </div>
      </div>

      <nav className="shell-tabbar">{navButtons("tab-btn", "active")}</nav>
    </div>
  );
}
