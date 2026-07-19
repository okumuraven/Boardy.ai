import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from "thirdweb/react";
import LandingPage from './components/LandingPage';
import Whitepaper from './components/Whitepaper';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';
import ChatRoomView from './components/ChatSystem';
import MatchReview from './components/MatchReview';
import StakingGate from './components/StakingGate';

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
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [chatPartnerName, setChatPartnerName] = useState(null);
  const [pendingMatch, setPendingMatch] = useState(null);

  // Checks whether this user already has an active match - awaiting
  // mutual consent, awaiting an on-chain stake, or already unlocked (so
  // a returning user lands back in the right screen instead of an empty
  // "no match" state). Reused on profile load and after every step of
  // the consent/staking flow, since each step needs the next screen's
  // fresh data rather than guessing it locally.
  const fetchPendingMatch = useCallback(() => {
    if (!profile?.id) {
      setPendingMatch(null);
      return;
    }
    const apiUrl = import.meta.env.VITE_API_URL;
    fetch(`${apiUrl}/api/matches/pending?user_id=${profile.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const match = data?.match || null;
        if (match?.status === "unlocked" && match.chat_room_id) {
          setChatPartnerName(match.other_user?.name || null);
          setActiveMatchId(match.match_id);
          setActiveChatRoomId(match.chat_room_id);
          setPendingMatch(null);
        } else {
          setPendingMatch(match);
        }
      })
      .catch(err => console.error(err));
  }, [profile?.id]);

  useEffect(() => {
    fetchPendingMatch();
  }, [fetchPendingMatch]);

  // Passed down to Dashboard's "Find a Match" action - triggers the
  // matching pipeline on demand and shows the review screen immediately
  // if a candidate clears validation.
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
        if (data.status === "matched") setPendingMatch(data);
        return data;
      })
      .catch(err => { console.error(err); return { status: "error" }; });
  };

  const handleMatchResolved = ({ unlocked, declined, awaitingStake, matchId, chatRoomId, otherUserName }) => {
    if (unlocked && chatRoomId) {
      setPendingMatch(null);
      setChatPartnerName(otherUserName || null);
      setActiveMatchId(matchId || null);
      setActiveChatRoomId(chatRoomId);
    } else if (declined) {
      setPendingMatch(null);
    } else if (awaitingStake) {
      // Mutual consent just completed - refetch to pick up the "pending"
      // status (and onchain_match_id) so renderScreen swaps to StakingGate.
      fetchPendingMatch();
    }
  };

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
      return (
        <ChatRoomView
          roomId={activeChatRoomId}
          matchId={activeMatchId}
          profile={profile}
          partnerName={chatPartnerName}
          onBack={() => {
            setActiveChatRoomId(null);
            setActiveMatchId(null);
            setChatPartnerName(null);
          }}
        />
      );
    }

    if (pendingMatch?.status === "pending") {
      return <StakingGate profile={profile} match={pendingMatch} onResolved={handleMatchResolved} />;
    }

    if (pendingMatch) {
      return <MatchReview profile={profile} initialMatch={pendingMatch} onResolved={handleMatchResolved} />;
    }

    return <Dashboard profile={profile} onInterviewComplete={() => fetchProfile(false)} onFindMatch={findMatch} />;
  };

  return (
    <div className={`app-container ${(!activeAccount && !showLogin) ? 'no-padding' : ''}`}>
      {renderScreen()}
    </div>
  );
}
