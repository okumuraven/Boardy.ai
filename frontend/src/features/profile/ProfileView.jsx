import { useState } from "react";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const CONTACT_MODES = ["call", "video", "chat"];
const CONTACT_LABEL = { call: "📞 Call", video: "🎥 Video", chat: "💬 Chat" };

// Doesn't exist anywhere else in the app today - the first real place a
// user can see or change what Vokazi has on file for them.
export default function ProfileView({ profile, onProfileUpdated }) {
  const activeAccount = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const startEdit = () => {
    setForm({
      full_name: profile?.name || "",
      phone_number: profile?.phone_number || "",
      role: profile?.role || "",
      contact_preference: profile?.contact_preference || "call",
    });
    setError("");
    setEditing(true);
  };

  const save = () => {
    setSaving(true);
    setError("");
    fetch(`${apiUrl}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: activeAccount?.address, ...form }),
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
      <div className="profile-view-head">
        <div className="profile-view-avatar">{initials(profile?.name)}</div>
        <div>
          <h2>{profile?.name || "Your profile"}</h2>
          <span className="role">{profile?.role || "Member"}</span>
        </div>
      </div>

      {error && <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>}

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
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
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
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button onClick={() => setEditing(false)} disabled={saving} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save changes"}</button>
          </div>
        </>
      ) : (
        <>
          <div className="profile-view-row"><span className="k">Full name</span><span className="v">{profile?.name || "—"}</span></div>
          <div className="profile-view-row"><span className="k">Phone number</span><span className="v">{profile?.phone_number || "—"}</span></div>
          <div className="profile-view-row"><span className="k">Role</span><span className="v">{profile?.role || "—"}</span></div>
          <div className="profile-view-row">
            <span className="k">Contact preference</span>
            <span className="v">{CONTACT_LABEL[profile?.contact_preference] || CONTACT_LABEL.call}</span>
          </div>
          <button onClick={startEdit} className="btn-ghost" style={{ marginTop: "0.9rem" }}>Edit profile</button>
        </>
      )}

      <p className="panel-label" style={{ marginTop: "1.75rem" }}>Your offer (from your voice interview)</p>
      <div className="profile-view-copy">{profile?.offer_text || "Complete your voice interview from Home to fill this in."}</div>

      <p className="panel-label" style={{ marginTop: "1.25rem" }}>Your need</p>
      <div className="profile-view-copy">{profile?.need_text || "Complete your voice interview from Home to fill this in."}</div>

      <p className="panel-label" style={{ marginTop: "1.25rem" }}>
        Social &amp; verification
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--ink-line)", color: "var(--muted)", padding: "0.1rem 0.4rem", borderRadius: "3px", marginLeft: "0.4rem" }}>
          Coming soon
        </span>
      </p>
      <div className="profile-view-row"><span className="k">GitHub</span><span className="v" style={{ color: "var(--muted)" }}>Not connected</span></div>
      <div className="profile-view-row"><span className="k">LinkedIn / Portfolio</span><span className="v" style={{ color: "var(--muted)" }}>Not added</span></div>

      <div style={{ marginTop: "2rem", borderTop: "1px solid var(--ink-line)", paddingTop: "1.25rem" }}>
        <button onClick={() => wallet && disconnect(wallet)} className="btn-ghost btn-sm">Disconnect wallet</button>
      </div>
    </div>
  );
}
