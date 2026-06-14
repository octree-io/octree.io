import type { User, Problem, Room, Message, Channel } from '../types'

export const CURRENT_USER: User = {
  id: 'u-you',
  username: 'you',
  color: '#7c5cbf',
}

export const USERS: User[] = [
  CURRENT_USER,
  { id: 'u-jk', username: 'jasen_k', color: '#5f5fa8' },
  { id: 'u-mr', username: 'mridula_r', color: '#8b5cf6' },
  { id: 'u-al', username: 'alex_liu', color: '#0ea5e9' },
  { id: 'u-sn', username: 'sara_n', color: '#ec4899' },
  { id: 'u-pk', username: 'priya_k', color: '#f59e0b' },
]

export const PROBLEMS: Problem[] = [
  {
    id: 'p-yt',
    slug: 'design-youtube',
    title: 'Design YouTube',
    difficulty: 'hard',
    description:
      'Design a video sharing platform similar to YouTube. Users should be able to upload, view, search, and comment on videos at massive scale.',
    requirements: {
      functional: [
        'Upload and stream video content',
        'Search videos by keyword and filter',
        'Support comments and likes',
        'Recommend related videos',
        'Support user subscriptions',
      ],
      nonFunctional: [
        'High availability (99.99% uptime)',
        'Low latency video playback globally',
        'Eventual consistency acceptable for counts',
      ],
    },
    scaleAssumptions: [
      '500h video/min uploaded',
      '2B users',
      '1B views/day',
      'CDN required',
    ],
    tags: ['Object storage', 'CDN', 'Message queue', 'Transcoding'],
  },
  {
    id: 'p-rl',
    slug: 'rate-limiter',
    title: 'Rate Limiter',
    difficulty: 'medium',
    description:
      'Design a distributed rate limiter that can be used to throttle requests at API gateways across multiple data centers.',
    requirements: {
      functional: [
        'Allow / deny requests based on rate limits',
        'Support per-user and per-IP rules',
        'Return proper 429 responses with retry-after header',
        'Support multiple algorithms (token bucket, sliding window)',
      ],
      nonFunctional: [
        'Sub-millisecond overhead per request',
        'Consistent behavior across nodes',
        'Fault tolerant — degrades gracefully',
      ],
    },
    scaleAssumptions: ['10M req/sec peak', '100+ data centers', '< 1ms added latency'],
    tags: ['Redis', 'Sliding window', 'Token bucket', 'Distributed locks'],
  },
  {
    id: 'p-tw',
    slug: 'design-twitter-feed',
    title: 'Design Twitter Feed',
    difficulty: 'hard',
    description:
      "Design Twitter's home timeline feed. Users follow other users and see a ranked stream of tweets from the people they follow.",
    requirements: {
      functional: [
        'Publish tweets (text, media)',
        'Render a personalized home timeline',
        'Follow / unfollow users',
        'Like and retweet',
      ],
      nonFunctional: [
        'Timeline loads in < 200ms',
        'Handle celebrity accounts (10M+ followers)',
        'Eventual consistency for feed',
      ],
    },
    scaleAssumptions: ['500M users', '300K tweets/min', '2B timeline reads/day'],
    tags: ['Fan-out', 'Cache', 'Graph DB', 'Pub-sub'],
  },
  {
    id: 'p-url',
    slug: 'url-shortener',
    title: 'URL Shortener',
    difficulty: 'easy',
    description:
      'Design a URL shortening service like bit.ly. Users paste a long URL and receive a short alias that redirects to the original.',
    requirements: {
      functional: [
        'Shorten a URL to a unique alias',
        'Redirect alias to original URL',
        'Custom alias support',
        'Analytics (click counts)',
      ],
      nonFunctional: [
        '100ms redirect latency',
        '99.9% uptime',
        'Aliases must not collide',
      ],
    },
    scaleAssumptions: ['100M URLs created/day', '10B redirects/day', '10:1 read-write ratio'],
    tags: ['Hashing', 'KV store', 'CDN', 'Analytics'],
  },
]

const now = new Date()
const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)
const twoMinsAgo = new Date(now.getTime() - 2 * 60 * 1000)

