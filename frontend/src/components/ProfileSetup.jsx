import { useState } from 'react';
import { useActiveAccount } from "thirdweb/react";

export default function ProfileSetup({ onComplete }) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('founder');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeAccount = useActiveAccount();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.length < 2) return alert("Please enter your name");
    if (phoneNumber.length < 9) return alert("Please enter a valid phone number");
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: activeAccount?.address,
          full_name: name,
          phone_number: phoneNumber,
          role: role
        }),
      });

      if (!response.ok) throw new Error("Failed to save profile on backend.");
      const data = await response.json();
      onComplete({ name, phoneNumber, role, id: data.id });
      
    } catch (error) {
      console.error(error);
      alert("Error saving profile to the backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card animate-in">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 className="title">Complete Profile</h2>
        <p className="subtitle">Set up your professional identity before your AI interview.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input 
            type="text" 
            className="input-field"
            placeholder="e.g. Satoshi Nakamoto" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Phone Number</label>
          <input 
            type="tel" 
            className="input-field"
            placeholder="+1 (555) 000-0000" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Primary Role</label>
          <select 
            className="input-field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="founder">Founder / CEO</option>
            <option value="developer">Lead Developer</option>
            <option value="designer">Product Designer</option>
            <option value="investor">Angel Investor</option>
          </select>
        </div>
        
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <svg viewBox="0 0 50 50" style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite' }}>
                <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="31.4 100" strokeLinecap="round" />
              </svg>
              Saving Profile...
            </>
          ) : 'Save & Continue'}
        </button>
      </form>
    </div>
  );
}
