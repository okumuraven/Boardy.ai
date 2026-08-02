import { useState, useEffect } from 'react';
import { apiFetch, getToken, onUnauthorized, clearToken } from './lib/api';
import LandingPage from './components/LandingPage';
import Whitepaper from './components/Whitepaper';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import Welcome from './components/Welcome';
import AppShell from './features/shell/AppShell';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileFetchError, setProfileFetchError] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const [pendingMatchOpen, setPendingMatchOpen] = useState(null);
  // Shows the one-time Welcome screen between ProfileSetup submitting and
  // the real profile being fetched - deliberately transient (not
  // persisted anywhere), so it only ever appears for a brand-new member
  // finishing setup in this session, never again on a later login.
  const [justOnboarded, setJustOnboarded] = useState(false);
  const [justOnboardedName, setJustOnboardedName] = useState('');

  // Fetches the signed-in user's own profile - identity always comes
  // from the verified session token, never a client-supplied id.
  // Reused both on sign-in (to restore a returning user without
  // re-asking their details) and after a "Redo Interview" call ends (to
  // pull the freshly-updated offer/need text once the webhook has
  // finished processing it).
  //
  // Distinguishes "this account hasn't finished onboarding yet" from
  // any other failure (network blip, wrong API URL, backend down) -
  // conflating the two used to silently bounce a returning user into
  // ProfileSetup and ask them to re-enter their details on any
  // transient hiccup.
  const fetchProfile = (showSpinner = true) => {
    if (!getToken()) return Promise.resolve(null);
    if (showSpinner) setIsLoading(true);

    return apiFetch('/api/profiles/me')
      .then(res => {
        if (!res.ok) throw new Error(`profile fetch failed with status ${res.status}`);
        return res.json();
      })
      .then(data => {
        setProfileFetchError(false);
        if (data && data.onboarding_completed) {
          setProfile({
            name: data.full_name,
            email: data.email,
            role: data.role,
            industry: data.industry,
            location: data.location,
            company: data.company,
            bio: data.bio,
            id: data.id,
            offer_text: data.offer_text,
            need_text: data.need_text,
            phone_number: data.phone_number,
            contact_preference: data.contact_preference,
            looking_for_tags: data.looking_for_tags || [],
            can_help_tags: data.can_help_tags || []
          });
        }
        return data;
      })
      .catch(err => {
        console.error(err);
        setProfileFetchError(true);
        return null;
      })
      .finally(() => { if (showSpinner) setIsLoading(false); });
  };

  // Bootstraps from a token already in localStorage (e.g. after a page
  // reload) - a real backend-issued session survives a reload far more
  // reliably than Thirdweb's own client-side connection persistence did.
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setProfile(null);
      setProfileFetchError(false);
    }
  }, [isAuthenticated]);

  // A token that's expired, or was signed before a server restart
  // rotated the signing secret, is functionally logged-out - drop back
  // to the login screen instead of leaving the user stuck on a screen
  // that can never successfully load data again.
  useEffect(() => {
    return onUnauthorized(() => {
      setIsAuthenticated(false);
      setProfile(null);
      setProfileFetchError(false);
    });
  }, []);

  const handleSignedIn = (user) => {
    setIsAuthenticated(true);
    setShowLogin(false);
    if (user.onboarding_completed) fetchProfile();
  };

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
    setProfile(null);
  };

  // ProfileSetup has just saved successfully - hold off on fetching the
  // real profile (which is what would normally mount AppShell) until the
  // person has actually clicked through the Welcome screen, so a
  // brand-new member always sees it before landing on the voice
  // interview, not a returning member on every later login.
  const handleProfileSetupComplete = (name) => {
    setJustOnboardedName(name || '');
    setJustOnboarded(true);
  };

  const handleWelcomeContinue = () => {
    setJustOnboarded(false);
    fetchProfile();
  };

  // Passed to Home's "Find a Match" action - on a fresh match, jumps the
  // shell straight to it instead of leaving the user to notice it later.
  const findMatch = () => {
    if (!profile?.id) return Promise.resolve({ status: "queued" });
    return apiFetch('/api/matchmaking/find_match', { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.status === "matched" && data.match_id) {
          setPendingMatchOpen({ matchId: data.match_id, openScheduling: false });
        }
        return data;
      })
      .catch(err => { console.error(err); return { status: "error" }; });
  };

  // Notifications carry a JSON `link` (match id, and whether this was a
  // calendar reminder that should open straight into scheduling) - see
  // AppShell for how this actually navigates the shell.
  const handleOpenNotification = (notification) => {
    try {
      const data = JSON.parse(notification.link);
      if (data.match_id) {
        setPendingMatchOpen({ matchId: data.match_id, openScheduling: !!data.open_scheduling });
      }
    } catch {
      // Older notifications predate this JSON link format - nothing to navigate to.
    }
  };

  // The two ways a Web Push click reaches the app: an already-open tab
  // gets `postMessage`d by service-worker.js's notificationclick
  // handler; a fully-closed app instead opens a fresh tab carrying the
  // link as a query param (same pattern as the Google Calendar OAuth
  // redirect elsewhere in this app).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const link = params.get("notification_link");
    if (link) {
      handleOpenNotification({ link });
      window.history.replaceState({}, "", window.location.pathname);
    }

    const handleMessage = (event) => {
      if (event.data?.type === "notification_click") {
        handleOpenNotification({ link: event.data.link });
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, []);

  const renderScreen = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}></div>
          Loading your identity...
        </div>
      );
    }

    // A returning, already-signed-in user whose profile fetch failed
    // (not a clean 404) - never fall through to ProfileSetup here, since
    // that would ask them to re-enter their details and risk
    // overwriting the real ones already on file.
    if (isAuthenticated && profileFetchError) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto' }}>
          <p style={{ marginBottom: '1.25rem' }}>Couldn't reach Kuzana Connect to load your account. Your details are safe - this is just a connection hiccup.</p>
          <button onClick={() => fetchProfile()} className="btn-primary">Try again</button>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (showWhitepaper) return <Whitepaper onBack={() => setShowWhitepaper(false)} />;
      if (showLogin) return <Login onBack={() => setShowLogin(false)} onSignedIn={handleSignedIn} />;
      return <LandingPage
                onJoinClick={() => setShowLogin(true)}
                onWhitepaperClick={() => setShowWhitepaper(true)}
             />;
    }

    if (isAuthenticated && !profile) {
      if (justOnboarded) {
        return <Welcome name={justOnboardedName} onContinue={handleWelcomeContinue} />;
      }
      return <ProfileSetup onComplete={handleProfileSetupComplete} />;
    }

    return (
      <AppShell
        profile={profile}
        onInterviewComplete={() => fetchProfile(false)}
        onFindMatch={findMatch}
        onProfileUpdated={() => fetchProfile(false)}
        onLogout={handleLogout}
        pendingMatchOpen={pendingMatchOpen}
        onConsumePendingMatchOpen={() => setPendingMatchOpen(null)}
      />
    );
  };

  return (
    <div className="app-container">
      {renderScreen()}
    </div>
  );
}
