# Suzi Chat V1 Product & Technical Specification

## 1. Purpose

This document defines a simple, complete, developer-ready specification for **Suzi Chat V1**.

It is intentionally optimized for:
- one developer
- AI-assisted development
- fast delivery
- one shared backend
- one admin panel
- one shared design system
- simple architecture that can be improved later

This is **not** the final enterprise architecture. It is the recommended **first build** that keeps the core concept intact while making practical decisions for unclear areas.

---

## 2. Product Vision

**Suzi Chat** is a web and mobile social community platform for adults (18+) centered on:
- real-time chat rooms
- private messaging
- friends/social connection
- dating discovery
- photo sharing (Suzi Snaps)
- short videos (Reels)
- casual social games

The product style should follow a **glassmorphism / neon social UI** inspired by the provided visual direction:
- glowing glass panels
- blue / purple / pink gradient atmosphere
- soft blur and translucency
- rounded cards and buttons
- cosmic / dreamy background tone
- playful but polished look

The exact layout can evolve, but the visual language should remain consistent across web and mobile.

---

## 3. Product Principles for V1

1. **Chat-first product**  
   Chat rooms and private messaging are the center of the platform.

2. **Simple over perfect**  
   Choose the simplest implementation that works well.

3. **Shared backend**  
   Web and mobile use the same API and same realtime layer.

4. **Shared design tokens**  
   Colors, spacing, typography, icons, and component patterns should be shared across web and mobile.

5. **Safe enough for launch**  
   Include essential moderation, blocking, reporting, and admin tools from day one.

6. **Modular codebase**  
   Keep modules separate so the platform can grow later without a rewrite.

---

## 4. V1 Scope Summary

### Included in V1
- User registration and login
- 18+ age confirmation
- User profiles
- Public and private chat rooms
- User-created rooms
- Realtime text chat
- Host/moderator controls
- Friends system
- Private messaging
- Dating profiles and matching
- Suzi Snaps photo posts
- Reels short video posts
- Casual games section
- Notifications
- Multi-language ready UI with language selector
- Admin panel
- Reporting / blocking / moderation
- Web app + mobile app

### Not included in V1
- Voice chat
- Video chat
- Livestreaming
- End-to-end encryption
- Complex recommendation engine
- AI moderation pipeline
- Custom multiplayer poker engine
- Advanced analytics platform
- Full microservices architecture
- Multi-server scaling

---

## 5. Final Product Decisions for V1

These decisions resolve the earlier unclear feature areas.

### 5.1 Chat Rooms
**Decision:**
- Any registered user can create a room.
- Limit to **3 active rooms per user** in V1 to reduce spam and simplify moderation.
- Room types: **Public** or **Private**.
- Private rooms are **invite-only**.
- Rooms are **persistent**, not temporary.
- Room owner can edit room name, description, cover image, and category.
- Room categories are fixed predefined categories in V1.
- Basic room search by **name** and filter by **category**.

**Room moderation tools:**
- mute user
- remove user from room
- ban user from room
- delete room message
- assign/remove moderator

**Why this is best for V1:**
It keeps the core social idea while avoiding complex room permission systems.

### 5.2 Friends System
**Decision:**
- Use **mutual friend requests**, not follow model.
- A friendship exists only after both users accept.
- Users can unfriend at any time.
- Users can hide their online status.

**Why this is best for V1:**
It matches the “messenger-style friends list” concept better than a social follow system.

### 5.3 Direct Messaging
**Decision:**
- Direct messaging is allowed between:
  - friends
  - dating matches
- Message requests from strangers are not included in V1.
- One conversation thread per user pair.
- Message history is stored.
- Read state is supported.

**Why this is best for V1:**
This is safer, simpler, and reduces spam.

### 5.4 Dating Section
**Decision:**
- Dating is based on **profile browsing + Interested action**.
- No Tinder-style swipe system in V1.
- A **match** is created when both users mark each other as interested.
- Matched users can chat using the same private messaging system.
- Basic browse filters:
  - age range
  - gender
  - country
- Dating profile is separate from the main profile but linked to the same user account.

**Why this is best for V1:**
Simple browsing and matching is much easier to build than a swipe/recommendation engine.

### 5.5 Suzi Snaps
**Decision:**
- Snaps are **photo posts** with optional caption.
- Visibility options:
  - public
  - friends-only
- Users can like, comment, report, and delete their own posts.

**Why this is best for V1:**
Minimal social posting model, easy to understand.

### 5.6 Reels
**Decision:**
- Reels are **short videos up to 30 seconds**.
- Visibility options:
  - public
  - friends-only
