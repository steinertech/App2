# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SPA application deployed as two independent Vercel projects:
- `App.Web` — React SPA frontend (Vite)
- `App.Server` — TypeScript backend deployed as Vercel serverless functions (no bundler; each file under `api/` is deployed as-is)

## Commands

### App.Web
```
cd App.Web
npm install
npm run dev       # start Vite dev server
npm run build     # tsc && vite build
npm run preview   # preview the production build
```

### App.Server
```
cd App.Server
npm install
```
There is no build/dev/test/lint script for `App.Server` — files under `api/` are deployed directly by Vercel as serverless functions. Requires a `MONGODB_URI` environment variable at runtime (see `util/util-db.ts`).

There is no test suite or linter configured in this repository.

## Architecture

### Two separately deployed apps, stitched together via rewrites
`App.Web` and `App.Server` are deployed as separate Vercel projects and glued together purely through `vercel.json` rewrites:
- `App.Web/vercel.json` rewrites `/api/*` to the deployed `App.Server` URL, and everything else to `/index.html` (SPA fallback).
- `App.Server/vercel.json` rewrites `/` to `/api`.

Vite only builds `App.Web`; `App.Server` has no build step. `App.Server/package.json` declares `"type": "module"`, and every relative import in `App.Server` uses an explicit `.ts` extension (e.g. `from '../util/util-main.ts'`) — Vercel runs these files as-is with Node's own ESM resolver, which (unlike CommonJS) never guesses file extensions, so an extensionless relative import fails at runtime with `ERR_MODULE_NOT_FOUND`. Any new file added under `App.Server` must follow this convention.

### App.Server endpoint pattern
Every file in `App.Server/api/` is a standalone Vercel function exporting `{ fetch(request: Request) }`, mapped by filename to `/api/<filename>` (e.g. `api/user-login.ts` → `/api/user-login`). Each handler:
1. Handles `OPTIONS` by returning 204 with `corsHeaders(request)`.
2. Delegates business logic to a function in `App.Server/util/`.
3. Returns a JSON `Response` with `corsHeaders(request)` merged into the headers.

Shared logic lives in `App.Server/util/` (not directly in `api/`):
- `util-main.ts` — `VERSION_SERVER`, `domainName(request)`, `sectorKey(request, isProject)`, `corsHeaders(request)`
- `util-db.ts` — the shared MongoDB `client` (via `@vercel/functions` `attachDatabasePool`)
- `util-user.ts` — user register/login/session/logout
- `util-storage.ts` — blob upload/download via `@vercel/blob`

DTOs (in `App.Server/dto/`) are plain interfaces, not classes. `App.Web` and `App.Server` share the same git repo, so DTOs that don't carry Node-only fields (no `ObjectId`) are imported directly by `App.Web` via a relative path (`import type { GridDto } from '../../../App.Server/dto/grid-dto.ts'`) instead of being duplicated. DTOs carrying `ObjectId` (`ProjectDto`, `SessionDto`, `UserDto`) aren't import-compatible as-is — `ObjectId` isn't installed in `App.Web` and serializes to a plain string over JSON anyway — so those still need a client-side derived/subset type. Because `App.Server` is an ES module (see above), `App.Web` can also import real (value) exports from `App.Server/dto/*.ts` — e.g. `import { GridCellEnum } from '../../../App.Server/dto/grid-dto.ts'` — not just types.

### Single-collection MongoDB pattern
All DTOs (`UserDto`, `SessionDto`, `ProjectDto`, ...) are stored in one MongoDB collection (`'myCollection'`), disambiguated by a `type` field (e.g. `type: 'UserDto'`) and scoped by a `sectorKey` field. Adding a new entity means adding a new DTO interface plus a `type` discriminator, not a new collection.

### sectorKey scoping
`sectorKey(request, isProject)` in `util-main.ts` builds the key documents are scoped/queried by:
- `Domain/<domainName>/Global/` when `isProject` is `false` (e.g. users, projects — looked up by domain, no login required)
- `Domain/<domainName>/Project/<projectName>/` when `isProject` is `true` (e.g. files inside a project) — this branch also asserts the caller has a valid session (throws `'User not logged in!'` if not), so `isProject: true` is how login is enforced for a query.

Always build sector keys through `sectorKey(...)` rather than constructing the `Domain/.../Global|Project/` string manually.

### Session handling
Login (`api/user-login.ts` → `userLogin`) sets an httpOnly `sessionId` cookie. `userSession(request)` (in `util-user.ts`) reads that cookie and looks up the matching `SessionDto` with `isLogin: true`. `userLogout` flips `isLogin` to `false` rather than deleting the session document.

### App.Web routing and page structure
`App.Web/src/main.tsx` defines all routes with `react-router-dom`'s `<Routes>`/`<Route>`, wrapped in a shared `<Layout>` (`Nav` + `UserSession` bar + `<Outlet>`). Any component mounted at a route `path` lives in `App.Web/src/page/`; shared/non-routed components (`Layout.tsx`, `Nav.tsx`, `Grid.tsx`, `UserSession.tsx`) stay directly in `App.Web/src/`. `apiUrl` (the `/api/` prefix used for all backend calls) is exported from `src/page/App.tsx`.

`UserSession.tsx` polls `/api/user-session` on mount and exposes `refreshUserSession()`, which dispatches a window event other components (e.g. after login/logout) use to force it to re-fetch.
