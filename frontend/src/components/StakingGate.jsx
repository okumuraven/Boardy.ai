import { useState, useEffect, useRef } from "react";
import { prepareContractCall, toWei } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { matchStakingContract, stakeAmountAvax } from "../config/thirdweb";

// The Avalanche Trust-Gate: shown once both sides have mutually accepted
// a match. Each person independently stakes real AVAX on Fuji via their
// own wallet before the chat unlocks - the backend never takes either
// side's word for it, it re-reads the stake straight off the contract.
export default function StakingGate({ profile, match, onResolved }) {
  const [current, setCurrent] = useState(match);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const apiUrl = import.meta.env.VITE_API_URL;
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const isWaiting = current.my_staked && !current.other_staked;

  useEffect(() => {
    if (!isWaiting) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/matches/${current.match_id}/status?user_id=${profile.id}`);
        const data = await res.json();
        if (data.status === "unlocked") {
          clearInterval(pollRef.current);
          onResolvedRef.current({ unlocked: true, chatRoomId: data.chat_room_id, otherUserName: current.other_user?.name });
        } else {
          setCurrent(data);
        }
      } catch (err) {
        console.error("StakingGate poll failed:", err);
      }
    }, 8000);

    return () => clearInterval(pollRef.current);
  }, [isWaiting, current.match_id, apiUrl, profile.id]);

  const confirmStake = (txHash) => {
    setConfirming(true);
    setError("");
    fetch(`${apiUrl}/api/matches/${current.match_id}/confirm-stake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.id, tx_hash: txHash }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "unlocked") {
          onResolvedRef.current({ unlocked: true, chatRoomId: data.chat_room_id, otherUserName: current.other_user?.name });
        } else if (data.status === "awaiting_other_stake") {
          setCurrent((m) => ({ ...m, my_staked: true }));
        } else {
          setError(data.error || "Couldn't confirm your stake yet - it may still be confirming on-chain.");
        }
      })
      .catch((err) => {
        console.error("StakingGate confirm-stake failed:", err);
        setError("Couldn't reach the server to confirm your stake. Please try again.");
      })
      .finally(() => setConfirming(false));
  };

  const handleStake = () => {
    setError("");

    if (!current.onchain_match_id) {
      setError("This match is still being registered on-chain - please wait a few seconds and try again.");
      return;
    }

    const transaction = prepareContractCall({
      contract: matchStakingContract,
      method: "function stake(bytes32 matchId) payable",
      params: [current.onchain_match_id],
      value: toWei(stakeAmountAvax),
    });

    sendTransaction(transaction, {
      onSuccess: (receipt) => confirmStake(receipt.transactionHash),
      onError: (err) => {
        console.error("StakingGate stake tx failed:", err);
        setError(err?.message || "The transaction was rejected or failed. Please try again.");
      },
    });
  };

  const busy = confirming || isPending;

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="identity-badge">
        Signed in as <strong style={{ color: "var(--paper)" }}>{profile?.name || "you"}</strong>
      </div>

      <main
        className="onboarding-container"
        style={{ justifyContent: "center", animation: "fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <h1 className="ai-greeting" style={{ fontSize: "2.4rem", marginBottom: "0.25rem" }}>
          Match Accepted
        </h1>
        <p className="ai-subtext" style={{ marginBottom: "1.5rem" }}>
          You and {current.other_user?.name || "the other person"} both said yes. Stake your commitment on
          Avalanche to unlock the chat.
        </p>

        <div style={{ width: "100%", maxWidth: "560px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="panel">
            <p className="panel-label">Commitment Stake</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="mono-value" style={{ fontSize: "0.95rem" }}>
                {stakeAmountAvax} AVAX (Fuji testnet)
              </span>
              <span style={{ color: current.my_staked ? "var(--signal)" : "var(--muted)", fontSize: "0.85rem" }}>
                {current.my_staked ? "You've staked" : "Not staked yet"}
              </span>
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--warn)", fontSize: "0.9rem", textAlign: "center", margin: 0 }}>{error}</p>
          )}

          {isWaiting ? (
            <div style={{ textAlign: "center", padding: "1rem", color: "var(--muted)" }}>
              <div className="spinner" style={{ width: "28px", height: "28px", margin: "0 auto 0.75rem" }}></div>
              You're staked. Waiting for {current.other_user?.name || "them"} to stake too.
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
              <button onClick={handleStake} disabled={busy} className="btn-primary" style={{ padding: "0.9rem 1.75rem" }}>
                {busy ? "Confirming..." : `Stake ${stakeAmountAvax} AVAX to unlock chat`}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
