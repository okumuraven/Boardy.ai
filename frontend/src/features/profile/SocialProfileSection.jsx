import { useState, useEffect } from "react";

const FIELDS = [
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/you" },
  { key: "x_url", label: "X / Twitter", placeholder: "https://x.com/you" },
  { key: "portfolio_url", label: "Portfolio", placeholder: "https://you.dev" },
];

// Lives on the user's own Profile page - GitHub is OAuth-verified (real
// account ownership, no scope requested beyond public profile read);
// LinkedIn/X/portfolio are trust-on-submit links validated server-side.
// Nothing here is shown to a matched user yet - see social_media.md for
// why that reveal is deliberately gated behind a later step, not this one.
export default function SocialProfileSection({ profile }) {
  const [social, setSocial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [fieldValue, setFieldValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [connecting, setConnecting] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;
  const userId = profile?.id;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github_connected") === "1") setBanner("GitHub connected.");
    if (params.get("github_connect_error") === "1") setBanner("Couldn't connect GitHub - please try again.");
    if (params.has("github_connected") || params.has("github_connect_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`${apiUrl}/api/profiles/${userId}/social`)
      .then((res) => res.json())
      .then(setSocial)
      .catch(() => setError("Couldn't load your social profile."))
      .finally(() => setLoading(false));
  }, [userId, apiUrl]);

  const connectGithub = () => {
    setConnecting(true);
    fetch(`${apiUrl}/api/profiles/${userId}/social/github/connect_url`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connect_url) window.location.href = data.connect_url;
        else setError("Couldn't start GitHub connection.");
      })
      .catch(() => setError("Couldn't start GitHub connection."))
      .finally(() => setConnecting(false));
  };

  const disconnectGithub = () => {
    fetch(`${apiUrl}/api/profiles/${userId}/social/github`, { method: "DELETE" })
      .then((res) => res.json())
      .then(setSocial)
      .catch(() => setError("Couldn't disconnect GitHub."));
  };

  const startEditField = (key) => {
    setEditingField(key);
    setFieldValue(social?.[key] || "");
    setError("");
  };

  const saveField = (key) => {
    setSaving(true);
    setError("");
    fetch(`${apiUrl}/api/profiles/${userId}/social/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: fieldValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setSocial(data);
          setEditingField(null);
        }
      })
      .catch(() => setError("Couldn't save that - try again."))
      .finally(() => setSaving(false));
  };

  if (loading) return null;

  const summary = social?.github_summary;

  return (
    <>
      <p className="panel-label">Social &amp; verification</p>
      {banner && <p style={{ fontSize: "0.82rem", color: "var(--signal)", margin: "0 0 0.5rem" }}>{banner}</p>}
      {error && <p style={{ fontSize: "0.82rem", color: "var(--warn)", margin: "0 0 0.5rem" }}>{error}</p>}

      <div className="profile-view-row">
        <span className="k">GitHub</span>
        {social?.github_username ? (
          <span className="v" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span>@{social.github_username}</span>
            {summary && (
              <span className="social-chip">
                {summary.account_age_years}+ yrs · {summary.public_repos} repos
                {summary.top_languages?.length > 0 && ` · ${summary.top_languages.join(", ")}`}
              </span>
            )}
            <button onClick={disconnectGithub} className="btn-ghost btn-sm">Disconnect</button>
          </span>
        ) : (
          <button onClick={connectGithub} disabled={connecting} className="btn-ghost btn-sm">
            {connecting ? "Opening GitHub..." : "Connect GitHub"}
          </button>
        )}
      </div>

      {FIELDS.map(({ key, label, placeholder }) => (
        <div className="profile-view-row" key={key}>
          <span className="k">{label}</span>
          {editingField === key ? (
            <span className="v" style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
              <input
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                placeholder={placeholder}
                style={{ flex: 1 }}
                autoFocus
              />
              <button onClick={() => setEditingField(null)} disabled={saving} className="btn-ghost btn-sm">Cancel</button>
              <button onClick={() => saveField(key)} disabled={saving} className="btn-primary btn-sm">
                {saving ? "..." : "Save"}
              </button>
            </span>
          ) : (
            <span className="v" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {social?.[key] ? (
                <a href={social[key]} target="_blank" rel="noreferrer" style={{ color: "var(--brass)" }}>
                  {social[key]}
                </a>
              ) : (
                <span style={{ color: "var(--muted)" }}>Not added</span>
              )}
              <button onClick={() => startEditField(key)} className="btn-ghost btn-sm">
                {social?.[key] ? "Edit" : "Add"}
              </button>
            </span>
          )}
        </div>
      ))}
    </>
  );
}
