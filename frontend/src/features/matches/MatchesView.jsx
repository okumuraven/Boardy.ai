import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import ChatRoomView from "../../components/ChatSystem";
import "./Matches.css";
import MatchReview from "../../components/MatchReview";
import MatchesList from "./MatchesList";

// The Matches tab: a list of every match this user is in (not just the
// single "next thing to resolve" one), and a stage that renders whichever
// screen that match's status calls for - chat, or the mutual-consent
// review - instead of those being separate full-screen states. Mutual
// consent unlocks a match immediately now (no on-chain staking step in
// between - removed per direct Kuzana feedback, see boardy_comparison.md),
// so the only two statuses ever reaching this component are
// "pending_consent" and "unlocked".
export default function MatchesView({ profile, openRequest, onConsumeOpenRequest, refreshKey, onChatOpenChange }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [startInScheduling, setStartInScheduling] = useState(false);

  // Lets AppShell hide the mobile tab bar while a conversation is open,
  // the same way WhatsApp/Telegram give the whole screen to a chat
  // instead of keeping the app's main nav visible underneath it.
  useEffect(() => {
    onChatOpenChange?.(!!selectedId);
  }, [selectedId]);

  const fetchList = useCallback(() => {
    if (!profile?.id) return Promise.resolve();
    return apiFetch(`/api/matches`)
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => {});
  }, [profile?.id]);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList, refreshKey]);

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedDetail(null);
    setStartInScheduling(false);
  };

  const fetchDetail = useCallback(
    (matchId) => {
      if (!profile?.id) return Promise.resolve(null);
      return apiFetch(`/api/matches/${matchId}/status`)
        .then(async (res) => {
          if (!res.ok) {
            // The match no longer exists (or errored) - never render an
            // error body as if it were match data (that's what produced
            // "Someone · unspecified role" / "NaN% match"). Fall back to
            // the empty state instead of a broken card.
            clearSelection();
            return null;
          }
          const data = await res.json();
          setSelectedDetail(data);
          return data;
        })
        .catch(() => {
          clearSelection();
          return null;
        });
    },
    [profile?.id]
  );

  const selectMatch = (matchId, options = {}) => {
    setSelectedId(matchId);
    setStartInScheduling(!!options.openScheduling);
    fetchDetail(matchId);
  };

  useEffect(() => {
    if (openRequest?.matchId) {
      selectMatch(openRequest.matchId, { openScheduling: openRequest.openScheduling });
      onConsumeOpenRequest?.();
    }
  }, [openRequest]);

  const handleResolved = (result) => {
    if (result.declined) {
      clearSelection();
    } else {
      fetchDetail(selectedId);
    }
    fetchList();
  };

  return (
    <div className="matches-view">
      <MatchesList
        matches={matches}
        loading={loading}
        selectedId={selectedId}
        onSelect={(id) => selectMatch(id)}
        hideOnMobile={!!selectedId}
      />

      <div className={`match-stage ${!selectedId ? "hide-on-mobile-unselected" : ""}`}>
        {!selectedDetail ? (
          <div className="match-empty">Pick a match to see the conversation.</div>
        ) : selectedDetail.status === "unlocked" ? (
          <ChatRoomView
            roomId={selectedDetail.chat_room_id}
            matchId={selectedDetail.match_id}
            pairingKind={selectedDetail.pairing_kind}
            profile={profile}
            partnerName={selectedDetail.other_user?.name}
            startInScheduling={startInScheduling}
            onBack={clearSelection}
          />
        ) : (
          <>
            <button
              onClick={clearSelection}
              className="btn-ghost"
              style={{ margin: "0.75rem 0.75rem 0", alignSelf: "flex-start", padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              ← Back to matches
            </button>
            <MatchReview
              key={selectedDetail.match_id}
              profile={profile}
              initialMatch={selectedDetail}
              onResolved={handleResolved}
            />
          </>
        )}
      </div>
    </div>
  );
}
