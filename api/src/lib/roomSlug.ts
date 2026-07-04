// Human-friendly room ids for URLs like /room/noise-tortoise-sun.
//
// The room's real primary key stays a numeric serial (no schema change). A slug
// is a *reversible encoding* of that number: three words drawn from WORDS,
// scrambled by a multiplicative permutation so consecutive ids don't produce
// similar-looking slugs. decode(encode(id)) === id for every id in range.

// 128 short, distinct, lowercase words → 128³ ≈ 2.1M addressable rooms.
const WORDS: readonly string[] = [
  "sun", "moon", "star", "cloud", "rain", "snow", "wind", "storm",
  "frost", "mist", "dawn", "dusk", "tide", "wave", "reef", "dune",
  "cliff", "peak", "ridge", "vale", "grove", "fern", "moss", "pine",
  "oak", "elm", "birch", "maple", "cedar", "willow", "ivy", "reed",
  "lily", "rose", "sage", "mint", "clover", "thorn", "berry", "plum",
  "peach", "apple", "lemon", "olive", "maize", "wheat", "barley", "cocoa",
  "tortoise", "otter", "badger", "heron", "falcon", "raven", "robin", "finch",
  "swan", "crane", "moth", "wasp", "beetle", "cricket", "minnow", "perch",
  "trout", "salmon", "whale", "seal", "walrus", "lynx", "puma", "bison",
  "moose", "elk", "hare", "mole", "vole", "stoat", "ferret", "marten",
  "weasel", "gecko", "viper", "cobra", "python", "iguana", "newt", "toad",
  "ember", "cinder", "spark", "flame", "glow", "shade", "gleam", "prism",
  "quartz", "granite", "marble", "slate", "copper", "cobalt", "indigo", "amber",
  "ivory", "onyx", "jade", "opal", "pearl", "ruby", "topaz", "coral",
  "velvet", "satin", "linen", "cotton", "canvas", "harbor", "meadow", "canyon",
  "noise", "thunder", "boulder", "pebble", "lantern", "beacon", "anchor", "compass",
];

const N = WORDS.length;
const SPACE = N * N * N; // total slug space

// word → index, and a uniqueness guard so a typo in WORDS fails loudly at boot.
const INDEX = new Map<string, number>();
for (let i = 0; i < WORDS.length; i++) {
  if (INDEX.has(WORDS[i])) {
    throw new Error(`roomSlug: duplicate word "${WORDS[i]}"`);
  }
  INDEX.set(WORDS[i], i);
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

// Modular inverse of a mod m via the extended Euclidean algorithm.
function modInverse(a: number, m: number): number {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

// Multiplier for the permutation: coprime to SPACE so `id → id*A mod SPACE` is a
// bijection. Start from a scattered constant and step until coprime.
let A = 2654435761 % SPACE; // Knuth's multiplicative hash constant, reduced
while (gcd(A, SPACE) !== 1) A += 1;
const A_INV = modInverse(A, SPACE);

const mulMod = (x: number, k: number): number =>
  Number((BigInt(x) * BigInt(k)) % BigInt(SPACE));

/**
 * Encode a positive room id into a three-word slug, or null if it's out of the
 * representable range (callers can fall back to the numeric id).
 */
export function encodeRoomSlug(id: number): string | null {
  if (!Number.isInteger(id) || id < 1 || id >= SPACE) return null;
  const x = mulMod(id, A);
  const i0 = Math.floor(x / (N * N));
  const i1 = Math.floor((x % (N * N)) / N);
  const i2 = x % N;
  return `${WORDS[i0]}-${WORDS[i1]}-${WORDS[i2]}`;
}

/**
 * Decode a three-word slug back to its room id, or null if it isn't a valid
 * slug (wrong shape or unknown words).
 */
export function decodeRoomSlug(slug: string): number | null {
  const parts = slug.toLowerCase().split("-");
  if (parts.length !== 3) return null;

  const idx = parts.map((p) => INDEX.get(p));
  if (idx.some((v) => v === undefined)) return null;
  const [i0, i1, i2] = idx as number[];

  const x = i0 * N * N + i1 * N + i2;
  const id = mulMod(x, A_INV);
  return id >= 1 && id < SPACE ? id : null;
}

/**
 * Resolve a `:id` route/socket param to a numeric room id, accepting either a
 * word slug (noise-tortoise-sun) or a bare number (5) for backward compat.
 * Returns null when it's neither.
 */
export function resolveRoomId(raw: string): number | null {
  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
  return decodeRoomSlug(raw);
}
