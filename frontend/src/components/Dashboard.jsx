import { useState, useEffect } from "react";
import { useDisconnect } from "thirdweb/react";
import { client } from "../client";
import Vapi from "@vapi-ai/web";

import { prepareTransaction, toWei } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";

export default function Dashboard({ profile }) {
  const { disconnect } = useDisconnect();
  const [callStatus, setCallStatus] = useState("inactive"); // inactive, connecting, active
  const [vapiInstance, setVapiInstance] = useState(null);
  
  // Thirdweb transaction hook
  const { mutate: sendTx, isPending } = useSendTransaction();

  useEffect(() => {
    // Initialize Vapi with Public Key from env
    // Vite sometimes wraps CommonJS modules, so we check for .default
    const VapiClass = Vapi.default || Vapi;
    const vapi = new VapiClass(import.meta.env.VITE_VAPI_PUBLIC_KEY || "dummy_key");
    setVapiInstance(vapi);

    vapi.on("call-start", () => setCallStatus("active"));
    vapi.on("call-end", () => setCallStatus("inactive"));
    vapi.on("error", (e) => {
      console.error(e);
      setCallStatus("inactive");
    });

    return () => vapi.removeAllListeners();
  }, []);

  const handleStakeClick = () => {
    // Prepare a transaction to send 0.01 AVAX to the Boardy Escrow Wallet
    const transaction = prepareTransaction({
      to: "0x1111111111111111111111111111111111111111", // Placeholder Treasury Wallet
      value: toWei("0.01"),
      chain: defineChain(43114), // Avalanche C-Chain (Mainnet) or 43113 for Fuji
      client: client
    });
    
    sendTx(transaction, {
      onSuccess: () => {
        alert("Payment successful! The AI is now finding your matches...");
        // Here we would tell the backend the fee is paid and to execute the match algorithm!
      },
      onError: (err) => {
        console.error("Transaction failed:", err);
        alert("Transaction failed. Please try again.");
      }
    });
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
            wallet_address: profile.id // The user's internal database ID or wallet
          }
        });
      } catch (err) {
        console.error("Vapi Error:", err);
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              To ensure high-quality matches and prevent ghosting, we require a small 0.01 AVAX commitment stake on the Avalanche network.
            </p>
            
            <button 
              className="btn-primary" 
              onClick={handleStakeClick}
              disabled={isPending}
              style={{ width: '100%', padding: '1rem', position: 'relative' }}
            >
              {isPending ? "Confirming Transaction..." : "Stake 0.01 AVAX to Unlock Matches"}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Funds are securely held in the Boardy.ai smart contract.
            </p>
            
            <button 
              onClick={() => window.location.reload()} 
              style={{ display: 'block', margin: '1.5rem auto 0', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Refresh Status
            </button>
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
              <button 
                onClick={() => window.location.reload()} 
                style={{ display: 'block', margin: '1rem auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Refresh Data (If you just finished a call)
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => disconnect(client)}
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
