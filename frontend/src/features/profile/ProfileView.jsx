import { useState } from "react";
import { apiFetch } from "../../lib/api";
import SocialProfileSection from "./SocialProfileSection";
import StatsCard from "./StatsCard";
import InvestmentDetailsForm from "./InvestmentDetailsForm";
import BiziSection from "../bizi/BiziSection";
import ThemeToggle from "../shell/ThemeToggle";
import { INDUSTRIES } from "../../constants/industries";
import { ROLES, roleTitle as roleLabel, isCapitalSideRole } from "../../constants/roles";

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const CONTACT_MODES = ["call", "video", "chat"];
const CONTACT_LABEL = { call: "📞 Call", video: "🎥 Video", chat: "💬 Chat" };
const roleTitle = (role) => (role ? roleLabel(role) : "Member");

// The first real place a user can see or change what Kuzana Connect has on file
// for them - also where they see their own connections/rank (StatsCard)
// and manage their social profile (SocialProfileSection).
export default function ProfileView({ profile, onProfileUpdated, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);

  const startEdit = () => {
    setForm({
      full_name: profile?.name || "",
      phone_number: profile?.phone_number || "",
      role: profile?.role || ROLES[0],
      industry: profile?.industry || INDUSTRIES[0],
      company: profile?.company || "",
      location: profile?.location || "",
      bio: profile?.bio || "",
      contact_preference: profile?.contact_preference || "call",
    });
    setError("");
    setEditing(true);
  };

  const save = () => {
    setSaving(true);
    setError("");
    apiFetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEditing(false);
          onProfileUpdated?.();
        }
      })
      .catch(() => setError("Couldn't reach the server. Please try again."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="profile-view">
      <div className="profile-view-hero">
        <div className="profile-view-avatar">{initials(profile?.name)}</div>
        <div>
          <h2>{profile?.name || "Your profile"}</h2>
          <span className="role">{roleTitle(profile?.role)}</span>
        </div>
      </div>

      {error && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>}

      <div className="profile-view-grid">
        <div className="profile-view-col">
          <StatsCard profile={profile} />

          <div className="panel">
            <p className="panel-label">Account details</p>
            {editing ? (
              <>
                <div className="profile-view-row">
                  <span className="k">Full name</span>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="profile-view-row">
                  <span className="k">Phone number</span>
                  <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                </div>
                <div className="profile-view-row">
                  <span className="k">Role</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    style={{ background: "var(--ink)", border: "1px solid var(--ink-line-strong)", borderRadius: "5px", padding: "0.45rem 0.65rem", color: "var(--paper)" }}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{roleTitle(role)}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-view-row">
                  <span className="k">Industry</span>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    style={{ background: "var(--ink)", border: "1px solid var(--ink-line-strong)", borderRadius: "5px", padding: "0.45rem 0.65rem", color: "var(--paper)" }}
                  >
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-view-row">
                  <span className="k">Company</span>
                  <input
                    value={form.company}
                    placeholder="Company or business name"
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
                <div className="profile-view-row">
                  <span className="k">Location</span>
                  <input
                    value={form.location}
                    placeholder="City, country"
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="profile-view-row">
                  <span className="k">Bio</span>
                  <textarea
                    value={form.bio}
                    placeholder="A short introduction - who you are, beyond your offer/need."
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    style={{ background: "var(--ink)", border: "1px solid var(--ink-line-strong)", borderRadius: "5px", padding: "0.5rem 0.65rem", color: "var(--paper)", fontFamily: "inherit", resize: "vertical" }}
                  />
                </div>
                <div className="profile-view-row">
                  <span className="k">Contact preference</span>
                  <select
                    value={form.contact_preference}
                    onChange={(e) => setForm({ ...form, contact_preference: e.target.value })}
                    style={{ background: "var(--ink)", border: "1px solid var(--ink-line-strong)", borderRadius: "5px", padding: "0.45rem 0.65rem", color: "var(--paper)" }}
                  >
                    {CONTACT_MODES.map((mode) => (
                      <option key={mode} value={mode}>{CONTACT_LABEL[mode]}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.1rem" }}>
                  <button onClick={() => setEditing(false)} disabled={saving} className="btn-ghost">Cancel</button>
                  <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save changes"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="profile-view-row"><span className="k">Full name</span><span className="v">{profile?.name || "—"}</span></div>
                <div className="profile-view-row"><span className="k">Email</span><span className="v">{profile?.email || "—"}</span></div>
                <div className="profile-view-row"><span className="k">Phone number</span><span className="v">{profile?.phone_number || "—"}</span></div>
                <div className="profile-view-row"><span className="k">Role</span><span className="v">{roleTitle(profile?.role)}</span></div>
                <div className="profile-view-row"><span className="k">Industry</span><span className="v">{profile?.industry || "—"}</span></div>
                <div className="profile-view-row"><span className="k">Company</span><span className="v">{profile?.company || "—"}</span></div>
                <div className="profile-view-row"><span className="k">Location</span><span className="v">{profile?.location || "—"}</span></div>
                <div className="profile-view-row"><span className="k">Bio</span><span className="v">{profile?.bio || "—"}</span></div>
                <div className="profile-view-row">
                  <span className="k">Contact preference</span>
                  <span className="v">{CONTACT_LABEL[profile?.contact_preference] || CONTACT_LABEL.call}</span>
                </div>
                <button onClick={startEdit} className="btn-ghost" style={{ marginTop: "1.1rem" }}>Edit profile</button>
              </>
            )}
          </div>

          <div className="profile-view-row" style={{ background: "var(--ink-raised)", border: "1px solid var(--ink-line)", borderRadius: "6px", padding: "0.9rem 1.1rem" }}>
            <span className="k">Appearance</span>
            <ThemeToggle />
          </div>

          <button onClick={onLogout} className="btn-ghost btn-sm profile-view-disconnect">
            Log out
          </button>
        </div>

        <div className="profile-view-col">
          <div className="panel">
            <p className="panel-label">Your offer</p>
            <span className="profile-view-source">From your voice interview</span>
            <div className="profile-view-copy">{profile?.offer_text || "Complete your voice interview from Home to fill this in."}</div>
          </div>

          <div className="panel">
            <p className="panel-label">Your need</p>
            <span className="profile-view-source">From your voice interview</span>
            <div className="profile-view-copy">{profile?.need_text || "Complete your voice interview from Home to fill this in."}</div>
          </div>

          <div className="panel">
            <SocialProfileSection profile={profile} />
          </div>

          {(isCapitalSideRole(profile?.role) || profile?.looking_for_tags?.includes("funding")) && (
            <InvestmentDetailsForm profile={profile} />
          )}

          <BiziSection profile={profile} />
        </div>
      </div>
    </div>
  );
}
