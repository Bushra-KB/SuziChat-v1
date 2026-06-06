# ARCHITECTURE.md

## Overview
Suzi Chat V1 will use a **modular monolith** architecture.

This means:
- one backend application
- one database
- one realtime layer
- one web application
- one admin panel inside the web app
- clear internal feature modules

This is the right architecture for a first version built by one developer with AI assistance. It keeps the codebase simple, fast to develop, and easy to deploy.

---

## High-Level Architecture

### Applications
- **Web App**: Next.js
- **Backend API**: NestJS
- **Future Mobile App**: React Native / Expo

### Core Infrastructure
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Realtime**: Socket.IO
- **Reverse Proxy**: Caddy
- **Storage**: local file storage on server volume
- **Optional Support Service**: Redis
- **Deployment**: Docker Compose on one Hetzner server

---

## Architectural Principles

1. **One shared backend**  
   Web and future mobile must use the same API and realtime system.

2. **One shared data model**  
   All clients use the same PostgreSQL database and business rules.

3. **Modular code organization**  
   Each domain feature should have its own module, service, DTOs, and database access layer.

4. **Simple deployment**  
   One server, one compose stack, persistent data volumes.

5. **Replaceable infrastructure pieces later**  
   Storage, caching, and deployment can evolve later without rewriting core business logic.

---

## Recommended Monorepo Structure

Use **pnpm workspaces**.

```text
suzi-chat/
  apps/
    web/          # Next.js responsive web app + admin panel
    api/          # NestJS backend + Socket.IO
  packages/
    types/        # shared TypeScript types
    config/       # shared config helpers
    ui-tokens/    # colors, spacing, typography, shadows, radii
    schemas/      # shared validation contracts if needed
  infra/
    docker/       # compose files, Dockerfiles, helper scripts
    caddy/        # Caddy config
  docs/
    PROJECT_SPEC.md
    ARCHITECTURE.md
    WORKFLOW.md
```

---

## Frontend Architecture (Web)

### Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Scope
The web app includes:
- public landing and auth screens
- authenticated user area
- chat rooms UI
- direct messaging UI
- dating section
- snaps and reels section
- games section
- admin area

### Frontend principles
- responsive first
- component-driven UI
- shared design tokens
- minimal client complexity
- keep data fetching patterns consistent

### Recommended UI structure
- `app/(public)` or public routes
- `app/(auth)` auth routes
- `app/(app)` main authenticated app
- `app/admin` admin routes

### State approach
Keep state management simple:
- server state: TanStack Query or framework-friendly fetch approach
- local UI state: React state / context
- realtime state: Socket.IO hooks/services

Avoid heavy global state unless clearly needed.

---

## Backend Architecture

### Stack
- Node.js
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO

### Why NestJS
NestJS gives:
- modular structure
- dependency injection
- DTO validation
- guards and auth patterns
- built-in structure for gateways and websocket events
- maintainable organization for a growing monolith

### Backend module structure
Recommended modules:
- auth
- users
- profiles
- friends
- blocks
- rooms
- room-chat
- direct-messages
- dating
- snaps
- reels
- games
- notifications
- reports
- admin
- common/shared

Each module should ideally contain:
- controller
- service
- DTOs
- entity/model mapping logic
- tests later if time allows

---

## API Design

### API style
Use **REST** for standard operations and **Socket.IO** for realtime events.

### Example REST route groups
- `/v1/auth/*`
- `/v1/users/*`
- `/v1/friends/*`
- `/v1/rooms/*`
- `/v1/conversations/*`
- `/v1/dating/*`
- `/v1/snaps/*`
- `/v1/reels/*`
- `/v1/games/*`
- `/v1/notifications/*`
- `/v1/reports/*`
- `/v1/admin/*`

### API principles
- versioned routes
- DTO validation for all input
- consistent error shape
- pagination for lists
- soft-delete when useful
- auth/role guards

---

## Realtime Architecture

Use **Socket.IO** for:
- room messaging
- private message delivery
- typing indicators
- room presence
- user online status
- notification events

### Suggested realtime channels
- `user:{userId}`
- `room:{roomId}`
- `conversation:{conversationId}`

### Example events
- `room.message.send`
- `room.message.new`
- `room.user.joined`
- `room.user.left`
- `conversation.message.send`
- `conversation.message.new`
- `notification.new`
- `presence.update`