export const ROOMS: Room[] = [
  {
    id: 'room-1',
    problem: PROBLEMS[0],
    host: USERS[1],
    status: 'active',
    durationMinutes: 45,
    maxPlayers: 4,
    startedAt: thirtyMinsAgo,
    participants: [
      { user: USERS[1], joinedAt: thirtyMinsAgo, progress: 72 },
      { user: USERS[2], joinedAt: thirtyMinsAgo, progress: 61 },
      { user: USERS[4], joinedAt: thirtyMinsAgo, progress: 55 },
      { user: CURRENT_USER, joinedAt: thirtyMinsAgo, progress: 68 },
    ],
  },
  {
    id: 'room-2',
    problem: PROBLEMS[1],
    host: USERS[3],
    status: 'active',
    durationMinutes: 30,
    maxPlayers: 2,
    startedAt: twoMinsAgo,
    participants: [
      { user: USERS[3], joinedAt: twoMinsAgo, progress: 18 },
      { user: USERS[5], joinedAt: twoMinsAgo, progress: 12 },
    ],
  },
  {
    id: 'room-3',
    problem: PROBLEMS[2],
    host: USERS[4],
    status: 'waiting',
    durationMinutes: 45,
    maxPlayers: 4,
    participants: [{ user: USERS[4], joinedAt: new Date(), progress: 0 }],
  },
]

export const CHANNELS: Channel[] = [
  { id: 'ch-general', name: 'general', type: 'channel' },
  { id: 'ch-sd', name: 'system-design', type: 'channel', unreadCount: 12 },
  { id: 'ch-db', name: 'databases', type: 'channel', unreadCount: 4 },
  { id: 'ch-cache', name: 'caching-strategies', type: 'channel' },
  { id: 'ch-dist', name: 'distributed-systems', type: 'channel', mentionCount: 2 },
  { id: 'ch-api', name: 'api-design', type: 'channel' },
  { id: 'ch-prep', name: 'interview-prep', type: 'channel' },
  { id: 'ch-res', name: 'resources', type: 'channel' },
  { id: 'dm-jk', name: 'jasen_k', type: 'dm', unreadCount: 2 },
  { id: 'dm-mr', name: 'mridula_r', type: 'dm' },
  { id: 'dm-al', name: 'alex_liu', type: 'dm' },
  { id: 'dm-sn', name: 'sara_n', type: 'dm' },
]

function mins(n: number) {
  return new Date(now.getTime() - n * 60 * 1000)
}

export const MESSAGES: Message[] = [
  {
    id: 'm1',
    channelId: 'ch-general',
    user: USERS[1],
    text: "Just finished the YouTube design room. Went better than expected — finally stopped second-guessing my CDN choice. If anyone's curious about the trade-off between push vs pull CDN invalidation let me know.",
    timestamp: mins(62),
    reactions: [
      { emoji: '🔥', count: 8, mine: true },
      { emoji: '💡', count: 5 },
      { emoji: '👍', count: 3 },
    ],
  },
  {
    id: 'm2',
    channelId: 'ch-general',
    user: USERS[1],
    text: 'Key insight: for deleted videos, soft-delete + signed URL TTL is **way** cheaper than push invalidation at YouTube\'s scale. Push invalidation at 2B+ edges is basically a DoS on your own CDN.',
    timestamp: mins(60),
  },
  {
    id: 'm3',
    channelId: 'ch-general',
    user: USERS[3],
    text: 'Makes sense. The FAANG interviewers specifically look for this. Here\'s the rough back-of-envelope I use:',
    timestamp: mins(55),
    codeBlock: {
      label: 'bandwidth estimation · youtube-scale.txt',
      code: `// Daily uploads
500 hrs/min × 60 min/hr × 24 hr/day = 720,000 hrs/day
720k hrs × 1 GB/hr (compressed) = ~720 TB/day ingress

// Read:write ratio ~200:1
720 TB × 200 = 144 PB/day egress
→ ~1.7 GB/sec sustained CDN bandwidth`,
    },
  },
  {
    id: 'm4',
    channelId: 'ch-general',
    user: USERS[2],
    text: "@alex_liu those numbers are wild. Do you account for adaptive bitrate streaming? The actual storage multiplier is more like 3-5x when you store 360p / 720p / 1080p / 4K variants.",
    timestamp: mins(51),
    threadCount: 5,
  },
  {
    id: 'm5',
    channelId: 'ch-general',
    user: USERS[4],
    text: "Hot take: the **hardest part** of system design interviews isn't the architecture — it's the scoping. Every candidate I've interviewed who failed ran out of time because they tried to design everything in the first 10 minutes.",
    timestamp: mins(40),
    reactions: [
      { emoji: '✅', count: 14 },
      { emoji: '💯', count: 7, mine: true },
    ],
  },
  {
    id: 'm6',
    channelId: 'ch-general',
    user: USERS[4],
    text: 'The formula that worked for me: first 5 min clarifying requirements → 5 min capacity estimation → 25 min architecture → 10 min deep dive on one component → 5 min bottlenecks. Strict timebox.',
    timestamp: mins(38),
  },
  {
    id: 'm7',
    channelId: 'ch-general',
    user: CURRENT_USER,
    text: '@sara_n this is exactly what the rooms here helped me internalize. The timer forces you to timebox each section. Finished my first room 4 minutes early.',
    timestamp: mins(10),
  },
]
