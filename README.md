# OnlyFun

Drop into voice rooms about anything. No sign up. No waiting. Just talk.

A real-time, location-based voice chat platform built on a map of Bishkek. Users create anonymous voice rooms at real city locations, join conversations, and explore trending news and events — all through the browser.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [WebRTC & Voice Chat](#webrtc--voice-chat)
- [NAT Traversal & TURN](#nat-traversal--turn)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Commands](#commands)
- [API Routes](#api-routes)
- [Admin Panel](#admin-panel)
- [Deployment](#deployment)
- [Database](#database)
- [Internationalization](#internationalization)

---

## How It Works

```
User opens app
    |
    v
Sees Bishkek map with live rooms (colored dots)
    |
    v
Taps a room dot --> Joins voice chat instantly (WebRTC)
    OR
Taps + button --> Places a new room on the map
    |
    v
Other users see it and join
    |
    v
Everyone talks via browser mic (peer-to-peer voice)
```

**Key features:**

- No account needed — just pick a name and go
- 8 room modes: debate, chill, confessions, business, funny, advice, deep, night
- AI-generated ice breakers (Gemini) to start conversations
- Live camera feeds from Bishkek
- News and events feed with "create a room about this" integration
- Room preview (sneak listen for 6 seconds before joining)
- Admin panel for content and user management

---

## Architecture

```
                    +------------------+
                    |   Next.js App    |
                    |   (Frontend)     |
                    |   Port 3000      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
    +-------------------+         +-------------------+
    |   API Routes      |         |  WebSocket Server |
    |  /api/*           |         |  (server/index.ts)|
    |  (Next.js)        |         |  Port 1999        |
    +--------+----------+         +--------+----------+
             |                             |
             v                             v
    +-------------------+         +-------------------+
    |  Neon PostgreSQL  |         |  In-Memory State  |
    |  (Database)       |         |  (Rooms, Users,   |
    |                   |         |   Presence)        |
    +-------------------+         +-------------------+
```

### Data flow:

| Component            | Responsibility                                       |
| -------------------- | ---------------------------------------------------- |
| **Next.js App**      | UI, rendering, API routes, static pages              |
| **WebSocket Server** | Real-time room state, user presence, signaling relay |
| **Neon PostgreSQL**  | Persistent data: news, events, admin users, settings |
| **Cloudflare TURN**  | Relay server for users behind restrictive NATs       |
| **Google Maps**      | Interactive map display                              |
| **Gemini AI**        | Ice breaker generation, topic suggestions            |

---

## WebRTC & Voice Chat

Voice chat is peer-to-peer using the browser's built-in WebRTC. Here's how a connection is established:

```
User A joins room                    User B already in room
     |                                      |
     +------- WebSocket: "peer-join" ------>|
     |                                      |
     |<------ WebSocket: "mic-ready" ------+
     |                                      |
     +------- WebSocket: "offer" (SDP) --->|
     |                                      |
     |<------ WebSocket: "answer" (SDP) ---+
     |                                      |
     +<===== ICE candidates exchange =====>+
     |                                      |
     +<========= Audio stream ============>+
              (direct P2P or via TURN)
```

### Key files:

| File                            | Purpose                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `src/components/use-voice.ts`   | WebRTC peer connections, mic handling, speaking detection  |
| `src/components/use-preview.ts` | "Sneak listen" — receive-only WebRTC for 6-second previews |
| `src/components/use-party.ts`   | WebSocket connection, room state, signaling relay          |
| `server/index.ts`               | Server-side signaling, room management, presence           |

### Connection states:

```
new --> checking --> connected --> completed
                        |
                   disconnected (transient, may recover)
                        |
                     failed (ICE restart attempted, up to 3 times)
                        |
                     closed (give up)
```

---

## NAT Traversal & TURN

### What is NAT?

**NAT (Network Address Translation)** is how your router shares one public IP among many devices. Most home/mobile networks use NAT, which means your device doesn't have a direct public address — making peer-to-peer connections tricky.

### Why it matters for OnlyFun

WebRTC needs to establish a direct connection between two browsers. NAT makes this difficult because neither browser knows the other's real address.

### How we solve it

```
  User A                                          User B
  (behind NAT)                                    (behind NAT)
       |                                               |
       |  1. Ask STUN: "What's my public IP?"          |
       +-----------> STUN Server <--------------------+
       |             (Google)                          |
       |                                               |
       |  2. Exchange public IPs via WebSocket          |
       +<============ Signaling ===================>  +
       |                                               |
       |  3. Try direct P2P connection                 |
       +<------------- P2P? ------------------>       +
       |                                               |
       |  If P2P fails (symmetric NAT):               |
       |                                               |
       |  4. Route through TURN relay                  |
       +<=======> Cloudflare TURN <================>  +
                  (relay server)
```

### The three server types:

| Server        | What it does                                    | When it's used                           |
| ------------- | ----------------------------------------------- | ---------------------------------------- |
| **STUN**      | Tells you your public IP                        | Always (first step)                      |
| **TURN**      | Relays audio traffic between peers              | When direct P2P fails (~15-20% of users) |
| **Signaling** | Exchanges connection info (SDP, ICE candidates) | Always (our WebSocket server)            |

### NAT types and success rates:

| NAT Type           | Common in                   | P2P works? | Needs TURN? |
| ------------------ | --------------------------- | ---------- | ----------- |
| Full cone          | Home routers (EU/US)        | Yes        | No          |
| Address-restricted | Some routers                | Usually    | Sometimes   |
| Port-restricted    | Corporate networks          | Sometimes  | Often       |
| Symmetric          | Asian ISPs, mobile carriers | No         | **Yes**     |

### Our TURN setup (Cloudflare):

```
Client joins room
    |
    v
GET /api/turn-credentials
    |
    v
Next.js API calls Cloudflare (server-side, token hidden)
    |
    v
Returns short-lived TURN credentials (24h TTL)
    |
    v
RTCPeerConnection created with STUN + TURN servers
    |
    v
WebRTC automatically picks best path:
    host (LAN) > srflx (STUN/P2P) > relay (TURN)
```

**Capacity:** 1,000 GB/month free from Cloudflare = ~225,000 calls/month.

### Debugging connectivity

Open browser console and look for:

```
[voice] TURN credentials loaded: 3 servers     <-- credentials fetched
[voice] ICE <peer_id>: connected               <-- connection established
[voice] Connected via srflx -> srflx udp       <-- P2P worked!
[voice] Connected via relay -> relay udp        <-- TURN relay used
[voice] ICE failed for <id>, restarting (1/3)   <-- retry in progress
```

---

## Tech Stack

| Category       | Technology            | Version |
| -------------- | --------------------- | ------- |
| **Framework**  | Next.js               | 15.5    |
| **Language**   | TypeScript            | 5       |
| **UI**         | React                 | 19      |
| **Styling**    | Tailwind CSS          | 3.4     |
| **Animations** | Framer Motion         | 12      |
| **Icons**      | Lucide React          | 1.7     |
| **Maps**       | Google Maps API       | —       |
| **Database**   | Neon (PostgreSQL)     | —       |
| **Real-time**  | WebSocket (ws)        | 8.20    |
| **Voice**      | Browser WebRTC        | —       |
| **TURN**       | Cloudflare Calls      | —       |
| **AI**         | Google Gemini         | 0.24    |
| **Auth**       | jose (JWT) + bcryptjs | —       |
| **Video**      | HLS.js                | 1.6     |
| **Testing**    | Vitest                | 4.1     |
| **Scraping**   | Cheerio               | 1.2     |

---

## Project Structure

```
onlyfun/
├── server/
│   ├── index.ts              # WebSocket server (rooms, presence, signaling)
│   └── Dockerfile            # Server Docker image
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page (name input)
│   │   ├── api/              # API routes
│   │   │   ├── turn-credentials/  # Cloudflare TURN credential generation
│   │   │   ├── ai/           # Gemini AI endpoints
│   │   │   ├── news/         # News feed
│   │   │   ├── events/       # Events feed
│   │   │   └── admin/        # Admin API (auth, CRUD, stats)
│   │   └── admin/            # Admin panel pages
│   ├── components/
│   │   ├── pixel-canvas.tsx   # Main app shell (map + sidebar + drawers)
│   │   ├── city-map.tsx       # Google Maps with room overlays
│   │   ├── use-party.ts      # WebSocket connection & room state
│   │   ├── use-voice.ts      # WebRTC voice chat
│   │   ├── use-preview.ts    # Sneak-listen preview
│   │   ├── inside-pixel.tsx   # In-room UI (voice controls, participants)
│   │   ├── create-modal.tsx   # Room creation dialog
│   │   ├── mobile-bottom-nav.tsx  # iOS-style bottom tab bar
│   │   ├── draggable-sheet.tsx    # Drag-to-dismiss bottom sheets
│   │   ├── desktop-sidebar.tsx    # Desktop sidebar (live cam, news, events)
│   │   ├── live-cam-player.tsx    # Bishkek live camera feeds
│   │   ├── onboarding-tour.tsx    # Interactive onboarding with fireworks
│   │   └── sidebar/          # Feed components (news, events, sponsor)
│   ├── i18n/                 # Translations (English + Russian)
│   ├── config/               # Room modes, constants
│   ├── lib/                  # Database, auth, utilities
│   └── types/                # TypeScript type definitions
├── scripts/                  # Migration & seed scripts
├── public/                   # Static assets (sounds, favicon, images)
├── Dockerfile                # Frontend Docker image
├── check.sh                  # Pre-commit validation script
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd onlyfun
npm install

# 2. Create environment file
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# 3. Seed admin user (optional)
npm run seed:admin

# 4. Start development servers (two terminals)

# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: WebSocket server
npm run server:dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# WebSocket server URL (client connects to this)
NEXT_PUBLIC_WS_URL="ws://localhost:1999"

# Google Maps API key (client-side)
NEXT_PUBLIC_GOOGLE_MAPS_KEY="your-google-maps-key"

# Neon PostgreSQL connection string
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Google Gemini API key (AI features)
GEMINI_API_KEY="your-gemini-key"

# JWT secret for admin authentication
JWT_SECRET="your-random-secret"

# WebSocket server internal URL (server-to-server)
WS_SERVER_URL="http://localhost:1999"

# Cloudflare TURN server (for WebRTC relay)
CLOUDFLARE_TURN_KEY_ID="your-turn-key-id"
CLOUDFLARE_TURN_API_TOKEN="your-turn-api-token"
```

| Variable                      | Exposed to client? | Required? | Purpose                                   |
| ----------------------------- | ------------------ | --------- | ----------------------------------------- |
| `NEXT_PUBLIC_WS_URL`          | Yes                | Yes       | WebSocket connection URL                  |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Yes                | Yes       | Google Maps rendering                     |
| `DATABASE_URL`                | No                 | Yes       | PostgreSQL connection                     |
| `GEMINI_API_KEY`              | No                 | No        | AI ice breakers & suggestions             |
| `JWT_SECRET`                  | No                 | Yes       | Admin auth tokens                         |
| `WS_SERVER_URL`               | No                 | Yes       | Server-side WS communication              |
| `CLOUDFLARE_TURN_KEY_ID`      | No                 | No        | TURN relay (voice in restricted networks) |
| `CLOUDFLARE_TURN_API_TOKEN`   | No                 | No        | TURN relay credentials                    |

---

## Commands

### Development

```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run server:dev       # Start WebSocket server (port 1999)
```

### Quality Checks

```bash
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript compiler check
npm run format           # Auto-format code with Prettier
npm run format:check     # Check formatting without changing files
npm run test             # Run tests (Vitest)
npm run test:watch       # Run tests in watch mode
```

### Pre-commit (runs all checks)

```bash
npm run pre-commit
```

This runs `check.sh` which executes in order:

1. `npm ci` — clean install dependencies
2. `npm audit` — security vulnerability check
3. `npm run lint` — ESLint
4. `npm run format` — auto-format + verify
5. `npm run type-check` — TypeScript compiler
6. `npm run build` — full production build

If any step fails, the script stops and reports the error.

### Build & Production

```bash
npm run build            # Production build
npm run start            # Start production server
npm run server:build     # Compile WS server to CommonJS
npm run server:start     # Run compiled WS server
```

### Database & Admin

```bash
npm run seed:admin       # Create initial admin user
```

---

## API Routes

### Public

| Route                   | Method | Description                       |
| ----------------------- | ------ | --------------------------------- |
| `/api/turn-credentials` | GET    | Fetch Cloudflare TURN credentials |
| `/api/name-check`       | POST   | Validate username                 |
| `/api/config/maps-key`  | GET    | Get Google Maps API key           |
| `/api/ice-breakers`     | GET    | Fetch conversation starters       |
| `/api/operating-hours`  | GET    | Get app operating hours           |
| `/api/news/feed`        | GET    | News articles feed                |
| `/api/events/feed`      | GET    | City events feed                  |

### AI

| Route                   | Method | Description                         |
| ----------------------- | ------ | ----------------------------------- |
| `/api/ai/ice-breaker`   | POST   | Generate AI ice breaker for a topic |
| `/api/ai/suggest-topic` | POST   | AI-powered topic suggestions        |
| `/api/ai/status`        | GET    | Check AI service availability       |

### Admin (JWT required)

| Route                    | Method      | Description          |
| ------------------------ | ----------- | -------------------- |
| `/api/admin/auth/login`  | POST        | Admin login          |
| `/api/admin/auth/logout` | POST        | Admin logout         |
| `/api/admin/auth/me`     | GET         | Current admin user   |
| `/api/admin/stats`       | GET         | Platform statistics  |
| `/api/admin/news`        | GET, POST   | News CRUD            |
| `/api/admin/news/[id]`   | PUT, DELETE | Edit/delete news     |
| `/api/admin/events`      | GET, POST   | Events CRUD          |
| `/api/admin/events/[id]` | PUT, DELETE | Edit/delete event    |
| `/api/admin/blocked`     | GET, POST   | Manage blocked users |
| `/api/admin/settings`    | GET, POST   | App settings         |

---

## Admin Panel

Accessible at `/admin/login`. Features:

- **Dashboard** — live stats (active rooms, online users, total messages)
- **News** — create/edit/delete news articles for the Pulse feed
- **Events** — manage city events for the Events feed
- **Rooms** — monitor active voice rooms
- **Users** — view and block users
- **Settings** — operating hours, app configuration

---

## Deployment

The project uses Docker for deployment. Two separate containers:

### Frontend (Next.js)

```dockerfile
# Build: docker build -t onlyfun-web .
# Run:   docker run -p 3000:3000 onlyfun-web
```

**Required build args:**

- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

**Required runtime env:**

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `WS_SERVER_URL`
- `CLOUDFLARE_TURN_KEY_ID`
- `CLOUDFLARE_TURN_API_TOKEN`

### WebSocket Server

```dockerfile
# Build: docker build -t onlyfun-ws -f server/Dockerfile .
# Run:   docker run -p 1999:1999 onlyfun-ws
```

**Required runtime env:**

- `DATABASE_URL`
- `PORT` (default: 1999)

### Railway deployment

Add both services to Railway:

1. **Frontend service** — uses root `Dockerfile`, expose port 3000
2. **WS server service** — uses `server/Dockerfile`, expose port 1999

Set environment variables in each service's settings accordingly. The TURN credentials (`CLOUDFLARE_TURN_*`) only go on the frontend service.

---

## Database

**Provider:** Neon (serverless PostgreSQL)

**Connection:** via `@neondatabase/serverless` — no ORM, raw SQL queries.

**Key tables:**

- `admin_users` — admin credentials (bcrypt hashed)
- `app_settings` — application configuration
- `news_cache` — cached news articles
- `events` — city events
- `blocked_devices` — banned users by device ID
- `name_locks` — reserved usernames

**Scripts:**

```bash
npm run seed:admin                # Create admin user
npx tsx scripts/migrate-news.ts   # Run news migration
npx tsx scripts/migrate-events.ts # Run events migration
```

---

## Internationalization

The app supports two languages:

| Language | File             | Code |
| -------- | ---------------- | ---- |
| English  | `src/i18n/en.ts` | `en` |
| Russian  | `src/i18n/ru.ts` | `ru` |

Language is auto-detected from the browser and can be switched via the dropdown menu. All UI strings, tour steps, error messages, and room mode labels are translated.
