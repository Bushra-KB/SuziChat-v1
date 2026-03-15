# PROJECT_SPEC.md

## Project
**Suzi Chat**

## Purpose
Suzi Chat is a web-first social community platform for adults (18+) centered on real-time chat, private messaging, friends, dating, photo/video sharing, and casual social games. The first delivery target is a responsive web application. Mobile app development will come later, after the web platform is stable.

This document is the practical product specification for implementation with one developer and AI assistance.

---

## Product Direction
Suzi Chat should feel:
- social
- modern
- playful
- visually rich
- simple to use
- fast to iterate

The design direction should follow a **glassmorphism / neon social UI** style:
- translucent glass panels
- blue / purple / pink gradient atmosphere
- glow accents
- rounded cards and buttons
- soft blur
- futuristic but friendly feel

The visual reference provided is only a style direction, not a final layout.

---

## V1 Product Scope

### Included in V1
- User registration and login
- Password reset
- 18+ age confirmation during signup
- Basic user profile
- Public chat rooms
- Private chat rooms
- User-created chat rooms
- Room moderation tools
- Realtime room chat
- Friends system
- Private messaging
- Dating profiles and mutual interest matching
- Suzi Snaps photo posts
- Reels short video posts
- Games section
- Notifications
- Admin panel
- Reporting, blocking, moderation
- Localization-ready UI
- Responsive web app

### Not Included in V1
- Mobile app implementation
- Voice chat
- Video chat
- Livestreaming
- AI recommendation engine
- AI moderation system
- End-to-end encryption
- Microservices architecture
- Advanced analytics
- Custom game engine

---

## Core Product Decisions

### 1. Web-first approach
V1 focuses on the responsive web application only.
Mobile app will be built later using the same backend and shared product rules.

### 2. One shared backend
Web and future mobile must use the same API and realtime system.

### 3. One admin panel
The admin panel will live inside the web application and be protected by admin role.

### 4. Simplicity first
The first version should use the simplest practical implementation for every feature.

### 5. Safe enough for launch
Essential moderation, reporting, and blocking are part of V1.

---

## Feature Decisions for V1

## Authentication
- Email + password signup
- Login/logout
- Password reset
- JWT-based auth with refresh token support
- Email verification is **not mandatory** at launch
- 18+ checkbox/confirmation at signup

## User Profiles
- Username
- Display name
- Avatar
- Bio
- Gender
- Country
- Preferred language
- Privacy settings

## Friends
- Mutual friend request model
- No follower/following model in V1
- Users can accept/reject requests
- Users can unfriend
- Users can hide online status

## Direct Messaging
- DM allowed only between:
  - friends
  - dating matches
- Message history stored
- Read state supported
- One conversation per pair of users

## Chat Rooms
- Any registered user can create a room
- Max 3 active rooms per user initially
- Room types:
  - public
  - private
- Private rooms are invite-only
- Rooms are persistent
- Search by room name
- Categories are admin-defined
- Initial category examples:
  - 30s
  - 90s
  - Love
  - Nature

## Room Moderation
Room owner and moderators can:
- mute users
- remove users
- ban users
- delete room messages
- assign/remove moderators

## Dating
- Separate dating profile linked to the same account
- Browse + mutual interest model
- No swipe system in V1
- A match is created when both users express interest
- Matched users can use normal private messaging
- Basic filters:
  - age range
  - gender
  - country

## Suzi Snaps
- Photo posts with optional caption
- Visibility:
  - public
  - friends-only
- Like
- Comment
- Report
- Delete own post

## Reels
- Short video posts up to 30 seconds
- Visibility:
  - public
  - friends-only
- Like
- Comment
- Report
- Delete own reel

## Games
Initial launch games:
- Chess
- Checkers
- Connect 4

Games should be integrated using simple embedded/external or lightweight internal approaches.
Do not build a custom realtime game engine in V1.

## Notifications
Include in-app notifications for:
- friend requests
- accepted requests
- direct messages
- room invites
- dating matches
- likes/comments on snaps and reels

## Moderation & Safety
- Block user
- Report user
- Report room
- Report message
- Report post/reel/comment
- Admin review queue
- Admin moderation actions

## Localization
Initial supported UI languages:
- English
- Irish
- French
- German
- Amharic

User-generated content will not be auto-translated in V1.

---

## Roles

### Platform Roles
- Guest
- User
- Admin

### Room Roles
- Room Owner
- Room Moderator
- Room Member

---

## Admin Panel Scope

### Dashboard
- total users
- active users
- rooms count
- content count
- reports count

### User Management
- search users
- suspend/ban users
- inspect profiles
- inspect moderation history

### Room Management
- view rooms
- disable/delete rooms
- inspect room owners/moderators

### Content Moderation
- review snaps
- review reels
- review comments
- remove content

### Reports
- report queue
- review and resolve reports
- moderation notes

### Basic Settings
- room categories
- content limits
- game toggles
- supported language list

---

## Product Limits for V1
- Max 3 active rooms per user
- Max 2 moderators per room initially
- Max 20 friend requests per day per user
- Max 5 snap uploads per day initially
- Max 3 reel uploads per day initially
- Room messages max 1000 characters
- Reels max 30 seconds

These limits can be adjusted later.

---

## Success Criteria for V1
V1 is considered successful when:
- users can register and log in
- users can create/join rooms and chat in realtime
- users can send friend requests and private messages
- dating matching works
- users can post snaps and reels
- admin can moderate users and content
- the platform is responsive and usable on desktop and mobile browsers
- deployment is stable on a single Hetzner server

---

## V1 Build Philosophy
This project should be implemented as:
- simple
- modular
- readable
- maintainable
- safe for iterative deployment
- suitable for one developer with AI support

Avoid overengineering. Build the full concept in its simplest practical form first, then optimize later.

