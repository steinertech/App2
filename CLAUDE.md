# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. More detail loads from `App.Server/CLAUDE.md`, `App.Server/plane/CLAUDE.md` (planes, grids, Design, Content) and `App.Web/CLAUDE.md` when working in those folders.

## Project
SPA deployed as two independent Vercel projects in one git repo:
- `App.Web` — React SPA (Vite, pnpm).
- `App.Server` — TypeScript backend as Vercel serverless functions: no bundler or build step; each file under `api/` is deployed as-is and mapped to `/api/<filename>`.

They are glued together only by `vercel.json` rewrites: `App.Web/vercel.json` rewrites `/api/*` to the deployed `App.Server` URL and everything else to `/index.html`; `App.Server/vercel.json` rewrites `/` to `/api`.

## Commands and gotchas
- No test suite or linter. Typecheck App.Server with `cd App.Server && pnpm exec tsc --noEmit` (not part of any script or the deploy); App.Web with `pnpm run build` (`tsc && vite build`).
- App.Server needs a `MONGODB_URI` env var at runtime.
- `App.Server/package.json` is `"type": "module"` with no build step, so **every relative import in `App.Server` must include an explicit `.js` extension** (`import { corsHeaders } from '../util/core/util-main.js';`) even though sources are `.ts`. Omitting it breaks at runtime with `ERR_MODULE_NOT_FOUND`.
- **App version**: `VERSION_CLIENT` (`App.Web/src/util/util-main.ts`) and `VERSION_SERVER` (`App.Server/util/core/util-main.ts`) must always be identical — bump both in the same change.

## Backend conventions
- Every `api/*.ts` default-exports `apiHandler(method, handler)` (`util/core/util-main.ts`), which handles OPTIONS/CORS/405, parses the `ApiRequestDto` body and wraps results in `ApiResponseDto`. Handlers read input with `requestData<T>(request)` (never `request.json()`), return `jsonResponse(...)`, and delegate to a `<name>Api` in `util/api/`. A thrown `Error` reaches the user as an Error alert (500).
- Shared logic lives in `App.Server/util/` (`core/` infrastructure, `db/` per-entity data access, `api/` entry points), never directly in `api/`. Plane logic lives in `App.Server/plane/`.
- Alerts: `alertAdd(request, AlertEnum.X, text)`; redirect after the call: `redirectSet(request, url)` (one url per request, language-neutral App.Web path).

## Data conventions
- **Single MongoDB collection** `'myCollection'`: every persisted DTO extends `DbDto` (`_id`, `sectorKey`, `type`, `name`) and is disambiguated by `type` (the DTO interface name). A new entity = a new DTO interface + `type`, never a new collection. `name` is unique per `sectorKey` (unique index `{ sectorKey: 1, name: 1 }`); every derived DTO redeclares `name` with a comment on how it is built.
- Backend-built names are paths of description/value pairs, each followed by `/` (e.g. `ContentName/A/BandName/Header/`); a name built on another name appends further pairs, so it must end with `/`; a user-entered name embedded in a path gets its own segment (`Name/<name>/`).
- `DynamicDto` keeps user-defined column values in `values`, apart from its static fields; grids read/write them through `GridConfigColumnDto.rowToValue`/`rowValueSet`.
- Always `client.db(DB_NAME)`, never `client.db()` (that would use the `MONGODB_URI` path or `test`). Go through the `db*` helpers of `util/core/util-db.ts`.
- **Never build sector keys by hand**: use `sectorKeyDb`/`sectorKeyProjectDb` (MongoDB) or `sectorKeyStorage`/`sectorKeyProjectStorage` (blobs). The project variants enforce sign-in and a selected project.
- **DTO placement**: `App.Server/dto/shared/` only for DTOs App.Web imports (no `ObjectId` or Node-only fields; App.Web imports them by relative path, e.g. `../../../App.Server/dto/shared/grid-dto.ts`); `dto/db/` for `DbDto` types; otherwise `dto/` top level. App.Web never imports from `dto/db/` or `dto/`.

## Frontend conventions
- Routed components go in `App.Web/src/page/`; shared components stay in `App.Web/src/`.
- Call the backend only via `apiFetch` (`src/util/util-main.ts`); use `useEffectOnce` instead of `useEffect` for backend calls on mount (StrictMode).
- Reuse the Tailwind class constants in `src/style.ts`; in grid toolbars only the main action uses a primary button class.