- Users can like, comment, report, and delete their own reels.
- Auto-generated thumbnails are recommended.

**Why this is best for V1:**
Shorter videos reduce upload/storage complexity.

### 5.7 Games
**Decision:**
- The games section exists in V1.
- V1 will launch with these initial games:
  - Chess
  - Checkers
  - Connect 4
- These should be implemented as **simple embedded or integrated HTML5/social games**.
- Do not build a custom real-time game engine in V1.

**Why this is best for V1:**
Games are included without creating a huge engineering burden.

### 5.8 Multi-language
**Decision:**
- UI must be localization-ready from day one.
- Provide a language selector.
- Initial supported languages:
  - English
  - Irish
  - French
  - German
  - Amharic
- User-generated content is **not auto-translated** in V1.

**Why this is best for V1:**
This satisfies the requirement while keeping implementation straightforward through translation files.

### 5.9 Notifications
**Decision:**
Include simple in-app notifications and mobile push notifications for:
- friend requests
- accepted friend requests
- direct messages
- dating matches
- room invites
- likes/comments on snaps and reels

**Why this is best for V1:**
These are the core engagement triggers.

### 5.10 Privacy & Safety
**Decision:**
Each user gets simple privacy settings:
- show/hide online status
- who can view my snaps/reels: public or friends-only
- show/hide dating profile
- block user
- report user/content

**Why this is best for V1:**
Essential trust and safety without adding too many settings.

---

## 6. Recommended Tech Stack

## 6.1 Frontend Web
- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** for web UI primitives

## 6.2 Mobile
- **React Native**
- **Expo**
- **TypeScript**
- **NativeWind** for styling with shared design tokens

## 6.3 Backend
- **Node.js**
- **NestJS**
- **TypeScript**

**Reason:** NestJS gives structure, modules, DTOs, guards, and Socket.IO support while still being productive for one developer.

## 6.4 Database
- **PostgreSQL**
- **Prisma ORM**

## 6.5 Realtime
- **Socket.IO**

**Reason:** easier and faster than raw WebSockets for rooms, presence, messaging, acknowledgements, and developer productivity.

## 6.6 Authentication
- Email/password login
- **JWT access token + refresh token**
- Password hashing with **Argon2**

## 6.7 Storage
**V1 recommendation:**
- Use **local file storage** on the server or mounted volume
- Abstract storage behind a service so it can move to **S3-compatible storage later**

**Needed media handling tools:**
- **Sharp** for image resize/compression
- **FFmpeg** for video validation and thumbnail generation

## 6.8 Notifications
- In-app notifications in database
- Mobile push with **Expo Notifications**
- Email for password reset and important account events using **Resend** or **Postmark**

## 6.9 Optional but recommended
- **Redis** for:
  - rate limiting
  - caching
  - ephemeral presence data
  - future queue support

Redis is recommended but can be kept small in V1.

## 6.10 Dev & Deployment
- **Docker Compose**
- **Caddy** as reverse proxy
- **pnpm workspaces** monorepo
- **GitHub** for version control
- **GitHub Actions** for basic CI

---

## 7. Recommended Project Structure

Use a monorepo.

### Apps
- `apps/web` → Next.js user-facing web app
- `apps/mobile` → Expo React Native app
- `apps/api` → NestJS backend API + Socket.IO

### Packages
- `packages/ui-tokens` → colors, spacing, radii, typography, shadows
- `packages/types` → shared TypeScript types
- `packages/schemas` → shared validation schemas / DTO contracts
- `packages/config` → shared env and configuration helpers

**Important note:**
Shared UI should mainly mean **shared design tokens and business logic**, not forcing full component sharing across web and mobile.

---

## 8. High-Level Architecture

### V1 Architecture Style
Use a **modular monolith**.

That means:
- one backend service
- one database
- one realtime gateway
- clearly separated feature modules inside the codebase

This is the right balance for V1.

### Main Runtime Components
- Web app (Next.js)
- Mobile app (Expo)
- API service (NestJS)
- Realtime service (Socket.IO inside NestJS)
- PostgreSQL
- Redis (optional but recommended)
- Media storage on server volume
- Reverse proxy with SSL

### Deployment Model
Single Hetzner server for V1/demo:
- reverse proxy
- web app
- api app
- postgres
- redis
- upload volume

This is enough for V1 and keeps operations simple.

---

## 9. Feature Modules

## 9.1 Auth Module
Responsibilities:
- register
- login
- logout
- refresh token
- password reset
- age confirmation during signup

**V1 decision:**
- Email verification is **not mandatory at launch**.
- It can be added later as a security enhancement.

