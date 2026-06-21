import { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";
import LandingPage from './components/LandingPage';
import Whitepaper from './components/Whitepaper';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';

export default function App() {
  const activeAccount = useActiveAccount();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);

  // Auto-fetch profile to prevent the "refresh resets account" bug
  useEffect(() => {
    if (activeAccount?.address) {
      setIsLoading(true);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profiles/${activeAccount.address}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.onboarding_completed) {
            setProfile({ name: data.full_name, role: data.role, id: data.id });
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    } else {
      setProfile(null);
    }
  }, [activeAccount]);

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
      if (showLogin) return <Login onBack={() => setShowLogin(false)} />;
      return <LandingPage onJoinClick={() => setShowLogin(true)} onWhitepaperClick={() => setShowWhitepaper(true)} />;
    }
    
    if (activeAccount && !profile) {
      return <ProfileSetup onComplete={setProfile} />;
    }

    return <Dashboard profile={profile} />;
  };

  return (
    <div className="app-container" style={{ padding: (!activeAccount && !showLogin) ? '0' : '2rem' }}>
      { (activeAccount || showLogin) && (
        <header className="brand-header">
          <div className="brand-logo">B</div>
          <span className="brand-text">Boardy.ai</span>
        </header>
      )}

      {renderScreen()}
    </div>
  );
}
