import { useState, useEffect, useCallback } from "react";
import ChatRoomView from "../../components/ChatSystem";
import MatchReview from "../../components/MatchReview";
import StakingGate from "../../components/StakingGate";
import MatchesList from "./MatchesList";

// The Matches tab: a list of every match this user is in (not just the
// single "next thing to resolve" one), and a stage that renders whichever
// screen that match's status calls for - chat, mutual-consent review, or
// the staking gate - instead of those being separate full-screen states.
export default function MatchesView({ profile, openRequest, onConsumeOpenRequest }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [startInScheduling, setStartInScheduling] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchList = useCallback(() => {
    if (!profile?.id) return Promise.resolve();
    return fetch(`${apiUrl}/api/matches?user_id=${profile.id}`)
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => {});
  }, [apiUrl, profile?.id]);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const fetchDetail = useCallback(
    (matchId) => {
      if (!profile?.id) return Promise.resolve(null);
      return fetch(`${apiUrl}/api/matches/${matchId}/status?user_id=${profile.id}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedDetail(data);
          return data;
        })
        .catch(() => null);
    },
    [apiUrl, profile?.id]
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

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedDetail(null);
    setStartInScheduling(false);
  };

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
            {selectedDetail.status === "pending_consent" ? (
              <MatchReview profile={profile} initialMatch={selectedDetail} onResolved={handleResolved} />
            ) : (
              <StakingGate profile={profile} match={selectedDetail} onResolved={handleResolved} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
