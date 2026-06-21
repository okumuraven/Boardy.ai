import { useState, useEffect } from "react";
import { useDisconnect } from "thirdweb/react";
import { client } from "../client";
import Vapi from "@vapi-ai/web";

export default function Dashboard({ profile }) {
  const { disconnect } = useDisconnect();
  const [callStatus, setCallStatus] = useState("inactive"); // inactive, connecting, active
  const [vapiInstance, setVapiInstance] = useState(null);

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
        await vapiInstance?.start(assistantId);
      } catch (err) {
        console.error("Vapi Error:", err);
        setCallStatus("inactive");
      }
    }
  };

  return (
    <div className="glass-card animate-in" style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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
