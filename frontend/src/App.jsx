import { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";
import LandingPage from './components/LandingPage';
import Whitepaper from './components/Whitepaper';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import AppShell from './features/shell/AppShell';

export default function App() {
  const activeAccount = useActiveAccount();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileFetchError, setProfileFetchError] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const [collectedPhone, setCollectedPhone] = useState('');
  const [pendingMatchOpen, setPendingMatchOpen] = useState(null);

  // Fetches the profile tied to the connected wallet. Reused both on wallet
  // connect (to restore a returning user without re-asking their details)
  // and after a "Redo Interview" call ends (to pull the freshly-updated
  // offer/need text once the webhook has finished processing it).
  //
  // Distinguishes "this wallet genuinely has no profile" (a real 404)
  // from any other failure (network blip, wrong API URL, backend down) -
  // conflating the two used to silently bounce a returning user into
  // ProfileSetup and ask them to re-type their phone number from
  // scratch on any transient hiccup, risking a mismatched number
  // overwriting the real one already on file.
  const fetchProfile = (showSpinner = true) => {
    if (!activeAccount?.address) return Promise.resolve(null);
    if (showSpinner) setIsLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL;

    return fetch(`${apiUrl}/api/profiles/${activeAccount.address}`, {
      headers: {
        'X-Tunnel-Skip-AntiPhishing-Page': 'true'
      }
    })
      .then(res => {
        if (res.status === 404) return { notFound: true };
        if (!res.ok) throw new Error(`profile fetch failed with status ${res.status}`);
        return res.json();
      })
      .then(data => {
        setProfileFetchError(false);
        if (data && !data.notFound && data.onboarding_completed) {
          setProfile({
            name: data.full_name,
            role: data.role,
            id: data.id,
            offer_text: data.offer_text,
            need_text: data.need_text,
            phone_number: data.phone_number,
            contact_preference: data.contact_preference
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

  // Auto-fetch profile to prevent the "refresh resets account" bug
  useEffect(() => {
    if (activeAccount?.address) {
      fetchProfile();
    } else {
      setProfile(null);
      setProfileFetchError(false);
    }
  }, [activeAccount]);

  // Passed to Home's "Find a Match" action - on a fresh match, jumps the
  // shell straight to it instead of leaving the user to notice it later.
  const findMatch = () => {
    if (!profile?.id) return Promise.resolve({ status: "queued" });
    const apiUrl = import.meta.env.VITE_API_URL;
    return fetch(`${apiUrl}/api/matchmaking/find_match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.id }),
    })
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
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          Loading your identity...
        </div>
      );
    }

    // A returning, already-onboarded wallet whose profile fetch failed
    // (not a clean 404) - never fall through to ProfileSetup here, since
    // that would ask them to re-enter their phone number and risk a
    // mismatched number silently overwriting the real one on file.
    if (activeAccount && profileFetchError) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto' }}>
          <p style={{ marginBottom: '1.25rem' }}>Couldn't reach Vokazi to load your account. Your details are safe - this is just a connection hiccup.</p>
          <button onClick={() => fetchProfile()} className="btn-primary">Try again</button>
        </div>
      );
    }

    if (!activeAccount) {
      if (showWhitepaper) return <Whitepaper onBack={() => setShowWhitepaper(false)} />;
      if (showLogin) return <Login onBack={() => setShowLogin(false)} collectedPhone={collectedPhone} />;
      return <LandingPage
                onJoinClick={(phone) => { setCollectedPhone(phone); setShowLogin(true); }}
                onWhitepaperClick={() => setShowWhitepaper(true)}
             />;
    }

    if (activeAccount && !profile) {
      return <ProfileSetup onComplete={setProfile} phone={collectedPhone} />;
    }

    return (
      <AppShell
        profile={profile}
        onInterviewComplete={() => fetchProfile(false)}
        onFindMatch={findMatch}
        onProfileUpdated={() => fetchProfile(false)}
        pendingMatchOpen={pendingMatchOpen}
        onConsumePendingMatchOpen={() => setPendingMatchOpen(null)}
      />
    );
  };

  return (
    <div className={`app-container ${(!activeAccount && !showLogin) ? 'no-padding' : ''}`}>
      {renderScreen()}
    </div>
  );
}
