// Server-side source of truth for the Chat lobby channels. The web client
// fetches this list (GET /api/channels) instead of hardcoding it, and the
// realtime server validates every join / message against it — a room id of
// `${LOBBY_PREFIX}${id}` is only accepted when `id` appears here.

export interface Channel {
  id: string;
  name: string;
  topic: string;
}

export const CHANNELS: readonly Channel[] = [
  { id: "general", name: "general", topic: "General chat" },
  { id: "help", name: "help", topic: "Stuck? Ask here" },
  { id: "random", name: "random", topic: "Off-topic & memes" },
];

const byId = new Map(CHANNELS.map((c) => [c.id, c]));

export function isChannelId(id: string): boolean {
  return byId.has(id);
}
