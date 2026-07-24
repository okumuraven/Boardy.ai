import { useState } from 'react';
import { apiFetch } from '../lib/api';
import KuzanaMark from './KuzanaMark';
import { INDUSTRIES } from "../constants/industries";

export default function ProfileSetup({ onComplete }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('founder');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.length < 2) return alert("Please enter your name");

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await apiFetch('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({
          full_name: name,
          phone_number: phoneNumber,
          role: role,
          industry: industry,
          company: company,
          location: location,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save profile on backend.");
      }
      const data = await response.json();
      onComplete({ name, phoneNumber, role, industry, company, location, id: data.id });

    } catch (error) {
      // Never silently proceed on failure - a fake local profile means the
      // interview that follows has nowhere real to be saved.
      console.error("Profile creation failed:", error);
      setSubmitError(error.message === "Failed to save profile on backend."
        ? "Couldn't reach the server to save your profile. Check your connection and try again."
        : error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <div style={{ color: 'var(--signal)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="dot online"></span>
          Signed in
        </div>
      </nav>

      <main className="onboarding-container" style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <div className="onboarding-content">
          <h1 className="ai-greeting" style={{ fontSize: '2.7rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
            Who am I <span className="accent-text">speaking to?</span>
          </h1>

          <p className="ai-subtext" style={{ maxWidth: '500px', animationDelay: '0.2s', marginBottom: '3rem' }}>
            You're all set up. A couple of details before we start the voice interview.
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.4s' }}>

            {/* Name Field */}
            <div className="field">
              <input
                type="text"
                placeholder="Your full name"
                className="premium-input"
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Phone Field - an honest, unverified contact field, not a
                security gate. No checkmark/"verified" copy here: we never
                confirm this number belongs to whoever typed it. */}
            <div className="field">
              <input
                type="tel"
                placeholder="Phone number (optional)"
                className="premium-input"
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem' }}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Company Field */}
            <div className="field">
              <input
                type="text"
                placeholder="Company or business name (optional)"
                className="premium-input"
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem' }}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Location Field */}
            <div className="field">
              <input
                type="text"
                placeholder="Location (optional)"
                className="premium-input"
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem' }}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Role Dropdown */}
            <div className="field">
              <select
                className="premium-input"
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%235a6172%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.8rem' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="founder" style={{ background: 'var(--ink)' }}>Founder / CEO</option>
                <option value="developer" style={{ background: 'var(--ink)' }}>Lead Developer</option>
                <option value="designer" style={{ background: 'var(--ink)' }}>Product Designer</option>
                <option value="investor" style={{ background: 'var(--ink)' }}>Angel Investor</option>
              </select>
            </div>

            {/* Industry Dropdown */}
            <div className="field">
              <select
                className="premium-input"
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 0.5rem', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%235a6172%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.8rem' }}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i} style={{ background: 'var(--ink)' }}>{i}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="action-btn ready"
              style={{ width: '100%', height: '56px', borderRadius: '4px', marginTop: '1rem', fontSize: '1.1rem', fontWeight: 600 }}
              disabled={isSubmitting || name.length < 2}
            >
              {isSubmitting ? (
                <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
              ) : 'Start voice interview'}
            </button>
            {submitError && (
              <p style={{ color: 'var(--warn)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>{submitError}</p>
            )}
          </form>
        </div>

        <div className="onboarding-visual">
          <KuzanaMark />
        </div>
      </main>
    </div>
  );
}