Keep event naming explicit and small in scope.

---

## WebRTC Calls and Chat Media (Phase 2)

Phase 2 adds real-time audio/video calls, voice messages, and file attachments
across DM, ChatRoom, and Dating chat surfaces.

> Scope note: `PROJECT_SPEC.md` originally listed voice/video chat as out of V1.
> Phase 2 intentionally expands that scope. Group video is still out of scope:
> ChatRoom calls are audio-only with a small participant cap.

### Chat media (voice messages + file attachments)

- A shared `MessageAttachment` model is referenced by `DirectMessage`,
  `RoomMessage`, and `DatingMessage` (exactly one foreign key set per row,
  enforced in app code). Each message also carries a `MessageKind`
  (`TEXT | VOICE | FILE | IMAGE | CALL`).
- Uploads reuse the existing multer disk-storage pattern via a shared
  `UploadsModule`:
  - `POST /v1/uploads/chat-file` (images/docs/audio/video/zip, 25 MB cap,
    executable/script extensions blocked)
  - `POST /v1/uploads/voice` (audio, 10 MB / 5 min cap, returns `durationMs`)
- Files are stored under `uploads/chat/` and `uploads/voice/` and served from
  `/uploads`. Attachment metadata (mime, size, duration) is validated and
  persisted; only internal `/api/uploads/...` URLs are accepted.

### Calls: signaling and media

- **Approach:** raw WebRTC. 1:1 (DM + Dating) is peer-to-peer; ChatRoom calls
  use an audio-only mesh capped by `ROOM_CALL_MAX` (default 6). No SFU.
- **Signaling** rides the existing Socket.IO gateway (`RealtimeGateway`),
  reusing per-user `user:{id}` rooms and a `call:{callId}` room:
  - `call:invite` / `call:incoming`, `call:accept` / `call:accepted`,
    `call:decline` / `call:declined`, `call:cancel` / `call:canceled`,
    `call:end` / `call:ended`, `call:peer-left`
  - `call:signal` relays SDP/ICE between specific participants
  - `call:room:join` / `call:room:participant-joined` for room mesh
- **Access checks** reuse `ConversationsService.getPeer`,
  `DatingService.assertMatchParticipant`, and `RoomsService.getRoomAccess`.
- **CallSession** persists a lightweight record (context, participants, status,
  timestamps) for history and missed-call notifications. Live media/signaling
  state is kept in memory in `CallService`; media never flows through the API.

### ChatRoom Live broadcast

- **Approach:** LiveKit SFU. Room owners and moderators can publish one
  audio/video stream; room members subscribe as viewers. This is intentionally
  separate from the room audio mesh call so broadcast live does not turn into a
  video group call.
- **Authorization/token flow:** Socket.IO events in `RealtimeGateway` validate
  room access and call `RoomLiveService`, which creates a `RoomLiveSession` and
  mints scoped LiveKit tokens:
  - `room:live:start` creates the live session and returns a publish token.
  - `room:live:join` returns a subscribe token for room members.
  - `room:live:end` ends the live session and emits room updates.
- **Persistence:** `RoomLiveSession` records host, room, LiveKit room name,
  status, and timestamps. Start/end events are also emitted as room chat
  messages.
- **Infrastructure:** the `livekit` Docker service handles SFU media. Caddy
  proxies signaling at `/livekit`; LiveKit media ports must be reachable
  directly by clients.

### TURN/STUN infrastructure

- `GET /v1/rtc/ice` issues ICE servers: static STUN plus short-lived TURN
  credentials using the coturn REST scheme
  (`username = "<expiry>:<userId>"`, `credential = base64(HMAC-SHA1(secret, username))`).
- A `coturn` service runs alongside the stack (see `infra/docker/coturn/`).
  Required env: `TURN_SECRET`, `TURN_URLS`, `TURN_REALM`, `TURN_EXTERNAL_IP`,
  optional `STUN_URLS`, `TURN_TTL_SECONDS`. TURN runs over UDP/TCP on the host
  (Caddy proxies TCP/WS only). V1 runs TURN without TLS; media stays encrypted
  via DTLS-SRTP. Upgrade to `turns://` later by adding certs to `turnserver.conf`.

### Browser permissions

`main.ts` sets `Permissions-Policy: camera=(self), microphone=(self),
display-capture=(self)` so `getUserMedia` works for calls and voice messages.

