import type { Identity } from "./types.js";

// Palette mirrors the avatar colours used across the web app.
const COLORS = [
  "#7c5cbf", "#2f7d5b", "#b45f9d", "#c2703d",
  "#3d9a9a", "#d24f7c", "#5c8fd6", "#8a63d2", "#3b6fb0",
];

const ADJECTIVES = [
  "swift", "calm", "brave", "keen", "lucky", "sly", "bold", "wise",
  "quiet", "eager", "witty", "nimble", "sunny", "spry",
];

const ANIMALS = [
  "otter", "falcon", "koala", "lynx", "heron", "fox", "wren", "ibex",
  "moth", "seal", "crane", "newt", "puma", "raven",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}-${n}-${num}`;
}

// Anonymous identity for a socket. A colour is picked deterministically from
// the socket id so it stays stable for the life of the connection.
export function makeIdentity(socketId: string, name?: string): Identity {
  const clean = name?.trim().slice(0, 24);
  return {
    id: socketId,
    name: clean && clean.length > 0 ? clean : randomName(),
    color: COLORS[hash(socketId) % COLORS.length],
  };
}
