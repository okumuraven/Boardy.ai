import { useState, useEffect } from 'react';
import { useActiveAccount } from "thirdweb/react";

export default function ProfileSetup({ onComplete, phone }) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [role, setRole] = useState('founder');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeAccount = useActiveAccount();

  useEffect(() => {
    if (phone && !phoneNumber) {
      setPhoneNumber(phone);
    }
  }, [phone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.length < 2) return alert("Please enter your name");
    if (phoneNumber.length < 9) return alert("Please enter a valid phone number");
    
    setIsSubmitting(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/api/profiles`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-AntiPhishing-Page': 'true'
        },
        body: JSON.stringify({
          wallet_address: activeAccount?.address,
          full_name: name,
          phone_number: phoneNumber,
          role: role
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save profile on backend.");
      }
      const data = await response.json();
      onComplete({ name, phoneNumber, role, id: data.id });
      
    } catch (error) {
      console.warn("Backend is offline. Proceeding to Dashboard in Offline Mode.");
      // Fallback for MVP testing so you are never stuck on this screen
      onComplete({ name, phoneNumber, role, id: activeAccount?.address || "local_testing_id" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="vokazi-icon">V</div>
          <span className="brand-text">Vokazi</span>
        </div>
        <div style={{ color: '#4ade80', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
          Wallet Connected
        </div>
      </nav>

      <main className="onboarding-container" style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        
        <h1 className="ai-greeting" style={{ fontSize: '3rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
          Initialize <span className="gradient-text">Identity</span>
        </h1>
        
        <p className="ai-subtext" style={{ maxWidth: '500px', animationDelay: '0.2s', marginBottom: '3rem' }}>
          Your invisible Avalanche wallet is provisioned. Who will I be speaking to during the Voice Interview?
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.4s' }}>
          
          {/* Verified Phone Field */}
          <div style={{ background: 'rgba(10, 11, 20, 0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0, 240, 255, 0.1)', borderRadius: '24px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'left', fontWeight: 500 }}>Verified Contact</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>+254 {phoneNumber}</span>
            </div>
            <div style={{ color: 'rgba(0, 240, 255, 0.8)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>

          {/* Name Field */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: '24px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', transition: 'all 0.3s' }}>
            <input 
              type="text" 
              placeholder="Your Full Name" 
              className="premium-input"
              style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Role Dropdown */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: '24px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', transition: 'all 0.3s' }}>
            <select 
              className="premium-input"
              style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b8b9e%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.8rem' }}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="founder" style={{ background: '#03040c' }}>Founder / CEO</option>
              <option value="developer" style={{ background: '#03040c' }}>Lead Developer</option>
              <option value="designer" style={{ background: '#03040c' }}>Product Designer</option>
              <option value="investor" style={{ background: '#03040c' }}>Angel Investor</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="action-btn ready"
            style={{ width: '100%', height: '56px', borderRadius: '24px', marginTop: '1rem', fontSize: '1.1rem', fontWeight: 600 }}
            disabled={isSubmitting || name.length < 2}
          >
            {isSubmitting ? (
              <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : 'Start Voice Interview'}
          </button>
        </form>

      </main>
    </div>
  );
}
