import { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";
import LandingPage from './components/LandingPage';
import Whitepaper from './components/Whitepaper';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';
import ChatRoomView from './components/ChatSystem';

export default function App() {
  const activeAccount = useActiveAccount();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const [collectedPhone, setCollectedPhone] = useState('');

  // Fetches the profile tied to the connected wallet. Reused both on wallet
  // connect (to restore a returning user without re-asking their details)
  // and after a "Redo Interview" call ends (to pull the freshly-updated
  // offer/need text once the webhook has finished processing it).
  const fetchProfile = (showSpinner = true) => {
    if (!activeAccount?.address) return Promise.resolve(null);
    if (showSpinner) setIsLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL;

    return fetch(`${apiUrl}/api/profiles/${activeAccount.address}`, {
      headers: {
        'X-Tunnel-Skip-AntiPhishing-Page': 'true'
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.onboarding_completed) {
          setProfile({
            name: data.full_name,
            role: data.role,
            id: data.id,
            offer_text: data.offer_text,
            need_text: data.need_text
          });
        }
        return data;
      })
      .catch(err => { console.error(err); return null; })
      .finally(() => { if (showSpinner) setIsLoading(false); });
  };

  // Auto-fetch profile to prevent the "refresh resets account" bug
  useEffect(() => {
    if (activeAccount?.address) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [activeAccount]);

  const [activeChatRoomId, setActiveChatRoomId] = useState(null);

  useEffect(() => {
    window.onMatchUnlocked = (roomId) => {
      setActiveChatRoomId(roomId);
    };
    return () => {
      delete window.onMatchUnlocked;
    };
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

    if (activeChatRoomId) {
      return <ChatRoomView roomId={activeChatRoomId} profile={profile} onBack={() => setActiveChatRoomId(null)} />;
    }

    return <Dashboard profile={profile} onInterviewComplete={() => fetchProfile(false)} />;
  };

  return (
    <div className={`app-container ${(!activeAccount && !showLogin) ? 'no-padding' : ''}`}>
      {renderScreen()}
    </div>
  );
}
