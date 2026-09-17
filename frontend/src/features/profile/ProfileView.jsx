import { useState, useRef } from "react";
import { apiFetch } from "../../lib/api";
import SocialProfileSection from "./SocialProfileSection";
import ProfilePhotos from "./ProfilePhotos";
import Avatar from "../../components/Avatar";
import PhotoPreviewModal from "../../components/PhotoPreviewModal";
import "./Profile.css";
// .setup-field et al - previously only reached this page because
// ProfileSetup.jsx happens to import the same file elsewhere in the
// bundle, an implicit coupling that would silently break if that import
// were ever removed or route-based code-splitting were introduced.
// This page uses those classes directly now (the edit-mode form below),
// so it imports its own dependency instead of relying on that coincidence.
import "../../styles/SharedFormFields.css";
import StatsCard from "./StatsCard";
import InvestmentDetailsForm from "./InvestmentDetailsForm";
import ServiceDetailsForm from "./ServiceDetailsForm";
import CardPreviewModal from "./CardPreviewModal";
import ProfileCompletion from "./ProfileCompletion";
import ThemeToggle from "../shell/ThemeToggle";
import { INDUSTRIES } from "../../constants/industries";
import { ROLES, roleTitle as roleLabel, isCapitalSideRole, isServiceRole } from "../../constants/roles";

const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const CONTACT_MODES = ["call", "video", "chat"];
// Plain text, not emoji - a <select><option> can't render an SVG icon,
// and every other field in this same list (name, phone, role...) is
// plain text too, so an icon here alone would be inconsistent.
const CONTACT_LABEL = { call: "Call", video: "Video call", chat: "Chat" };
const roleTitle = (role) => (role ? roleLabel(role) : "Member");

