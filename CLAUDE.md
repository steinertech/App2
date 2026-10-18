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
1. `method` is the single HTTP method the endpoint accepts: `'POST'` for every endpoint except `api/index.ts` (the plain-text page at the server root), which is `'GET'`. A POST body is always an `ApiRequestDto<T>` (`dto/shared/api-request-dto.ts`: `{ data, versionClient?, language?, requestCount? }`; App.Web's `apiFetch` increases `requestCount` by 1 on every call), parsed once by `apiHandler` (bad JSON → 500); handlers read their own request DTO with `requestData<T>(request)` and never call `request.json()`, and the language with `requestLanguage(request)` (falls back to `Accept-Language`). If `versionClient` differs from `VERSION_SERVER` (e.g. during a deploy of only one of the two apps), `apiHandler` adds a Warning alert asking to reload the page. The session cookie and `Origin`/`Referer` (`domainName`, `sectorKey`) deliberately stay outside the body. `apiHandler` answers `OPTIONS` with 204, rejects any other method with 405 (plus an `Allow` header), and merges `corsHeaders(request, method)` into every response — handlers never deal with OPTIONS or CORS themselves. If `handler` throws, `apiHandler` logs the error, queues its message as an `AlertEnum.Error` alert and returns a 500 with `data: null` (so a plain `throw new Error('...')` reaches the user as an alert).
2. `handler` delegates business logic to a function in `App.Server/util/`.
3. `handler` returns its result via `jsonResponse(data, status?, headers?)`, which returns a plain `ApiResult` (not a `Response`); `apiHandler` sends it as an `ApiResponseDto<T>` (`dto/shared/api-response-dto.ts`: `{ data, alerts?, redirectUrl?, responseCount? }`, `responseCount` being the request's `requestCount`), the envelope of every JSON response. A handler returning a plain `Response` (only `api/index.ts`, plain text) is sent as is, without alerts or redirect url.

Shared logic lives in `App.Server/util/` (not directly in `api/`):
- `util-main.ts` — `VERSION_SERVER`, `domainName(request)`, `sectorKey(request, isProject)`, `corsHeaders(request, method)`, `jsonResponse(...)`/`ApiResult`, `apiHandler(method, handler)`, `alertAdd(request, alertEnum, text)`, `redirectSet(request, url)`
- `util-db.ts` — the shared MongoDB `client` (via `@vercel/functions` `attachDatabasePool`)
- `util-user.ts` — user sign-up/sign-in/session/sign-out
- `util-debug.ts` — `DebugDto` load/insert/update/delete (`dto/debug-dto.ts`)
- `util-debug-property.ts` — `DebugContentDto` load/insert/update/delete and `DebugPropertyDto` load/insert/update (`dto/debug-property-dto.ts`)
- `util-property.ts` — generic `PropertyDto` load/load by owners/load by ids/insert/update and `propertySync(request, owner, propertyNames)` (`dto/property-dto.ts`; a property is attached to an owner `{ ownerName, ownerType }`, its `name` is `ownerName.ownerType.propertyName` by `propertyDtoName`; project sector, `sectorKey(request, true)`, so sign-in and a selected project are required). Owner-specific logic stays with the owner, e.g. design band properties in `util-design.ts`
- `util-storage.ts` — blob upload/download via `@vercel/blob` (blob paths are prefixed with `sectorKey(request, true)`)
- `util-grid.ts` — shared grid helpers plus the plane registry (`PLANE_LOADERS`, `PLANE_GRID_PATCHERS`) behind `api/grid-load.ts` / `api/grid-patch.ts`

Grid-specific logic lives in `App.Server/grid/` — one file per plane served to App.Web (`grid-project.ts` with the project and user grids, `grid-debug.ts` with the Debug page's single `DebugDto` grid ("Debug Data"), `grid-debug-property.ts` with the Debug Property page's (plane `debugProperty`) master `DebugContentDto` grid ("Debug Content", built like the `DebugDto` grid and reusing its exported `gridDebugDeleteConfirm`/`gridDebugNew`) and its detail `DebugPropertyDto` grid ("Debug Property"; New, edit and Save only: no Column Chooser or Delete) and a third grid "Debug Table" (`grids[2]`, `gridDebugTableLoad`, rebuilt on plane load, Select and the Debug Property grid's Reload): if the `ownerType` `Row` properties of the selected row have a whole-number `RowCount` and `ColumnCount` (each clamped to 0..50), that many rows of read-only "Empty" label cells under header columns named by `indexToColumnNameExcel`, otherwise empty; it sets `isSelectPatch`/`isSelectColumnPatch`, and while one of its cells is selected the Debug Property grid shows that cell's properties instead (`gridDebugPropertyOwners`: owner `{ ownerName: rowIndex + '.' + columnName, ownerType: 'CellTable' }`, also used by plane load, Reload and Filter Multi; a Debug Content Select rebuilds the table without selection), `grid-storage.ts` including the Image Preview grid, `grid-schema.ts`, `grid-dynamic.ts`, `grid-design.ts`). Each plane has one loader `(request, gridPlaneDto) => Promise<GridPlaneDto>` registered in `PLANE_LOADERS` in `util/util-grid.ts` (it also builds any grid depending on another grid of the plane, e.g. the Image Preview of the selected storage row), and optionally one patcher of the same signature in `PLANE_GRID_PATCHERS` (returns `GridDto.patches` per grid, `grids[i]` for the incoming `grids[i]`; a `GridPatchEnum.Grid` patch replaces or removes that whole grid, e.g. the Image Preview after `GridCommandEnum.Select` of a storage row).

Master/detail grids follow `grid-dynamic.ts` (Table → Data) and `grid-design.ts` (Design Band → Properties): the master grid sets `setting: { isSelectPatch: true }`, the loader builds the detail grid (`grids[1]`) from the reloaded master's selected row (`state.rowKeys[state.selectedRowIndex]`), and the patcher answers `GridCommandEnum.Select` with a `GridPatchEnum.Grid` patch for `grids[1]` (state reset to first page, no sort/filter/selection). Every patcher return has one entry per grid (`[{}, {}]`). A master grid's Reload must also rebuild its detail grids, so it reloads the whole plane (`/api/grid-load`); a grid no other grid depends on can set `setting: { isReloadPatch: true }` instead, which makes App.Web send `GridCommandEnum.Reload` (Reload button, paging, search) to `/api/grid-patch` and its patcher answers with a `GridPatchEnum.Grid` patch of that grid only (e.g. the `DebugPropertyDto` grid of `grid-debug-property.ts`); the grid's inputs re-render (`gridReloadCounts` in `GridStore.tsx`) without a remount. `isSelectPatch` sends `GridCommandEnum.Select` only when the selected row changes; a grid that also needs to know about a column change (`state.selectedColumnName`, otherwise only sent with the next command) sets `setting: { isSelectColumnPatch: true }`, which sends the same `Select` when the selected column changes (one request if both change; the patcher can't tell which one did), e.g. the `DebugContentDto` grid of `grid-debug-property.ts`, whose detail `DebugPropertyDto` grid shows the properties of the selected row and cell (`debugPropertyLoadByOwners` with owners `{ ownerName: name, ownerType: 'Row' }` and, if a column is selected, `{ ownerName: name + '.' + columnName, ownerType: 'Cell' }`; none with no row selected).

The Design plane (`grid-design.ts`, page `Design.tsx`): `DesignBandDto` rows (`contentName`, `bandEnum`, `sort`; `name` is a random UUID never sent to App.Web, the grid's rowKey is the `_id` hex) and their detail `PropertyDto` rows (`util-property.ts`), attached to the band by the owner `designPropertyOwner(band.name)` = `{ ownerName: DesignBandDto.name, ownerType: 'DesignBand' }`. The Design Band grid has row Delete and multi select Delete (toolbar `DeleteMulti`) with the same confirmation dialog as the `DebugDto` grid (`gridDebugDeleteConfirm`, shown as a modal by `Design.tsx`); `designBandDelete` also deletes the bands' properties (`propertyDeleteByOwners`). The properties of a band are generated, not entered: each time the Properties grid is built for the selected band (Select or plane load), `designPropertySync` (`util-design.ts`, via `propertySync`) makes them match `DESIGN_BAND_PROPERTY_NAMES[bandEnum]` (`dto/shared/content-dto.ts`, shared so App.Web can look up property positions: Header → `Text`, Table → `TableName`, Form → `RowCount`, `ColumnCount`, `TableName`) — inserts missing ones, deletes ones no longer applying, keeps the others with their `propertyValue`. Band Save does not sync, so a band has no properties until it is selected. The Properties grid shows every `PropertyDto` field (`name`, `text`, `ownerName`, `ownerType`, `propertyName`, `propertyValue`) but only `propertyValue` is editable (`RowCount`/`ColumnCount` must be whole numbers), there is no New (`isNewHide`), and with no band selected it has no rows. A third grid, "Design Form" (`grids[2]`, `gridDesignFormLoad`, rebuilt on plane load and on Select like the Properties grid), previews the selected band if it is a Form: `ColumnCount` header columns named by `indexToColumnNameExcel` (A, B, C, ...) and `RowCount` rows with "Hello" in every cell (each count clamped to 0..50); it is read only, with no find row, sort, paging or bar (Save/Reload), and empty for any other band. `Design.tsx` shows the Design Band and Design Form grids in the main column and the Properties grid in a right hand sidebar (`sidebarRightClassName`, below the other grids on narrower screens than `lg`).

A content is the `DesignBandDto` rows of one `contentName`: `loadContent(request, contentName)` (`util-content.ts`, signed-in only) returns them as a `ContentDto` (`dto/shared/content-dto.ts`, with `ContentBandDto` and `ContentBandEnum`), served by `api/content.ts` (`POST` `ContentRequestDto`). Each `ContentBandDto.propertyValues` holds the band's `PropertyDto.propertyValue`s positionally, in `DESIGN_BAND_PROPERTY_NAMES[bandEnum]` order (`''` if missing, e.g. a band never selected). App.Web renders it with the `Content.tsx` component (`<Content contentName="A" />`, e.g. on the Content page `page/Content.tsx`, component `ContentPage`), looking values up by name via `propertyValue(band, propertyName)`: Header renders as `<h1>` with its `Text`; Table renders the Dynamic page's "Data" grid filtered by its `TableName` (all rows if empty) — each Table band gets its own nested `GridStoreProvider` loading the `CONTENT_TABLE_PLANE_NAME` plane (`planeContentTableLoad`/`planeContentTablePatch` in `grid-dynamic.ts`, the Data grid as `grids[0]`), the tableName passed via `GridStateDto.custom[CONTENT_TABLE_CUSTOM_TABLE_NAME]` in the initial grids of `load(planeName, grids)`; Form renders a `RowCount` × `ColumnCount` table of empty cells (each clamped to 0..50, empty or invalid is 0) followed by the same Data grid as a Table band, filtered by the Form's `TableName` (own nested `GridStoreProvider`); other bands still show only their enum number.

DTOs (plain interfaces, not classes) live under `App.Server/dto/`, split by whether `App.Web` uses them:
- `App.Server/dto/shared/` — DTOs used by both `App.Server` and `App.Web` (must have no Node-only fields such as `ObjectId`). `App.Web` and `App.Server` share the same git repo, so these are imported directly by `App.Web` via a relative path (`import type { GridDto } from '../../../App.Server/dto/shared/grid-dto.ts'`) instead of being duplicated.
- `App.Server/dto/` (top level) — backend-only DTOs (`ProjectDto`, `DebugDto`, `DebugPropertyDto`, `DebugContentDto`, `PropertyDto`, `SessionDto`, `UserDto`, `DesignBandDto`, `GridConfigDto`, `StorageFileDto`). `App.Web` never imports from here — those carrying `ObjectId` couldn't be imported anyway, since `ObjectId` isn't installed in `App.Web` (and serializes to a plain string over JSON). They reach the frontend only indirectly, e.g. converted into a `GridDto` by `util-grid.ts`.

New DTOs go in `dto/shared/` only if `App.Web` actually imports them (and they have no `ObjectId` or other Node-only field); otherwise directly in `dto/`.

### App version
The app version is stored in two places: `VERSION_CLIENT` in `App.Web/src/util/util-main.ts` and `VERSION_SERVER` in `App.Server/util/util-main.ts`. **Both values must always be identical** — whenever one is bumped, bump the other to the same value in the same change. (`App.Web/src/page/About.tsx` displays both side by side.)

### Single-collection MongoDB pattern
All persisted DTOs (`UserDto`, `SessionDto`, `ProjectDto`, `DebugDto`, `DebugPropertyDto`, `DebugContentDto`, `PropertyDto`, `DesignBandDto` — the ones with `_id`/`type` fields; not e.g. `GridConfigDto` or `StorageFileDto`) are stored in one MongoDB collection (`'myCollection'`), disambiguated by a `type` field (e.g. `type: 'UserDto'`) and scoped by a `sectorKey` field. They all extend `DbDto` (`dto/db-dto.ts`: `_id`, `sectorKey`, `type`, `name` — `name` being the document's unique key within its `type` and `sectorKey`). Adding a new entity means adding a new DTO interface extending `DbDto` plus a `type` discriminator, not a new collection.

### sectorKey scoping
`sectorKey(request, isProject)` in `util-main.ts` builds the key used for both persistence layers:
- **MongoDB** — stored in each document's `sectorKey` field and used as a query filter (`util-user.ts`, `util-project.ts` with `isProject: false`; `util-property.ts` with `isProject: true`).
- **Blob storage** — used as the path prefix for every blob (`util-storage.ts` builds `sectorKey(request, true) + path`), so files live under `Domain/<domainName>/Project/<projectName>/...`.

The key takes one of two forms:
- `Domain/<domainName>/Global/` when `isProject` is `false` (e.g. users, projects — looked up by domain, no sign-in required)
- `Domain/<domainName>/Project/<projectName>/` when `isProject` is `true` (e.g. blob files inside a project) — this branch also asserts the caller has a valid session (throws `'User not signed in!'` if not, after `redirectSet(request, '/sign-in')`) and a selected project (`<projectName>` is the session's `projectName`, which mirrors `UserDto.projectName`; throws `'User has no project selected!'` if unset), so `isProject: true` is how sign-in is enforced for a query or blob access.

Always build sector keys through `sectorKey(...)` rather than constructing the `Domain/.../Global|Project/` string manually.

### Alert messages
Any backend code with access to the `request` can call `alertAdd(request, AlertEnum.Success | Info | Warning | Error, text)` (`util-main.ts`; `AlertEnum`/`AlertDto` in `dto/shared/alert-dto.ts`). `apiHandler` sends the queued alerts in `ApiResponseDto.alerts` (also on a 500). On App.Web, `apiFetch<T>(path, data?, init?)` (`src/util/util-main.ts`; always a POST of `data` wrapped in an `ApiRequestDto` with `VERSION_CLIENT` and the language of the current url, `init` only for e.g. `credentials`) calls `addAlert(...)` for them (plus a generic Error alert if the status is not ok and none was sent) and returns `ApiResponseDto.data` typed as `T`, or `undefined` if the status is not ok (it rethrows if no response arrives), so callers never read `response.ok`/`response.json()`; `NavState` shows the top alert with a close button (`removeAlert()`) and a count of open alerts. Frontend-only alerts can be added with `addAlert(...)` directly.

### Redirect url
The same way, backend code can call `redirectSet(request, url)` (`util-main.ts`) to make App.Web navigate after the call. Only ONE url per request (a later call overwrites an earlier one); `url` is a language neutral App.Web path such as `'/'`. `apiHandler` sends it in `ApiResponseDto.redirectUrl`. `apiFetch` reads it and calls `redirect(url)`, which dispatches a window event; `NavState` (inside the router) navigates there, adding the current language prefix (`/de`). Used e.g. after a successful SignIn to go to the Home page.

### Session handling
All user calls go through a single endpoint, `api/user.ts` (`/api/user`): App.Web always sends a `POST` with a `UserRequestDto` whose `requestEnum` (`UserRequestEnum` in `dto/shared/user-request-dto.ts`: `SignUp`, `SignIn`, `SignOut`, `Session`) selects the operation; `None` or an unknown value returns 400. App.Web calls it through `userRequest(dto)` in `NavState.tsx`. Responses (`UserResponseDto`) never include `sessionId`.

SignIn (`UserRequestEnum.SignIn` → `signIn`) sets an httpOnly `sessionId` cookie. `userSession(request)` (in `util-user.ts`) reads that cookie and looks up the matching `SessionDto` with `isSignIn: true`. `signOut` flips `isSignIn` to `false` rather than deleting the session document.

### App.Web routing and page structure
`App.Web/src/main.tsx` defines all routes with `react-router-dom`'s `<Routes>`/`<Route>`, wrapped in a shared `<Layout>` (`Nav` + `NavState` bar + `<Outlet>`). Any component mounted at a route `path` lives in `App.Web/src/page/`; shared/non-routed components (`Layout.tsx`, `Content.tsx`, `Nav.tsx`, `Grid.tsx`, `NavState.tsx`) stay directly in `App.Web/src/`. `apiUrl` (the `/api/` prefix used for all backend calls) is exported from `src/page/App.tsx`.

Second level navigation uses a layout route rendering `Sidebar.tsx` next to an `<Outlet>`: `page/DebugLayout.tsx` (Debug, Debug Property under `/debug/...`) and `page/SchemaLayout.tsx` (Schema, Dynamic, Design, Content, a pathless layout route keeping their own paths `/schema`, `/dynamic`, `/design`, `/content`). Only the first page of a group is in the `Nav` bar; its link is also active on the group's other pages (`subPaths` in `Nav.tsx`). Pages inside such a layout don't wrap themselves in `container` (the layout does).

`main.tsx` renders in `<StrictMode>`, which runs every effect twice in dev. A page that calls the backend on mount (e.g. `load('storage')`, sign-out) uses `useEffectOnce(effect, deps)` (`src/util/util-main.ts`) instead of `useEffect`, so the call is sent once per distinct `deps` values.

`NavState.tsx` polls `/api/user` (`UserRequestEnum.Session`) on mount and exposes `refreshNavState()`, which dispatches a window event other components (e.g. after sign-in/sign-out) use to force it to re-fetch. It also shares the signed-in state via `getIsSignIn()` + `SIGN_IN_EVENT`; `Nav` uses it to show, as a button right of the language switch (`buttonNavClassName`/`buttonNavPrimaryClassName`), "Sign Out" when signed in and "Sign In" when not (Sign Up is linked from the Sign In page, not the navbar).

### App.Web styles and grid toolbar (Bar)
Shared Tailwind class strings live as constants in `App.Web/src/style.ts` (e.g. `buttonPrimaryClassName`, `buttonGridClassName`, `textInputClassName`); reuse them instead of repeating class lists inline.

A `GridDto` has no `rows` of its own: its rows are split over `GridDto.tables` (`GridTableDto[]`, built with `gridTables(toolbarRows, dataRows, barRows)` in `util-grid.ts`), and `Grid.tsx` renders one html `<table>` per entry: `tables[0]` toolbar rows, `tables[1]` data rows (header, find and data rows, or a dialog's content; `GridCommandEnum.New` rows are appended here), `tables[2]` the `gridBarRow()`.

`GridCustomEnum.Bar` (rendered in `gridCustomContent` in `Grid.tsx`) follows the typical data grid toolbar layout: a `gridBarClassName` strip (light gray, bordered, rounded top, `justify-between`, wraps on narrow screens) with two groups:
- **Left — actions:** `New` (the main action, `buttonBarPrimaryClassName`, solid blue; hidden if `GridSettingDto.isNewHide`, e.g. for generated rows), then `Save` and `Reload` (secondary, `buttonBarClassName`, white outlined).
- **Right — paging:** "Rows per page:" select, "Page X of Y", then Previous/Next as icon-only buttons (`buttonBarIconClassName`, inline SVG chevrons with `aria-label`/`title`), disabled on the first/last page.

New toolbar buttons use these `buttonBar*` classes (not `buttonPrimaryClassName`): only the main action is primary, everything else secondary.
