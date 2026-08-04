import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import MemberCard from "./MemberCard";
import "./Directory.css";
import { INDUSTRIES } from "../../constants/industries";
import { CONNECTION_TAGS, tagLabel } from "../../constants/connectionTags";
import { FUNDING_TYPES, fundingTypeLabel } from "../../constants/fundingTypes";
import { ROLES, roleTitle } from "../../constants/roles";

// Search-as-you-type is debounced so we're not firing a request per
// keystroke - 350ms is long enough to skip mid-word requests, short
// enough to still feel instant once someone pauses.
const SEARCH_DEBOUNCE_MS = 350;

// The browsable, searchable/filterable member list (Phase 4,
// kuzana_connect_discovery.md) - independent of the AI-suggested match
// queue in Matches. "Connect" here runs through the exact same
// mutual-consent pipeline as a suggested match; nobody's contact info is
// ever shown directly, and reaching out always requires both sides to
// agree - see ROADMAP.md's "Directory Contact Model" note.
export default function DirectoryView({ profile, onMatchCreated }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [role, setRole] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [canHelp, setCanHelp] = useState("");
  const [fundingType, setFundingType] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [connectErrors, setConnectErrors] = useState({});

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchPage = useCallback(
    (targetPage) => {
      if (!profile?.id) return Promise.resolve();

      const params = new URLSearchParams({ page: targetPage });
      if (search) params.set("search", search);
      if (industry) params.set("industry", industry);
      if (role) params.set("role", role);
      if (lookingFor) params.set("looking_for", lookingFor);
      if (canHelp) params.set("can_help", canHelp);
      if (fundingType) params.set("funding_type", fundingType);

      return apiFetch(`/api/directory?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setMembers((prev) => (targetPage === 1 ? data.members || [] : [...prev, ...(data.members || [])]));
          setPage(data.page || 1);
          setTotalPages(data.total_pages || 1);
          setTotalCount(data.total_count || 0);
        })
        .catch(() => {});
    },
    [profile?.id, search, industry, role, lookingFor, canHelp, fundingType]
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(1).finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchPage(page + 1).finally(() => setLoadingMore(false));
  };

  const handleConnect = (targetUserId) => {
    setConnectingId(targetUserId);
    setConnectErrors((prev) => ({ ...prev, [targetUserId]: null }));

    apiFetch(`/api/directory/connect`, {
      method: "POST",
      body: JSON.stringify({ target_user_id: targetUserId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't send that connection request.");
        return data;
      })
      .then((data) => {
        const matchStatus = data.match_status || "pending_consent";
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === targetUserId
              ? { ...m, match: { match_id: data.match_id, status: matchStatus, my_response: "accepted" } }
              : m
          )
        );
        onMatchCreated?.();
      })
      .catch((err) => setConnectErrors((prev) => ({ ...prev, [targetUserId]: err.message })))
      .finally(() => setConnectingId(null));
  };

  const chip = (active, label, onClick) => (
    <button key={label} className={`chip ${active ? "selected" : ""}`} onClick={onClick} type="button">
      {label}
    </button>
  );

  return (
    <div className="directory-view">
      <header className="directory-header">
        <h2>Directory</h2>
        <span className="count">{totalCount} member{totalCount === 1 ? "" : "s"}</span>
      </header>

      <div className="field directory-search">
        <input
          type="text"
          className="premium-input"
          placeholder="Search by name or what they offer..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="directory-chip-row">
        {chip(role === "", "All roles", () => setRole(""))}
        {ROLES.map((r) => chip(role === r, roleTitle(r), () => setRole(r)))}
      </div>

      <div className="directory-chip-row">
        {chip(industry === "", "All industries", () => setIndustry(""))}
        {INDUSTRIES.map((i) => chip(industry === i, i, () => setIndustry(i)))}
      </div>

      <button
        type="button"
        className="directory-more-filters-toggle"
        onClick={() => setShowMoreFilters((prev) => !prev)}
      >
        {showMoreFilters ? "Hide" : "More filters"} {lookingFor || canHelp ? "•" : ""}
      </button>

      {showMoreFilters && (
        <>
          <div className="directory-filter-label">Looking for</div>
          <div className="directory-chip-row">
            {chip(lookingFor === "", "Any", () => setLookingFor(""))}
            {CONNECTION_TAGS.map((tag) => chip(lookingFor === tag, tagLabel(tag), () => setLookingFor(tag)))}
          </div>

          <div className="directory-filter-label">Can help with</div>
          <div className="directory-chip-row">
            {chip(canHelp === "", "Any", () => setCanHelp(""))}
            {CONNECTION_TAGS.map((tag) => chip(canHelp === tag, tagLabel(tag), () => setCanHelp(tag)))}
          </div>

          <div className="directory-filter-label">Funding type</div>
          <div className="directory-chip-row">
            {chip(fundingType === "", "Any", () => setFundingType(""))}
            {FUNDING_TYPES.map((t) => chip(fundingType === t, fundingTypeLabel(t), () => setFundingType(t)))}
          </div>
        </>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
          <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto" }}></div>
        </div>
      ) : members.length === 0 ? (
        <p style={{ padding: "2rem 0", color: "var(--muted)", fontSize: "0.9rem", textAlign: "center" }}>
          No members match those filters yet.
        </p>
      ) : (
        <>
          <div className="directory-grid">
            {members.map((member) => (
              <MemberCard
                key={member.user_id}
                member={member}
                connecting={connectingId === member.user_id}
                connectError={connectErrors[member.user_id]}
                onConnect={() => handleConnect(member.user_id)}
              />
            ))}
          </div>

          {page < totalPages && (
            <div style={{ textAlign: "center", margin: "1.5rem 0" }}>
              <button className="btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
