import { useState, useEffect } from "react";
import {
  generateRoomId,
  createRoom,
  joinRoom,
  getRoom,
} from "../roomStore";
import "../styles/lobby.css";

export default function LobbyPage({ onRoomCreated, onJoinRoom }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  // Check if URL already has a room code (someone shared the link)
  const [incomingRoom, setIncomingRoom] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("room");
    if (id) {
      setIncomingRoom(id);
      setMode("join");
      setRoomCode(id);
    }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter your name first.");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const id = generateRoomId();
      const room = await createRoom(id, name.trim());
      const memberId = room.members[0].id;
      sessionStorage.setItem(`pp_me_${id}`, memberId);
      onRoomCreated(id);
    } catch (e) {
      setError("Failed to create room. Check your connection.");
      setJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError("Please enter a room code.");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const exists = await getRoom(code);
      if (!exists) {
        setError("Room not found. Check the code and try again.");
        setJoining(false);
        return;
      }
      const result = await joinRoom(code, name.trim());
      if (!result) {
        setError("Could not join room.");
        setJoining(false);
        return;
      }
      sessionStorage.setItem(`pp_me_${code}`, result.memberId);
      onJoinRoom(code);
    } catch (e) {
      setError("Failed to join room. Check your connection.");
      setJoining(false);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby__bg">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`lobby__card lobby__card--${i}`} />
        ))}
      </div>

      <div className="lobby__panel">
        <div className="lobby__logo">
          <span className="lobby__logo-suit">♠</span>
          <span className="lobby__logo-suit">♥</span>
          <span className="lobby__logo-text">Planning Poker</span>
          <span className="lobby__logo-suit">♦</span>
          <span className="lobby__logo-suit">♣</span>
        </div>

        {incomingRoom && (
          <div className="lobby__invite-banner">
            <span>🎴</span> You've been invited to room{" "}
            <strong>{incomingRoom}</strong>
          </div>
        )}

        <div className="lobby__field">
          <label className="lobby__label" htmlFor="name">
            Your Name
          </label>
          <input
            id="name"
            className="lobby__input"
            type="text"
            placeholder="e.g. Ada Lovelace"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (mode === "create") handleCreate();
                else if (mode === "join") handleJoin();
              }
            }}
            maxLength={32}
            autoFocus
          />
        </div>

        {!incomingRoom && !mode && (
          <div className="lobby__actions">
            <button
              className="lobby__btn lobby__btn--primary"
              onClick={() => setMode("create")}
            >
              <span className="lobby__btn-icon">♠</span> Create Room
            </button>
            <div className="lobby__divider">or</div>
            <button
              className="lobby__btn lobby__btn--secondary"
              onClick={() => setMode("join")}
            >
              <span className="lobby__btn-icon">♦</span> Join Room
            </button>
          </div>
        )}

        {mode === "create" && !incomingRoom && (
          <div className="lobby__section">
            <button
              className="lobby__btn lobby__btn--primary lobby__btn--full"
              onClick={handleCreate}
            >
              Deal Me In — Create Room
            </button>
            <button
              className="lobby__back"
              onClick={() => {
                setMode(null);
                setError("");
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="lobby__section">
            {!incomingRoom && (
              <div className="lobby__field">
                <label className="lobby__label" htmlFor="roomCode">
                  Room Code
                </label>
                <input
                  id="roomCode"
                  className="lobby__input lobby__input--code"
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  maxLength={8}
                />
              </div>
            )}
            <button
              className="lobby__btn lobby__btn--primary lobby__btn--full"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Joining…" : "Join the Table"}
            </button>
            {!incomingRoom && (
              <button
                className="lobby__back"
                onClick={() => {
                  setMode(null);
                  setError("");
                  setRoomCode("");
                }}
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {error && <p className="lobby__error">{error}</p>}

        <p className="lobby__hint">
          Estimate stories together, in real time.
        </p>
      </div>
    </div>
  );
}