Main entities:
- user
- refresh token
- password reset token
- email verification token

## 9.2 User/Profile Module
Responsibilities:
- edit basic profile
- avatar upload
- bio
- gender
- age/date of birth
- country
- profile privacy toggles

## 9.3 Friends Module
Responsibilities:
- send friend request
- accept/reject friend request
- unfriend
- list friends
- online status view

## 9.4 Blocking Module
Responsibilities:
- block user
- unblock user
- enforce block rules across friends, chat, dating, and DM

## 9.5 Rooms Module
Responsibilities:
- create/edit/delete room
- public/private room access
- room membership
- room invite
- room categories
- room moderators
- room bans

## 9.6 Room Chat Module
Responsibilities:
- send/edit/delete room messages
- realtime room feed
- timestamps
- message delivery acknowledgement
- moderation actions on messages

## 9.7 Direct Messaging Module
Responsibilities:
- create/open conversation
- send direct messages
- read status
- notification triggers

## 9.8 Dating Module
Responsibilities:
- dating profile create/update
- browse profiles
- filters
- interest action
- match creation

## 9.9 Snaps Module
Responsibilities:
- create photo post
- list feed
- comments
- likes
- delete own post
- report content

## 9.10 Reels Module
Responsibilities:
- upload short video
- list feed
- comments
- likes
- delete own reel
- report content

## 9.11 Games Module
Responsibilities:
- game catalog
- launch game session
- friend invite to game
- basic game session/result tracking

## 9.12 Notifications Module
Responsibilities:
- in-app notification creation
- unread count
- mobile push trigger

## 9.13 Reports & Moderation Module
Responsibilities:
- report user
- report room
- report snap/reel/comment/message
- moderation review workflow
- action log

## 9.14 Admin Module
Responsibilities:
- dashboard
- users
- rooms
- reports
- posts/reels moderation
- categories/settings

---

## 10. Roles and Permissions

### 10.1 Platform Roles
- **Guest**
- **User**
- **Admin**

### 10.2 Room Roles
- **Room Owner**
- **Room Moderator**
- **Room Member**

### 10.3 Permission Rules

#### User
- manage own profile
- create rooms
- join public rooms
- request/invite to private rooms
- send friend requests
- browse dating profiles
- create snaps/reels
- play games
- block/report users

#### Room Owner
- all member permissions
- edit room
- assign moderators
- remove/ban users
- delete room messages

#### Room Moderator
- remove/ban users
- mute users
- delete room messages

#### Admin
- view and manage all users
- suspend/ban accounts
- remove content
- manage rooms
- review reports
- manage categories/basic settings

---

## 11. Database Design (Simple V1 Model)

Below is the recommended database shape. This is intentionally practical rather than overly normalized.

## 11.1 Core Tables

### users
- id
- email
- username
- password_hash
- role
- status
- date_of_birth
- is_age_confirmed
- last_seen_at
- created_at
- updated_at

### user_profiles
- user_id
- display_name
- bio
- avatar_url
- gender
- country
- language_code
- show_online_status
- created_at
- updated_at

### friend_requests
- id
- sender_id
- receiver_id
- status
- created_at

### friendships
- id
- user_one_id
- user_two_id
- created_at

### user_blocks
- id
- blocker_id
- blocked_id
- created_at

## 11.2 Rooms

### room_categories
- id
- name
- slug
- sort_order

### rooms
- id
- owner_id
- category_id
- name
- slug
- description
- visibility (public/private)
- cover_image_url
- is_active
- created_at
- updated_at

### room_members
- id
- room_id
- user_id
- role (member/moderator)
- joined_at

### room_invites
- id
- room_id
- invited_user_id
- invited_by_user_id
- status
- created_at

### room_bans
- id
- room_id
- user_id
- banned_by_user_id
- reason
- expires_at
- created_at

### room_messages
- id
- room_id
- sender_id
- message_type (text/system)
- body
- is_deleted
- created_at
- updated_at

## 11.3 Direct Messaging

### conversations
- id
- type (direct)
- created_at

### conversation_participants
- id
- conversation_id
- user_id
- joined_at

### direct_messages
- id
- conversation_id
- sender_id
- body
- is_deleted
- created_at
- updated_at

### message_reads
- id
- message_id
- user_id
- read_at

## 11.4 Dating

### dating_profiles
- id
- user_id
- headline
- bio
- gender
- interested_in
- min_age_preference
- max_age_preference
- country
- is_visible
- created_at
- updated_at

### dating_interests
- id
- sender_user_id
- target_user_id
- created_at

### dating_matches
- id
- user_one_id
- user_two_id
- matched_at

