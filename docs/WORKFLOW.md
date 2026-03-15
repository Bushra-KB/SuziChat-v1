# WORKFLOW.md

## Purpose
This document defines the development workflow for Suzi Chat.

The project will be developed by one developer with AI assistance. The workflow must stay disciplined, safe, and simple. The goal is to avoid chaotic AI-generated changes, protect deployment stability, and keep progress incremental and reviewable.

---

## Core Workflow Principles

1. **One small task at a time**  
   Every task should be small enough to understand, implement, test, and review clearly.

2. **AI must guide step by step**  
   The AI should give one instruction at a time. After each instruction, the developer runs it manually and returns the result/output/error.

3. **No uncontrolled code changes**  
   AI must not make code changes unless a specific task is approved.

4. **Never work directly on main for feature implementation**  
   Every feature/fix/chore must use a dedicated branch.

5. **Protect persistent data**  
   Deployment must not destroy database data, uploads, environment files, or server configuration.

6. **Keep changes small and merge often**  
   Small safe merges are preferred over large risky branches.

---

## Working Style With AI (Codex in VS Code)

### Required AI behavior
The AI should:
- give only one instruction at a time
- explain briefly why the step matters
- wait for the output before moving on
- ask for approval before editing code
- ask for approval before changing server config
- clearly separate local commands from server commands
- prefer the simplest practical implementation

### The AI should not:
- run ahead across multiple steps
- make hidden assumptions
- auto-refactor large areas without approval
- propose destructive deployment/database actions casually
- skip validation/testing

### Standard response format for AI

```text
STEP X: <short title>

WHY:
<brief explanation>

DO THIS:
<one action or one command>

EXPECTED RESULT:
<what should happen>

WAIT FOR ME.
```

If there is an error:

```text
WHAT HAPPENED:
<brief diagnosis>

DO THIS NEXT:
<one action only>

EXPECTED RESULT:
<what should happen>

WAIT FOR ME.
```

---

## Development Phases

### Phase 0 — Foundation
- local prerequisites check
- create local project folder
- initialize pnpm workspace monorepo
- initialize git
- create GitHub private repo
- create base docs
- set .gitignore
- define env strategy

### Phase 1 — Local App Foundation
- create Next.js web app
- create NestJS API app
- create shared packages
- Docker Compose for local development
- PostgreSQL and Prisma setup
- base auth structure

### Phase 2 — Deployment Foundation
- secure and configure Hetzner server
- install Docker and Docker Compose support
- configure Caddy
- connect domain
- enable SSL
- establish safe deployment process

### Phase 3 — Feature Delivery
Build V1 feature-by-feature in small branches.

### Phase 4 — Stabilization
- QA
- bug fixes
- performance cleanup
- deployment hardening
- backup checks
- responsive polish

---

## Branching Strategy

### Main rule
Do not develop features directly on `main`.

### Branch naming conventions
Use clear prefixes:
- `feat/...` for new features
- `fix/...` for bug fixes
- `chore/...` for setup or maintenance
- `docs/...` for documentation only

### Examples
- `chore/monorepo-init`
- `feat/web-shell`
- `feat/auth-foundation`
- `feat/rooms-module`
- `feat/friends-system`
- `fix/login-validation`
- `docs/project-docs`

### Branch workflow
1. define the scope of the task
2. create a branch
3. implement only that scope
4. test locally
5. commit small logical changes
6. push to remote
7. merge to main
8. deploy safely from main

---

## Task Execution Workflow

For every task, follow this sequence:

### 1. Clarify scope
Define exactly what is included and excluded.

### 2. Propose branch name
Before coding, propose the branch name.

### 3. Create branch
Create the feature/fix/chore branch locally.

### 4. Implement approved small scope
Only change files needed for the approved task.

### 5. Validate locally
At minimum:
- app runs
- no obvious errors
- type check/build passes when relevant

### 6. Review changed files
Understand exactly what changed before commit.

### 7. Commit
Use a small meaningful commit.

### 8. Push
Push branch to GitHub private repo.

### 9. Merge
Merge into `main` after validation.

### 10. Deploy safely
Deploy the updated application without destroying data.

