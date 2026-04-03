import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function roomRef(roomId) {
  return doc(db, "rooms", roomId);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getRoom(roomId) {
  const snap = await getDoc(roomRef(roomId));
  return snap.exists() ? snap.data() : null;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createRoom(roomId, hostName) {
  const room = {
    id: roomId,
    createdAt: Date.now(),
    members: [
      {
        id: crypto.randomUUID(),
        name: hostName,
        isHost: true,
        vote: null,
        joinedAt: Date.now(),
      },
    ],
    story: "",
    phase: "voting", // voting | revealed
  };
  await setDoc(roomRef(roomId), room);
  return room;
}

// ── Join ──────────────────────────────────────────────────────────────────────

export async function joinRoom(roomId, memberName) {
  const room = await getRoom(roomId);
  if (!room) return null;

  // Return existing member if name already taken
  const existing = room.members.find(
    (m) => m.name.toLowerCase() === memberName.toLowerCase(),
  );
  if (existing) return { room, memberId: existing.id };

  const member = {
    id: crypto.randomUUID(),
    name: memberName,
    isHost: false,
    vote: null,
    joinedAt: Date.now(),
  };

  const updatedMembers = [...room.members, member];
  await updateDoc(roomRef(roomId), { members: updatedMembers });

  return { room: { ...room, members: updatedMembers }, memberId: member.id };
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveRoom(roomId, room) {
  await updateDoc(roomRef(roomId), room);
}

// ── Subscribe (real-time) This is the core of why the app feels live

export function subscribeToRoom(roomId, callback) {
  // every change to the room is visible to all clients immediately
  const unsub = onSnapshot(roomRef(roomId), (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
  return unsub; // call to unsubscribe
}