// Real SVG, not the plain "✎"/"···" text characters this screen used to
// render directly - the one remaining spot on this page still doing
// that, unlike every other icon-led affordance in the app.
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="setup-field-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// The first real place a user can see or change what Kuzana Connect has on file
// for them - also where they see their own connections/rank (StatsCard)
// and manage their social profile (SocialProfileSection).
export default function ProfileView({ profile, onProfileUpdated, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [previewingCard, setPreviewingCard] = useState(false);
  const avatarInputRef = useRef(null);

  const uploadAvatar = (file) => {
    setAvatarError("");
    setUploadingAvatar(true);
    const body = new FormData();
    body.append("file", file);

    apiFetch("/api/profiles/avatar", { method: "POST", body })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) setAvatarError(data.error || "Couldn't upload photo.");
        else onProfileUpdated?.();
      })
      .catch(() => setAvatarError("Couldn't reach the server. Please try again."))
      .finally(() => {
        setUploadingAvatar(false);
        setPendingAvatarFile(null);
      });
  };

  const removeAvatar = () => {
    setAvatarError("");
    setUploadingAvatar(true);
    apiFetch("/api/profiles/avatar", { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error();
        onProfileUpdated?.();
      })
      .catch(() => setAvatarError("Couldn't remove photo. Please try again."))
      .finally(() => setUploadingAvatar(false));
  };

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
        <div className="profile-view-hero-top">
          <div className="profile-view-avatar-ring">
            <div className="profile-view-avatar-ring-inner">
              <Avatar avatarUrl={profile?.avatar_url} name={profile?.name} className="profile-view-avatar" />
            </div>
            <button
              className="profile-view-avatar-edit"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              title={profile?.avatar_url ? "Change photo" : "Add a photo"}
              aria-label={profile?.avatar_url ? "Change photo" : "Add a photo"}
            >
              {uploadingAvatar ? <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }}></span> : <PencilIcon />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPendingAvatarFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <PhotoPreviewModal
            file={pendingAvatarFile}
            shape="circle"
            confirming={uploadingAvatar}
            onConfirm={uploadAvatar}
            onCancel={() => setPendingAvatarFile(null)}
          />

          <div className="profile-view-hero-info">
            <h2>
              {profile?.name || "Your profile"}
              {profile?.verified && (
                <span className="verified-badge" title="Verified: photo, interview, and phone confirmed">✓</span>
              )}
            </h2>
            <div className="profile-view-hero-badges">
              <span className="role">{roleTitle(profile?.role)}</span>
              {profile?.is_bizi && (
                <span className="chip selected profile-view-bizi-chip" title="Approved into the Kuzana Bizi accelerator">
                  Verified Bizi
                </span>
              )}
              {profile?.avatar_url && (
                <button onClick={removeAvatar} disabled={uploadingAvatar} className="nav-link profile-view-remove-photo">
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {!editing && (
            <div className="profile-view-hero-actions">
              <button onClick={() => setPreviewingCard(true)} className="btn-ghost btn-sm">
                <EyeIcon /> Preview card
              </button>
              <button onClick={startEdit} className="btn-primary btn-sm">
                <PencilIcon /> Edit profile
              </button>
            </div>
          )}
        </div>
      </div>

      {avatarError && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{avatarError}</p>}

      {error && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>}

      <div className="profile-view-grid">
        <div className="profile-view-col">
          {!profile?.verified && <ProfileCompletion completion={profile?.profile_completion} />}

          <StatsCard profile={profile} />

          <div className="panel">
            <p className="panel-label">Account details</p>
            {editing ? (
              <>
                <div className="profile-edit-fields">
                  <label className="setup-field">
                    <span className="setup-field-label">Full name</span>
                    <div className="setup-field-control">
                      <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Phone number</span>
                    <div className="setup-field-control">
                      <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Role</span>
                    <div className="setup-field-control">
                      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{roleTitle(role)}</option>
                        ))}
                      </select>
                      <ChevronDownIcon />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Industry</span>
                    <div className="setup-field-control">
                      <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                        {INDUSTRIES.map((industry) => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                      <ChevronDownIcon />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Company</span>
                    <div className="setup-field-control">
                      <input
                        value={form.company}
                        placeholder="Company or business name"
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                      />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Location</span>
                    <div className="setup-field-control">
                      <input
                        value={form.location}
                        placeholder="City, country"
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Bio</span>
                    <div className="setup-field-control">
                      <textarea
                        value={form.bio}
                        placeholder="A short introduction - who you are, beyond your offer/need."
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </label>
                  <label className="setup-field">
                    <span className="setup-field-label">Contact preference</span>
                    <div className="setup-field-control">
                      <select value={form.contact_preference} onChange={(e) => setForm({ ...form, contact_preference: e.target.value })}>
                        {CONTACT_MODES.map((mode) => (
                          <option key={mode} value={mode}>{CONTACT_LABEL[mode]}</option>
                        ))}
                      </select>
                      <ChevronDownIcon />
                    </div>
                  </label>
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
              </>
            )}
          </div>

          <div className="panel profile-view-prefs">
            <p className="panel-label">Preferences</p>
            <div className="profile-view-pref-row">
              <span className="k">Appearance</span>
              <ThemeToggle />
            </div>
            <button onClick={onLogout} className="profile-view-pref-row profile-view-pref-btn profile-view-logout">
              <span className="profile-view-pref-icon"><LogOutIcon /></span>
              <span>Log out</span>
            </button>
          </div>
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

          {/* Investors/lenders have no product to show - the "show your
              work" prompt (profile.md §4.1) only makes sense for members
              who actually have a product/workspace/team to photograph. */}
          {!isCapitalSideRole(profile?.role) && (
            <ProfilePhotos profile={profile} onProfileUpdated={onProfileUpdated} />
          )}

          <div className="panel">
            <SocialProfileSection profile={profile} />
          </div>

          {(isCapitalSideRole(profile?.role) || profile?.looking_for_tags?.includes("funding")) && (
            <InvestmentDetailsForm profile={profile} />
          )}

          {isServiceRole(profile?.role) && <ServiceDetailsForm profile={profile} />}
        </div>
      </div>

      {previewingCard && <CardPreviewModal onClose={() => setPreviewingCard(false)} />}
    </div>
  );
}