---

## Commit Strategy

### Commit principles
- small
- meaningful
- scoped
- readable later

### Recommended commit style
Conventional-style commits are preferred:
- `feat: initialize pnpm workspace monorepo`
- `feat: add responsive app shell`
- `feat: add auth module skeleton`
- `fix: correct login form validation`
- `chore: add docker compose for local dev`
- `docs: add architecture and workflow docs`

Avoid giant “misc updates” commits.

---

## GitHub Workflow

### Repository rules
- private repo on personal account
- main branch is deployable branch
- feature work happens on separate branches

### Recommended GitHub flow
1. create local branch
2. implement task
3. push branch
4. review diff
5. merge into main
6. pull latest main locally if needed
7. deploy main to server

---

## Deployment Workflow

## Deployment principles
- deployment must be repeatable
- deployment must preserve persistent data
- deployment should be low-risk and reversible where possible
- code updates must be separated from persistent volumes and config

### Must preserve
- PostgreSQL data
- uploaded files
- `.env` files
- Caddy/server config

### Deployment target
Single Hetzner server using Docker Compose.

### Recommended deployment flow
1. confirm working code on `main`
2. confirm database migration status
3. connect to server
4. update project code on server
5. rebuild/restart only required services
6. run safe migrations if needed
7. verify app health
8. verify database and uploads still intact

### Important deployment rule
Never use destructive commands that remove volumes or wipe data unless explicitly planned and confirmed.

Examples of things to treat carefully:
- removing compose volumes
- resetting database
- deleting uploads directory
- replacing `.env`
- replacing Caddy config without backup

---

## Environment and Config Workflow

### Environment rules
- keep secrets out of git
- use `.env` files per environment
- document required env variables
- never overwrite production env casually

### Suggested env separation
- local development env
- production env on server

### Important rule
Application code can be redeployed.
Production configuration must be preserved.

---

## Database Workflow

### Rules
- use Prisma migrations carefully
- review schema changes before applying
- understand impact before production migration
- do not drop data casually

### Safe database approach
- create migration locally
- test locally
- commit migration files
- run migration on server during deploy only when ready

### Important rule
Any risky migration must be clearly called out before running in production.

---

## Local vs Server Command Discipline

Every instruction from AI should clearly state whether the action is:
- **local machine command**, or
- **server command**

Never mix them ambiguously.

This reduces deployment mistakes.

---

## Review Checklist Before Merge

Before merging a branch into `main`, confirm:
- scope is complete
- no unrelated changes included
- app still runs
- key checks pass
- secrets were not committed
- changed files are understood
- commit message is clear

---

## Review Checklist Before Deploy

Before deploying to server, confirm:
- correct branch is merged to `main`
- production env exists and is untouched
- database migration is understood
- uploads path is persistent
- postgres data is persistent
- compose file changes are reviewed
- rollback or recovery thinking exists if needed

---

## Suggested Initial Delivery Order

Recommended order of implementation:

1. docs and workflow
2. monorepo initialization
3. git/github setup
4. web app skeleton
5. backend skeleton
6. local docker compose
7. postgres + prisma
8. auth foundation
9. server setup
10. first deployment
11. feature-by-feature delivery

This keeps the project grounded and deployable from early on.

---

## V1 Feature Delivery Recommendation

After foundation work, implement features in this rough order:

1. auth + profile
2. app shell + navigation
3. rooms + room list UI
4. room chat realtime
5. friends system
6. direct messaging
7. notifications
8. dating
9. snaps
10. reels
11. admin panel basics
12. moderation/reporting
13. games
14. polish and optimization

---

## Definition of Done for a Small Task

A task is done when:
- scope is implemented
- local validation completed
- changes reviewed
- commit created
- branch pushed
- ready to merge or merged intentionally
- deployment impact understood

---

## Final Workflow Summary

Suzi Chat development should follow a disciplined AI-assisted workflow:
- one instruction at a time
- one small task at a time
- one branch per scoped change
- safe merge to main
- safe deployment without data loss

This workflow is mandatory because the project is being built with one developer and AI assistance, and long-term maintainability depends on staying structured from the beginning.

