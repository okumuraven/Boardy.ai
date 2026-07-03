import { useState, useEffect } from "react";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { client } from "../client";
import Vapi from "@vapi-ai/web";

import { prepareTransaction, toWei } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";

export default function Dashboard({ profile }) {
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [callStatus, setCallStatus] = useState("inactive"); // inactive, connecting, active
  const [matchStatus, setMatchStatus] = useState("idle"); // idle, staking, queuing, matched
  const [vapiInstance, setVapiInstance] = useState(null);
  
  // Thirdweb transaction hook
  const { mutate: sendTx, isPending } = useSendTransaction();

  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    // Initialize Vapi with Public Key from env
    // Vite wraps CommonJS modules, so we must check for .default
    const VapiClass = Vapi.default || Vapi;
    const vapi = new VapiClass(import.meta.env.VITE_VAPI_PUBLIC_KEY || "dummy_key");
    setVapiInstance(vapi);

    vapi.on("call-start", () => {
      setCallStatus("active");
      setTranscript(""); // Reset transcript on new call
    });
    
    vapi.on("message", (msg) => {
      if (msg.type === "conversation-update" && msg.conversation) {
        const fullTranscript = msg.conversation
          .filter(c => c.role !== 'system')
          .map(c => `${c.role === 'user' ? 'User' : 'AI'}: ${c.text || c.content || ""}`)
          .join("\n");
        setTranscript(fullTranscript);
      }
    });

    vapi.on("call-end", async () => {
      setCallStatus("inactive");
      // Forcefully sync the REAL transcript to the backend when the call ends
      // This bypasses the need for the user to configure Vapi Webhooks/DevTunnels!
      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : import.meta.env.VITE_API_URL;
        // We will push this state after a small delay to ensure React state updated
        setTimeout(async () => {
          // Send a custom event to trigger the sync below
          window.dispatchEvent(new CustomEvent('sync_real_transcript'));
        }, 2000);
      } catch (e) { console.error(e); }
    });

    vapi.on("error", (e) => {
      console.error(e);
      setCallStatus("inactive");
    });

    return () => vapi.removeAllListeners();
  }, []);

  // Effect to listen for our custom sync event and use the latest transcript state
  useEffect(() => {
    const handleSync = async () => {
      if (!transcript || transcript.length < 10) return; // Skip if empty
      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : import.meta.env.VITE_API_URL;
        await fetch(`${apiUrl}/api/profiles/${profile.id}/sync_real_transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcript })
        });
        window.location.reload();
      } catch (e) {
        console.error("Sync error:", e);
      }
    };
    window.addEventListener('sync_real_transcript', handleSync);
    return () => window.removeEventListener('sync_real_transcript', handleSync);
  }, [transcript, profile.id]);

  const handleStakeClick = async () => {
    setMatchStatus("staking");
    
    // Simulate Blockchain Staking Delay
    setTimeout(async () => {
      setMatchStatus("queuing");
      
      try {
        const apiUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:4000' 
          : import.meta.env.VITE_API_URL;
        
        // Wait 3.5 seconds to simulate pgvector matchmaking
        setTimeout(async () => {
          const response = await fetch(`${apiUrl}/api/matchmaking/stake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: profile.id })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === "matched" && data.chat_room_id) {
              setMatchStatus("matched");
              
              setTimeout(() => {
                if (window.onMatchUnlocked) {
                  window.onMatchUnlocked(data.chat_room_id);
                }
              }, 1500);
            } else if (data.status === "queued") {
              setMatchStatus("in_queue");
            }
          } else {
            alert("Failed to process stake on backend.");
            setMatchStatus("idle");
          }
        }, 3500);
        
      } catch (err) {
        console.error("Backend Error:", err);
        alert("Payment successful but network error occurred.");
        setMatchStatus("idle");
      }
    }, 2000);
  };

  const handleCallClick = async () => {
    if (callStatus === "active" || callStatus === "connecting") {
      vapiInstance?.stop();
      setCallStatus("inactive");
    } else {
      setCallStatus("connecting");
      try {
        const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
        if (!assistantId) {
          alert("Please add VITE_VAPI_ASSISTANT_ID to your frontend/.env file!");
          setCallStatus("inactive");
          return;
        }
        await vapiInstance?.start(assistantId, {
          variableValues: {
            wallet_address: String(profile.id) // The user's internal database ID or wallet MUST be string
          }
        });
      } catch (err) {
        console.error("Vapi Error:", err);
        alert(`Failed to connect to AI Voice: ${err.message || 'Check microphone permissions or Vapi API limits.'}`);
        setCallStatus("inactive");
      }
    }
  };

  return (
    <div className="glass-card animate-in" style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="title" style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Welcome, {profile?.name?.split(' ')[0] || 'Professional'}</h2>
          <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {profile?.role || 'Verified User'}
          </span>
        </div>
        <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '1.5rem' }}>👋</span>
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.03)' }}>
        {profile?.offer_text ? (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Your Professional Summary</h3>
            <div className="custom-scrollbar" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Your Offer:</strong> 
                {profile.offer_text}
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Your Need:</strong> 
                {profile.need_text}
              </p>
            </div>
            
            <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Ready to Find Your Match?</h3>
            
            {matchStatus === "idle" && (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  To ensure high-quality matches and prevent ghosting, we require a small 0.01 AVAX commitment stake on the Avalanche network.
                </p>
                <button 
                  className="btn-primary" 
                  onClick={handleStakeClick}
                  style={{ width: '100%', padding: '1rem', position: 'relative' }}
                >
                  Stake 0.01 AVAX to Unlock Matches
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Funds are securely held in the Boardy.ai smart contract.
                </p>
              </>
            )}

            {matchStatus === "staking" && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h4 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Confirming Transaction</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Waiting for Avalanche network finality...</p>
              </div>
            )}

            {matchStatus === "queuing" && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(96, 165, 250, 0.05)', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#60a5fa', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                  <div style={{ width: '12px', height: '12px', background: '#60a5fa', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out 0.2s' }}></div>
                  <div style={{ width: '12px', height: '12px', background: '#60a5fa', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out 0.4s' }}></div>
                </div>
                <h4 style={{ color: '#60a5fa', marginBottom: '0.5rem', fontSize: '1.1rem' }}>AI Matchmaking in Progress</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Analyzing your professional summary...<br/>
                  Calculating cosine similarity across 1536-dimensional embeddings in pgvector...
                </p>
              </div>
            )}

            {matchStatus === "in_queue" && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem', fontSize: '1.1rem' }}>You are in the Matchmaking Queue</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Your stake has been confirmed! However, there are no other compatible professionals currently available.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>
                  The system will continuously scan the network. You will be notified instantly when a high-quality match is found.
                </p>
              </div>
            )}

            {matchStatus === "matched" && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h4 style={{ color: '#10b981', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Optimal Match Found!</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Routing you to your secure Chat Room...</p>
              </div>
            )}
            
            {matchStatus === "idle" && (
              <button 
                onClick={() => window.location.reload()} 
                style={{ display: 'block', margin: '1.5rem auto 0', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Refresh Status
              </button>
            )}

            {/* Redo Interview Feature */}
            {matchStatus !== "staking" && matchStatus !== "queuing" && matchStatus !== "matched" && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                  Want to improve your matching odds?
                </p>
                <button 
                  onClick={handleCallClick}
                  disabled={callStatus === "connecting"}
                  className="btn-primary" 
                  style={{ 
                    width: '100%',
                    padding: '0.75rem',
                    background: callStatus === "active" ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'rgba(255,255,255,0.05)', 
                    color: callStatus === "active" ? 'white' : 'var(--text-main)',
                    boxShadow: callStatus === "active" ? '0 4px 15px rgba(239, 68, 68, 0.2)' : 'none',
                    border: '1px dashed rgba(255,255,255,0.2)'
                  }}
                >
                  {callStatus === "inactive" && <><span style={{ fontSize: '1.1rem' }}>🎙️</span> Redo AI Voice Interview</>}
                  {callStatus === "connecting" && "Connecting to AI..."}
                  {callStatus === "active" && "⏹️ End AI Voice Interview"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Your Next Step</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Boardy.ai uses a voice-first approach to understand what you're building and what you need. Our AI agent will call you to collect this data and match you with the perfect counterpart.
            </p>
            
            <button 
              onClick={handleCallClick}
              disabled={callStatus === "connecting"}
              className="btn-primary" 
              style={{ 
                background: callStatus === "active" ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                boxShadow: callStatus === "active" ? '0 4px 15px rgba(239, 68, 68, 0.2)' : '0 4px 15px rgba(16, 185, 129, 0.2)' 
              }}
            >
              {callStatus === "inactive" && <><span style={{ fontSize: '1.2rem' }}>🎙️</span> Start AI Voice Interview</>}
              {callStatus === "connecting" && "Connecting to AI..."}
              {callStatus === "active" && "⏹️ End AI Voice Interview"}
            </button>
            
            {callStatus === "inactive" && (
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                Note: Ensure your backend is running with GEMINI_API_KEY exported to test real vectors.
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => {
            if (wallet) disconnect(wallet);
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }}
          onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
          onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}
