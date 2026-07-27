import { useState } from 'react';
import { apiFetch } from '../lib/api';
import KuzanaMark from './KuzanaMark';
import { INDUSTRIES } from "../constants/industries";
import { ROLES, roleTitle } from "../constants/roles";

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
      // Re-fetch the real, complete profile from the server rather than
      // hand-building a local object here - a hand-built object drifted
      // out of sync with the API's actual field names (phoneNumber vs.
      // phone_number) and was missing fields entirely (bio,
      // contact_preference, tags), so the phone number silently didn't
      // show up until the next edit-and-save round-tripped through the
      // server. This is the same refetch-after-write pattern
      // ProfileView's edit form already uses (onProfileUpdated).
      // Passes the name along so App.jsx's one-time Welcome screen can
      // greet the person by name before their real profile has even been
      // fetched yet.
      await onComplete(name);

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
          <h1 className="ai-greeting ai-greeting-compact" style={{ marginBottom: '1rem', animationDelay: '0.1s' }}>
            Who am I <span className="accent-text">speaking to?</span>
          </h1>

          <p className="ai-subtext" style={{ maxWidth: '500px', animationDelay: '0.2s', marginBottom: '2.5rem' }}>
            You're all set up. A couple of details before we start the voice interview.
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.4s' }}>

            {/* Name Field */}
            <label className="setup-field">
              <span className="setup-field-label">Full name</span>
              <div className="setup-field-control">
                <input
                  type="text"
                  placeholder="e.g. Jane Wanjiru"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </label>

            {/* Phone Field - an honest, unverified contact field, not a
                security gate. No checkmark/"verified" copy here: we never
                confirm this number belongs to whoever typed it. */}
            <label className="setup-field">
              <span className="setup-field-label">Phone (optional)</span>
              <div className="setup-field-control">
                <input
                  type="tel"
                  placeholder="e.g. 07XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </label>

            {/* Company Field */}
            <label className="setup-field">
              <span className="setup-field-label">Company (optional)</span>
              <div className="setup-field-control">
                <input
                  type="text"
                  placeholder="Your company or business name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </label>

            {/* Location Field */}
            <label className="setup-field">
              <span className="setup-field-label">Location (optional)</span>
              <div className="setup-field-control">
                <input
                  type="text"
                  placeholder="City, country"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </label>

            {/* Role Dropdown */}
            <label className="setup-field">
              <span className="setup-field-label">I'm here as a...</span>
              <div className="setup-field-control">
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleTitle(r)}</option>
                  ))}
                </select>
                <svg className="setup-field-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </label>

            {/* Industry Dropdown */}
            <label className="setup-field">
              <span className="setup-field-label">Industry</span>
              <div className="setup-field-control">
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <svg className="setup-field-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </label>

            <button
              type="submit"
              className="action-btn ready landing-cta"
              style={{ width: '100%', height: '56px', borderRadius: '6px', marginTop: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}
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
