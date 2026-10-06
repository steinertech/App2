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
pnpm install
pnpm run dev       # start Vite dev server
pnpm run build     # tsc && vite build
pnpm run preview   # preview the production build
```

### App.Server
```
cd App.Server
pnpm install
```
There is no build/dev/test/lint script for `App.Server` — files under `api/` are deployed directly by Vercel as serverless functions. Requires a `MONGODB_URI` environment variable at runtime (see `util/util-db.ts`). A `tsconfig.json` (with `@types/node`) is present purely for editor/type-checking support — run `pnpm exec tsc --noEmit` to typecheck the package; it is not part of the deploy or any pnpm script.

`App.Server/package.json` has `"type": "module"`, and Node's ESM resolver (unlike CommonJS) doesn't guess file extensions, so **every relative import in `App.Server` must include an explicit `.js` extension** (e.g. `import { corsHeaders } from '../util/util-main.js';`), even though the source files are `.ts`. Omitting the extension breaks at runtime with `ERR_MODULE_NOT_FOUND` since there is no build step to catch it beforehand.

There is no test suite or linter configured in this repository.

## Architecture

### Two separately deployed apps, stitched together via rewrites
`App.Web` and `App.Server` are deployed as separate Vercel projects and glued together purely through `vercel.json` rewrites:
- `App.Web/vercel.json` rewrites `/api/*` to the deployed `App.Server` URL, and everything else to `/index.html` (SPA fallback).
- `App.Server/vercel.json` rewrites `/` to `/api`.

Vite only builds `App.Web`; `App.Server` has no build step.

### App.Server endpoint pattern
Every file in `App.Server/api/` is a standalone Vercel function, mapped by filename to `/api/<filename>` (e.g. `api/user.ts` → `/api/user`). Each file's default export is `apiHandler(method, handler)` from `util-main.ts` (it returns the `{ fetch(request) }` object Vercel expects):
1. `method` is the single HTTP method the endpoint accepts: `'POST'` for every endpoint except `api/version.ts` and `api/index.ts` (the plain-text page at the server root), which are `'GET'`. `apiHandler` answers `OPTIONS` with 204, rejects any other method with 405 (plus an `Allow` header), and merges `corsHeaders(request, method)` into every response — handlers never deal with OPTIONS or CORS themselves. If `handler` throws, `apiHandler` logs the error, queues its message as an `AlertEnum.Error` alert and returns a 500 (so a plain `throw new Error('...')` reaches the user as an alert).
2. `handler` delegates business logic to a function in `App.Server/util/`.
3. `handler` returns its result via `jsonResponse(body, status?, headers?)`.

Shared logic lives in `App.Server/util/` (not directly in `api/`):
- `util-main.ts` — `VERSION_SERVER`, `domainName(request)`, `sectorKey(request, isProject)`, `corsHeaders(request, method)`, `jsonResponse(...)`, `apiHandler(method, handler)`, `alertAdd(request, alertEnum, text)`
- `util-db.ts` — the shared MongoDB `client` (via `@vercel/functions` `attachDatabasePool`)
- `util-user.ts` — user sign-up/sign-in/session/sign-out
- `util-storage.ts` — blob upload/download via `@vercel/blob` (blob paths are prefixed with `sectorKey(request, true)`)
- `util-grid.ts` — shared grid helpers plus the plane registry (`PLANE_GRID_LOADERS`, `PLANE_LOADERS`, `PLANE_GRID_PATCHERS`) behind `api/grid-load.ts` / `api/grid-patch.ts`

Grid-specific logic lives in `App.Server/grid/` — one file per main grid served to App.Web (`grid-project.ts`, `grid-user.ts`, `grid-storage.ts`, the latter including the Image Preview grid). New grids go here and are registered in `util/util-grid.ts`.

DTOs (plain interfaces, not classes) live under `App.Server/dto/`, split by whether `App.Web` uses them:
- `App.Server/dto/shared/` — DTOs used by both `App.Server` and `App.Web` (must have no Node-only fields such as `ObjectId`). `App.Web` and `App.Server` share the same git repo, so these are imported directly by `App.Web` via a relative path (`import type { GridDto } from '../../../App.Server/dto/shared/grid-dto.ts'`) instead of being duplicated.
- `App.Server/dto/` (top level) — backend-only DTOs (`ProjectDto`, `SessionDto`, `UserDto`, `GridConfigDto`, `StorageFileDto`). `App.Web` never imports from here — those carrying `ObjectId` couldn't be imported anyway, since `ObjectId` isn't installed in `App.Web` (and serializes to a plain string over JSON). They reach the frontend only indirectly, e.g. converted into a `GridDto` by `util-grid.ts`.

New DTOs go in `dto/shared/` only if `App.Web` actually imports them (and they have no `ObjectId` or other Node-only field); otherwise directly in `dto/`.

### App version
The app version is stored in two places: `VERSION_CLIENT` in `App.Web/src/util/util-main.ts` and `VERSION_SERVER` in `App.Server/util/util-main.ts`. **Both values must always be identical** — whenever one is bumped, bump the other to the same value in the same change. (`App.Web/src/page/About.tsx` displays both side by side.)

### Single-collection MongoDB pattern
All persisted DTOs (`UserDto`, `SessionDto`, `ProjectDto` — the ones with `_id`/`type` fields; not e.g. `GridConfigDto` or `StorageFileDto`) are stored in one MongoDB collection (`'myCollection'`), disambiguated by a `type` field (e.g. `type: 'UserDto'`) and scoped by a `sectorKey` field. Adding a new entity means adding a new DTO interface plus a `type` discriminator, not a new collection.

### sectorKey scoping
`sectorKey(request, isProject)` in `util-main.ts` builds the key used for both persistence layers:
- **MongoDB** — stored in each document's `sectorKey` field and used as a query filter (`util-user.ts`, `util-project.ts`; currently always `isProject: false`).
- **Blob storage** — used as the path prefix for every blob (`util-storage.ts` builds `sectorKey(request, true) + path`), so files live under `Domain/<domainName>/Project/<projectName>/...`.

The key takes one of two forms:
- `Domain/<domainName>/Global/` when `isProject` is `false` (e.g. users, projects — looked up by domain, no sign-in required)
- `Domain/<domainName>/Project/<projectName>/` when `isProject` is `true` (e.g. blob files inside a project) — this branch also asserts the caller has a valid session (throws `'User not signed in!'` if not, after `redirectSet(request, '/sign-in')`) and a selected project (`<projectName>` is the session's `projectName`, which mirrors `UserDto.projectName`; throws `'User has no project selected!'` if unset), so `isProject: true` is how sign-in is enforced for a query or blob access.

Always build sector keys through `sectorKey(...)` rather than constructing the `Domain/.../Global|Project/` string manually.

### Alert messages
Any backend code with access to the `request` can call `alertAdd(request, AlertEnum.Success | Info | Warning | Error, text)` (`util-main.ts`; `AlertEnum`/`AlertDto` in `dto/shared/alert-dto.ts`). `apiHandler` sends the queued alerts in the `x-alert-list` response header (`ALERT_HEADER`, URI-encoded JSON `AlertDto[]`), so response bodies are unaffected. On App.Web, `apiFetch` (`src/util/util-main.ts`) reads that header and calls `addAlert(...)`; `NavState` shows the top alert with a close button (`removeAlert()`) and a count of open alerts. Frontend-only alerts can be added with `addAlert(...)` directly.

### Redirect url
The same way, backend code can call `redirectSet(request, url)` (`util-main.ts`) to make App.Web navigate after the call. Only ONE url per request (a later call overwrites an earlier one); `url` is a language neutral App.Web path such as `'/'`. `apiHandler` sends it in the `x-redirect-url` response header (`REDIRECT_HEADER` in `dto/shared/redirect-dto.ts`, URI-encoded). `apiFetch` reads it and calls `redirect(url)`, which dispatches a window event; `NavState` (inside the router) navigates there, adding the current language prefix (`/de`). Used e.g. after a successful SignIn to go to the Home page.

### Session handling
All user calls go through a single endpoint, `api/user.ts` (`/api/user`): App.Web always sends a `POST` with a `UserRequestDto` whose `requestEnum` (`UserRequestEnum` in `dto/shared/user-request-dto.ts`: `SignUp`, `SignIn`, `SignOut`, `Session`) selects the operation; `None` or an unknown value returns 400. App.Web calls it through `userRequest(dto)` in `NavState.tsx`. Responses (`UserResponseDto`) never include `sessionId`.

SignIn (`UserRequestEnum.SignIn` → `signIn`) sets an httpOnly `sessionId` cookie. `userSession(request)` (in `util-user.ts`) reads that cookie and looks up the matching `SessionDto` with `isSignIn: true`. `signOut` flips `isSignIn` to `false` rather than deleting the session document.

### App.Web routing and page structure
`App.Web/src/main.tsx` defines all routes with `react-router-dom`'s `<Routes>`/`<Route>`, wrapped in a shared `<Layout>` (`Nav` + `NavState` bar + `<Outlet>`). Any component mounted at a route `path` lives in `App.Web/src/page/`; shared/non-routed components (`Layout.tsx`, `Nav.tsx`, `Grid.tsx`, `NavState.tsx`) stay directly in `App.Web/src/`. `apiUrl` (the `/api/` prefix used for all backend calls) is exported from `src/page/App.tsx`.

`main.tsx` renders in `<StrictMode>`, which runs every effect twice in dev. A page that calls the backend on mount (e.g. `load('storage')`, sign-out) uses `useEffectOnce(effect, deps)` (`src/util/util-main.ts`) instead of `useEffect`, so the call is sent once per distinct `deps` values.

`NavState.tsx` polls `/api/user` (`UserRequestEnum.Session`) on mount and exposes `refreshNavState()`, which dispatches a window event other components (e.g. after sign-in/sign-out) use to force it to re-fetch. It also shares the signed-in state via `getIsSignIn()` + `SIGN_IN_EVENT`; `Nav` uses it to show "Sign Out" only when signed in and "Sign In" only when not (Sign Up is linked from the Sign In page, not the navbar).
