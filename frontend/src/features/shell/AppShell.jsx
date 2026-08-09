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
import DiscussionView from "../discussion/DiscussionView";
import ThemeToggle from "./ThemeToggle";
import KuzanaMark from "../../components/KuzanaMark";
import Avatar from "../../components/Avatar";
import { HomeIcon, DirectoryIcon, MatchesIcon, CallHistoryIcon, CalendarIcon, BiziIcon, ProfileIcon, DiscussionIcon, MoreIcon } from "./icons";

const TABS = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "directory", label: "Directory", Icon: DirectoryIcon },
  { key: "matches", label: "Matches", Icon: MatchesIcon },
  { key: "calls", label: "Calls", Icon: CallHistoryIcon },
  { key: "calendar", label: "Calendar", Icon: CalendarIcon },
  { key: "bizi", label: "Bizi", Icon: BiziIcon },
  { key: "discussion", label: "Discussion", Icon: DiscussionIcon },
  { key: "profile", label: "Profile", Icon: ProfileIcon },
];

// The desktop rail has vertical room for all of TABS - the mobile tab
// bar doesn't (8 items in one fixed-height row either overflows or
// crushes every tap target below a usable size). Mobile instead shows
// the highest-frequency destinations directly and tucks the rest behind
// a "More" sheet. Calls is a passive history log (you place/answer
// calls from inside a match's chat, not from this tab) so it's lower-
// frequency than Profile, which is where people fix their offer/need
// text, manage photos, and log out - Profile stays primary, Calls moves
// into More. Profile's tab also gets the user's real avatar instead of
// a generic icon, same personal touch the desktop rail already has.
const MOBILE_PRIMARY_KEYS = ["home", "directory", "matches", "profile"];
const mobilePrimaryTabs = TABS.filter((t) => MOBILE_PRIMARY_KEYS.includes(t.key));
const mobileMoreTabs = TABS.filter((t) => !MOBILE_PRIMARY_KEYS.includes(t.key));

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
  // Mobile-only overflow sheet for the tabs that don't fit in the primary
  // row (see mobileMoreTabs above). Closes itself the moment the active
  // tab changes for any reason - picking a row inside it, a notification
  // navigating elsewhere, anything - so it never lingers open over the
  // wrong screen.
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [activeTab]);

  // CSS `dvh` should already track the real visible viewport as a mobile
  // browser's address bar shows/hides, but support for it is inconsistent
  // enough in practice (seen leaving a persistent dead gap below the
  // compose bar on Android/Samsung Internet) that it can't be trusted
  // alone. This measures the actual viewport directly and writes it as a
  // px custom property AppShell.css prefers over the dvh value, so
  // .app-shell's height is never stale or wrong for the browser chrome
  // that's actually showing right now.
  useEffect(() => {
    const setAppVh = () => {
      document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
    };
    setAppVh();
    window.addEventListener("resize", setAppVh);
    window.visualViewport?.addEventListener("resize", setAppVh);
    return () => {
      window.removeEventListener("resize", setAppVh);
      window.visualViewport?.removeEventListener("resize", setAppVh);
    };
  }, []);

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
        <div className={`shell-view ${activeTab === "discussion" ? "active" : ""}`}>
          <DiscussionView />
        </div>
        <div className={`shell-view ${activeTab === "profile" ? "active" : ""}`}>
          <ProfileView profile={profile} onProfileUpdated={onProfileUpdated} onLogout={onLogout} />
        </div>
      </div>

      <nav className="shell-tabbar">
        {mobilePrimaryTabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? "active" : ""}`}
            title={label}
            aria-label={label}
            onClick={() => setActiveTab(key)}
          >
            {key === "profile" ? (
              <Avatar avatarUrl={profile?.avatar_url} name={profile?.name} className="tab-btn-avatar" />
            ) : (
              <Icon />
            )}
            <span className="lbl">{label}</span>
          </button>
        ))}
        <button
          className={`tab-btn ${mobileMoreTabs.some((t) => t.key === activeTab) ? "active" : ""}`}
          title="More"
          aria-label="More"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <MoreIcon />
          <span className="lbl">More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-more-handle"></div>
            {mobileMoreTabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`mobile-more-row ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
