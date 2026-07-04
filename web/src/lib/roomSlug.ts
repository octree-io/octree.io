// Friendly, shareable room ids for ad-hoc rooms — e.g. noise-tortoise-sun.
//
// DB-backed rooms get their canonical slug from the API (which encodes the
// numeric id). This is only for spawning a fresh, human-memorable room URL from
// the client (the "Enter a room" entry point); such rooms are ephemeral.

const WORDS = [
  'noise', 'tortoise', 'sun', 'moon', 'ember', 'otter', 'willow', 'quartz',
  'raven', 'meadow', 'cobalt', 'falcon', 'cedar', 'lantern', 'harbor', 'thunder',
  'maple', 'heron', 'pebble', 'indigo', 'badger', 'canyon', 'beacon', 'frost',
  'marble', 'clover', 'anchor', 'ridge', 'amber', 'salmon', 'velvet', 'spark',
  'crane', 'onyx', 'birch', 'boulder', 'gleam', 'reef', 'lynx', 'coral',
  'prism', 'moss', 'walrus', 'dawn', 'granite', 'finch', 'olive', 'compass',
]

function pick(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

/** A random three-word room slug, e.g. "noise-tortoise-sun". */
export function randomRoomSlug(): string {
  return `${pick()}-${pick()}-${pick()}`
}
