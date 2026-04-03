import { useEffect, useState } from "react";
import LobbyPage from "./pages/LobbyPage";
import RoomPage from "./pages/RoomPage";

export default function App() {
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("room");
    setRoomId(id);
  }, []);

  const handleRoomCreated = (id) => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", id);
    window.history.pushState({}, "", url);
    setRoomId(id);
  };

  const handleJoinRoom = (id) => {
    setRoomId(id);
  };

  if (roomId) {
    return <RoomPage roomId={roomId} />;
  }

  return (
    <LobbyPage onRoomCreated={handleRoomCreated} onJoinRoom={handleJoinRoom} />
  );
}