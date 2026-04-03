import { useState, useEffect, useCallback } from "react";
import {
  getRoom,
  joinRoom,
  saveRoom,
  subscribeToRoom,
} from "../roomStore";
import "../styles/room.css";

const CARD_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

export default function RoomPage({ roomId }) {
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // On mount: load room and identify self
  useEffect(() => {
    const stored = sessionStorage.getItem(`pp_me_${roomId}`);
    getRoom(roomId).then((loaded) => {
      if (!loaded) {
        setNotFound(true);
        setInitializing(false);
        return;
      }
      setRoom(loaded);
      if (stored) {
        const member = loaded.members.find((m) => m.id === stored);
        if (member) {
          setMyId(stored);
        } else {
          sessionStorage.removeItem(`pp_me_${roomId}`);
        }
      }
      setInitializing(false);
    });
  }, [roomId]);

  // Subscribe to live updates
  useEffect(() => {
    const unsub = subscribeToRoom(roomId, (updated) => {
      setRoom(updated);
    });
    return unsub;
  }, [roomId]);

  const me = room?.members.find((m) => m.id === myId);

  const castVote = useCallback(
    async (value) => {
      if (!room || !myId) return;
      const updated = { ...room, members: [...room.members] };
      const idx = updated.members.findIndex((m) => m.id === myId);
      if (idx === -1) return;
      updated.members[idx] = {
        ...updated.members[idx],
        vote: updated.members[idx].vote === value ? null : value,
      };
      await saveRoom(roomId, updated);
    },
    [room, myId, roomId]
  );

  const revealVotes = async () => {
    if (!room) return;
    await saveRoom(roomId, { ...room, phase: "revealed" });
  };

  const resetVotes = async () => {
    if (!room) return;
    await saveRoom(roomId, {
      ...room,
      phase: "voting",
      members: room.members.map((m) => ({ ...m, vote: null })),
    });
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // If myId is not set yet, show "name required to enter" panel
  if (initializing) return null;
  if (room && !myId) {
    return (
      <JoinPanel
        roomId={roomId}
        onJoined={(id) => {
          setMyId(id);
          getRoom(roomId).then(setRoom);
        }}
      />
    );
  }

  if (notFound) {
    return (
      <div className="room-error">
        <div className="room-error__box">
          <span className="room-error__icon">♠</span>
          <h2>Room not found</h2>
          <p>The room <strong>{roomId}</strong> doesn't exist or has expired.</p>
          <a href="/" className="room-error__btn">
            Back to Lobby
          </a>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-loading">
        <span className="room-loading__suit">♠</span>
        <p>Loading room…</p>
      </div>
    );
  }

  const allVoted = room.members.every((m) => m.vote !== null);
  const isRevealed = room.phase === "revealed";
  const isHost = me?.isHost;
  const myVote = me?.vote ?? null;

  // Compute average for revealed phase (numeric votes only)
  const numericVotes = isRevealed
    ? room.members
        .map((m) => parseFloat(m.vote))
        .filter((v) => !isNaN(v))
    : [];
  const average =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(
          1
        )
      : null;

  return (
    <div className="room">
      {/* Header */}
      <header className="room__header">
        <div className="room__logo">
          <span>♠</span> Planning Poker
        </div>
        <div className="room__room-info">
          <span className="room__room-label">Room</span>
          <span className="room__room-id">{roomId}</span>
          <button className="room__copy-btn" onClick={copyLink}>
            {copied ? "✓ Copied!" : "Copy Invite Link"}
          </button>
        </div>
      </header>

      <div className="room__body">
        {/* Members */}
        <aside className="room__sidebar">
          <h3 className="room__sidebar-title">
            Players <span className="room__count">{room.members.length}</span>
          </h3>
          <ul className="room__members">
            {room.members.map((member) => (
              <li
                key={member.id}
                className={`room__member ${member.id === myId ? "room__member--me" : ""}`}
              >
                <div className="room__member-avatar">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="room__member-info">
                  <span className="room__member-name">
                    {member.name}
                    {member.isHost && (
                      <span className="room__host-badge">host</span>
                    )}
                    {member.id === myId && (
                      <span className="room__you-badge">you</span>
                    )}
                  </span>
                  <span className="room__member-status">
                    {isRevealed
                      ? member.vote
                        ? `Voted: ${member.vote}`
                        : "No vote"
                      : member.vote !== null
                      ? "✓ Voted"
                      : "Waiting…"}
                  </span>
                </div>
                {!isRevealed && (
                  <div
                    className={`room__vote-indicator ${member.vote !== null ? "room__vote-indicator--voted" : ""}`}
                  />
                )}
                {isRevealed && member.vote && (
                  <div className="room__vote-chip">{member.vote}</div>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main area */}
        <main className="room__main">
          {/* Result banner */}
          {isRevealed && (
            <div className="room__result">
              <div className="room__result-inner">
                {average && (
                  <>
                    <span className="room__result-label">Average</span>
                    <span className="room__result-value">{average}</span>
                  </>
                )}
                <div className="room__result-votes">
                  {room.members.map((m) => (
                    <div key={m.id} className="room__result-vote">
                      <span className="room__result-vote-val">
                        {m.vote ?? "—"}
                      </span>
                      <span className="room__result-vote-name">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cards */}
          {!isRevealed && (
            <div className="room__cards-section">
              <p className="room__cards-prompt">
                {me ? `Pick your estimate, ${me.name}` : "Pick your estimate"}
              </p>
              <div className="room__cards">
                {CARD_VALUES.map((val) => (
                  <button
                    key={val}
                    className={`pcard ${myVote === val ? "pcard--selected" : ""}`}
                    onClick={() => castVote(val)}
                  >
                    <span className="pcard__suit">♠</span>
                    <span className="pcard__value">{val}</span>
                    <span className="pcard__suit pcard__suit--bottom">♠</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="room__controls">
            {!isRevealed ? (
              <button
                className={`room__action-btn ${allVoted ? "room__action-btn--ready" : ""}`}
                onClick={revealVotes}
                disabled={!isHost && !allVoted}
                title={
                  !isHost && !allVoted
                    ? "Waiting for all players to vote"
                    : "Reveal all votes"
                }
              >
                {allVoted ? "🎴 Reveal Cards" : `Waiting for votes… (${room.members.filter((m) => m.vote !== null).length}/${room.members.length})`}
              </button>
            ) : (
              <button
                className="room__action-btn room__action-btn--reset"
                onClick={resetVotes}
              >
                ↺ New Round
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Panel shown when visiting a room URL without a name
function JoinPanel({ roomId, onJoined }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const result = await joinRoom(roomId, name.trim());
    if (!result) {
      setError("Room not found or could not join.");
      return;
    }
    sessionStorage.setItem(`pp_me_${roomId}`, result.memberId);
    onJoined(result.memberId);
  };

  return (
    <div className="join-panel">
      <div className="join-panel__card">
        <div className="join-panel__suits">♠ ♥ ♦ ♣</div>
        <h2 className="join-panel__title">Join Room</h2>
        <p className="join-panel__sub">
          You're joining <strong>{roomId}</strong>
        </p>
        <input
          className="join-panel__input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          maxLength={32}
          autoFocus
        />
        {error && <p className="join-panel__error">{error}</p>}
        <button className="join-panel__btn" onClick={handleJoin}>
          Take a Seat
        </button>
      </div>
    </div>
  );
}