---

## Database Architecture

### Database choice
- PostgreSQL
- Prisma ORM

### General design approach
- normalized enough for correctness
- not excessively abstract
- explicit foreign keys
- clear audit/moderation records
- store persistent business data in Postgres
- use Redis only for ephemeral or support concerns later

### Core domains in the data model
- users and profiles
- friendships and blocks
- rooms and room membership
- room chat messages
- conversations and direct messages
- dating profiles and matches
- media assets
- snaps and reels
- notifications
- reports and moderation actions
- games and game sessions

### Important persistence rule
App code can be redeployed freely. Data must remain persistent through volumes and migrations.

---

## Storage Architecture

### V1 choice
Use **local file storage** on the server.

### Why
- simpler to set up
- lower cognitive load
- acceptable for V1 on one server
- faster for one-developer implementation

### Important design rule
Do not scatter file logic across the codebase.
Create one storage service abstraction so storage can later move to:
- S3
- Cloudflare R2
- MinIO
- other S3-compatible storage

### Media handling
- images: Sharp
- video processing and thumbnail extraction: FFmpeg

### Recommended media flow
1. upload file
2. validate mime and size
3. store file in organized folder path
4. generate image resize or video thumbnail if needed
5. store metadata in database

---

## Admin Architecture

The admin panel should be part of the Next.js web app, not a separate application.

### Why
- less overhead
- shared auth/session handling
- shared components and styles
- easier deployment

### Admin access
- protected by role-based authorization
- only admin users can access admin routes

---

## Localization Architecture

### Initial supported UI languages
- English
- Irish
- French
- German
- Amharic

### V1 rule
Localize UI text through translation files.
Do not attempt automatic translation of user content in V1.

### Recommendation
Use a standard i18n strategy in the web app and keep translation keys organized by feature.

---

## Security Architecture

### Core requirements
- Argon2 password hashing
- JWT access tokens
- refresh token flow
- route guards
- admin role checks
- file upload validation
- rate limiting on sensitive endpoints
- report/block enforcement
- audit trail for moderation actions

### Email verification
Not mandatory for V1 launch.
Can be added later.

---

## Deployment Architecture

### Server
- Hetzner CPX32
- single server deployment for V1

### Domain
- suzichat.com

### Runtime stack
- Caddy
- web app container
- api container
- postgres container
- redis container (optional but recommended)
- mounted uploads storage

### Deployment model
Docker Compose with persistent volumes.

### Persistence requirements
Deployment must preserve:
- PostgreSQL data
- uploaded media
- env files
- server config

### Recommended volume separation
- postgres data volume
- uploads volume
- optional redis data if needed

---

## Suggested Docker Compose Services

```text
caddy
web
api
postgres
redis
```

Optional future additions:
- backup job
- cron worker
- queue worker

Do not add extra services unless they solve a real V1 problem.

---

## CI/CD Direction

For V1, keep CI/CD simple.

### Recommended approach
- GitHub private repo
- feature branches
- merge to main
- deploy main to server
- use Docker Compose on server

### CI should at least do
- install dependencies
- type check
- lint
- basic build validation

### CD can start manual
Manual deployment is acceptable for V1 if it is documented and safe.

---

## Branching and Delivery Strategy

Use feature branches for all scoped work.
Examples:
- `feat/monorepo-init`
- `feat/web-shell`
- `feat/auth-foundation`
- `feat/rooms-module`
- `fix/login-form-validation`
- `chore/docker-local-setup`

Each feature branch should:
- focus on one small scope
- be tested locally
- be merged only when stable
- be deployed without destroying data

---

## Future Evolution Path

This V1 architecture should later be able to evolve into:
- mobile app using same backend
- S3-compatible object storage
- stronger background job processing
- better search/discovery
- CDN/media delivery
- more advanced moderation and analytics

Do not design V1 as if all of that must be built now.
Build the cleanest simple version first.

---

## Final Architecture Summary

Suzi Chat V1 architecture is:
- **web-first**
- **modular monolith**
- **Next.js + NestJS + PostgreSQL + Prisma + Socket.IO**
- **pnpm workspace monorepo**
- **Caddy reverse proxy**
- **Docker Compose deployment**
- **local file storage for now**
- **single Hetzner server for V1**

This architecture is intentionally optimized for fast implementation, low complexity, safe deployment, and future extensibility.