## 11.5 Content / Media

### media_assets
- id
- owner_user_id
- type (image/video)
- file_url
- thumbnail_url
- mime_type
- file_size
- width
- height
- duration_seconds
- created_at

### snap_posts
- id
- author_user_id
- media_asset_id
- caption
- visibility (public/friends)
- status
- created_at

### snap_comments
- id
- post_id
- author_user_id
- body
- status
- created_at

### snap_likes
- id
- post_id
- user_id
- created_at

### reel_posts
- id
- author_user_id
- media_asset_id
- caption
- visibility (public/friends)
- status
- created_at

### reel_comments
- id
- reel_id
- author_user_id
- body
- status
- created_at

### reel_likes
- id
- reel_id
- user_id
- created_at

## 11.6 Games

### games
- id
- name
- slug
- type
- is_enabled

### game_sessions
- id
- game_id
- created_by_user_id
- room_id nullable
- status
- result_summary
- created_at
- ended_at

### game_session_participants
- id
- session_id
- user_id
- status

## 11.7 Notifications & Moderation

### notifications
- id
- user_id
- type
- title
- body
- entity_type
- entity_id
- is_read
- created_at

### reports
- id
- reporter_user_id
- target_type
- target_id
- reason_code
- reason_text
- status
- reviewed_by_admin_id nullable
- created_at
- reviewed_at nullable

### moderation_actions
- id
- admin_user_id
- action_type
- target_type
- target_id
- notes
- created_at

---

## 12. Realtime Design

Use **Socket.IO** for the following:
- room chat messages
- direct message delivery
- typing indicators
- user presence
- join/leave room events
- unread count refresh
- notification push events in web app

### Socket namespaces / channels (simple version)
- global authenticated socket
- room channel: `room:{roomId}`
- conversation channel: `conversation:{conversationId}`
- user personal channel: `user:{userId}`

### Core realtime events
- `room.message.send`
- `room.message.new`
- `room.user.joined`
- `room.user.left`
- `conversation.message.send`
- `conversation.message.new`
- `user.presence.update`
- `notification.new`

Keep it small and event names clear.

---

## 13. API Design Approach

Use REST for most operations and Socket.IO for realtime.

### Example route groups
- `/auth/*`
- `/users/*`
- `/friends/*`
- `/rooms/*`
- `/messages/*`
- `/dating/*`
- `/snaps/*`
- `/reels/*`
- `/games/*`
- `/notifications/*`
- `/reports/*`
- `/admin/*`

### API principles
- version routes as `/v1/...`
- use DTO validation on all input
- use pagination for list endpoints
- soft-delete content where practical
- consistent error format

---

## 14. Admin Panel Specification

The admin panel should be part of the same Next.js app but protected by admin role.

### Admin sections

#### Dashboard
- total users
- active users
- room count
- snaps/reels count
- reports count
- recent signups

#### Users
- search user
- view profile
- suspend/ban user
- delete user content
- see moderation history

#### Rooms
- list rooms
- disable/delete room
- inspect room owner and moderators

#### Content Moderation
- review snaps
- review reels
- review comments
- remove content

#### Reports
- report queue
- approve/reject report
- action notes

#### Settings
- room categories
- supported games toggle
- app language list
- basic content limits

---

## 15. UI / UX Direction

### Core visual style
- glassmorphism cards
- translucent panels with blur
- neon accent colors
- rounded large buttons
- soft inner glow and outer glow
- gradient backgrounds
- white text with high contrast

### Shared design tokens
Define these centrally:
- background colors
- glass surfaces
- accent colors
- border glow colors
- spacing scale
- radius scale
- font sizes
- shadows and blur values
- icon set

### Suggested color system
- base background: deep blue / violet
- secondary background: indigo / purple
- accent pink
- accent cyan
- accent gold for category buttons
- white/off-white text

### UX recommendation
- desktop/web: dashboard style layout
- mobile: to be defined later
- for now, **web is the primary implementation focus**
- keep interactions simple and obvious

---

## 16. Security & Safety Requirements for V1

Minimum required:
- password hashing with Argon2
- JWT auth with refresh tokens
- rate limiting on auth and messaging routes
- file type and file size validation
- message/content report flow
- user blocking
- room moderation tools
- admin suspension/ban tools
- audit log for admin actions
- server-side validation on all inputs

### Recommended limits
- avatar max 5 MB
- snaps image max 10 MB
- reel video max 30 seconds
- reel max size 50 MB for V1
- room message max 1000 characters
- bio max 300 characters

---

## 17. Suggested Content & Usage Limits

These limits keep the app manageable in V1.

- max 3 active rooms per user
- max 2 moderators per room initially
- max 10 invites sent per minute per user
- max 20 friend requests per day per user
- max 5 snap uploads per day initially
- max 3 reel uploads per day initially

These can be adjusted later from admin settings.

## 17.1 Initial Room Category Setup

Room categories should be **admin-defined**.

Initial seed examples for V1:
- 30s
- 90s
- Love
- Nature
- plus other simple admin-managed categories as needed

This keeps the system flexible while avoiding complex user-generated category logic in V1.

---

## 18. Development Strategy

## Recommended build order

### Phase 0 — Project Setup
- pnpm workspaces monorepo setup
- CI setup
- environments
- database + Prisma
- NestJS skeleton
- Next.js skeleton
- shared tokens package
- auth foundation
- Caddy reverse proxy configuration
- local file storage structure

### Phase 1 — Core Accounts & Profiles
- signup/login/reset password
- profile edit
- avatar upload
- language selector foundation
- privacy settings

### Phase 2 — Chat Core
- rooms
- room membership
- room chat realtime
- private messaging
- friends system
- online presence
- notifications

### Phase 3 — Social Extensions
- dating profiles
- matching
- snaps
- reels
- comments/likes
- reporting and blocking full flow

### Phase 4 — Games & Admin
- games catalog
- 2–3 initial game integrations
- game invites/session tracking
- admin dashboard
- moderation panel

### Phase 5 — Stabilization
- bug fixing
- performance pass
- polish UI
- deployment hardening
- backup and monitoring
- mobile planning after stable web release

---

## 19. Practical Team Recommendation for One Developer + AI

To keep scope realistic:
- build backend first
- build web app second
- build mobile app on top of stable API contracts
- keep admin panel inside web app
- avoid custom game engine
- avoid custom media pipeline beyond basic processing
- avoid heavy search system in V1
- avoid recommendation algorithms in V1

### Priority mindset
The product can include all modules in V1, but each module should use the **simplest acceptable version**.

---

## 20. Suggested Delivery Milestones

### Milestone 1
Foundation working:
- auth
- profile
- backend setup
- database
- shared UI tokens

### Milestone 2
Chat working:
- room create/join
- realtime room chat
- friends
- private messaging

### Milestone 3
Social content working:
- dating
- snaps
- reels
- notifications

### Milestone 4
Control & polish:
- admin panel
- reports/moderation
- games
- deploy and QA

---

## 21. Recommended Non-Functional Requirements

- mobile-responsive web app
- acceptable performance on single server deployment
- p95 API response target under 500 ms for normal endpoints
- stable realtime delivery for active chat rooms
- clean logging
- daily database backups
- environment-based config
- image and video upload validation

---

## 22. Deployment Recommendation for V1

### Single-server Docker Compose stack
- `caddy`
- `web`
- `api`
- `postgres`
- `redis`
- `uploads-volume`

### Notes
- keep postgres data on persistent volume
- keep uploads on mounted local storage
- abstract file storage for later migration to S3-compatible object storage
- enable SSL
- enable automated restart policies
- use `.env` files per environment
- set up scheduled DB backup

## 23. Final Recommendation Summary

### Best architecture for V1
- **Modular monolith**
- **Next.js + React** for web
- **React Native + Expo** for mobile
- **NestJS + Socket.IO** for backend/realtime
- **PostgreSQL + Prisma** for data
- **Docker Compose on one Hetzner server** for initial deployment

### Best product decisions for V1
- mutual friends
- private rooms are invite-only
- DM only for friends and dating matches
- dating uses browsing + mutual interest, not swipes
- snaps = photo posts
- reels = short videos up to 30 seconds
- games = simple embedded integrations, not custom engine
- English-first, localization-ready
- essential notifications, blocking, reporting, and admin moderation included

This is the recommended starting point because it is simple enough to build with one developer and AI assistance, but complete enough to launch and test the full concept.

---

## 24. Approved Technical Decisions

The following decisions are now approved for V1:

1. **Monorepo tool:** pnpm workspaces
2. **Reverse proxy:** Caddy
3. **File storage for V1:** local file storage
4. **Future file storage direction:** S3-compatible storage later
5. **Initial supported languages:** English, Irish, French, German, Amharic
6. **Initial launch games:** Chess, Checkers, Connect 4
7. **Initial room category approach:** admin-defined categories with seed examples such as 30s, 90s, Love, Nature
8. **Email verification at launch:** not mandatory
9. **Primary implementation focus right now:** web first

These decisions further simplify the V1 build and keep the project aligned with a one-developer + AI-assisted implementation model.

