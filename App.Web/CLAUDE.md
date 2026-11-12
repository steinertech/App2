# App.Web

## Routing and pages
`src/main.tsx` defines all routes with `react-router-dom`, wrapped in a shared `<Layout>` (`Nav` + `NavState` bar + `<Outlet>`). Any component mounted at a route `path` lives in `src/page/`; shared/non-routed components (`Layout.tsx`, `Content.tsx`, `Nav.tsx`, `Grid.tsx`, `NavState.tsx`) stay directly in `src/`. `apiUrl` is exported from `src/page/App.tsx`.

Second level navigation uses a layout route rendering `Sidebar.tsx` next to an `<Outlet>`: `page/DebugLayout.tsx` (Debug, Debug Property, Debug Dynamic under `/debug/...`) and `page/SchemaLayout.tsx` (Schema, Dynamic, Design, Content — a pathless layout route keeping their own paths). Only the first page of a group is in the `Nav` bar; its link is also active on the group's other pages (`subPaths` in `Nav.tsx`). Pages inside such a layout don't wrap themselves in `container` (the layout does).

`main.tsx` renders in `<StrictMode>`, which runs every effect twice in dev. A page that calls the backend on mount (e.g. `load('storage')`, sign-out) uses `useEffectOnce(effect, deps)` (`src/util/util-main.ts`) instead of `useEffect`.

## Backend calls, alerts, redirects
Always call the backend through `apiFetch<T>(path, data?, init?)` (`src/util/util-main.ts`): a POST of `data` wrapped in an `ApiRequestDto`; it shows the response's alerts (plus a generic Error alert if not ok and none was sent), follows `redirectUrl` via `redirect(url)` (`NavState` navigates, adding the language prefix), and returns `data` or `undefined` if not ok — callers never read `response.ok`/`response.json()`. Frontend-only alerts: `addAlert(...)`.

`NavState.tsx` polls `/api/user` (`Session`) on mount and exposes `refreshNavState()` (window event, used after sign-in/sign-out) and `getIsSignIn()` + `SIGN_IN_EVENT`; `Nav` shows "Sign Out"/"Sign In" right of the language switch (Sign Up is linked from the Sign In page). User calls go through `userRequest(dto)` in `NavState.tsx`.

## Styles and grid Bar
Shared Tailwind class strings live as constants in `src/style.ts`; reuse them instead of repeating class lists inline.

`Grid.tsx` renders one `<table>` per `GridDto.tables` entry. `GridCustomEnum.Bar` (`gridCustomContent`) is a `gridBarClassName` strip with two groups:
- **Left — actions:** `New` (the main action, `buttonBarPrimaryClassName`; hidden if `GridSettingDto.isNewHide`), then `Save` and `Reload` (`buttonBarClassName`), then Previous/Next row icon buttons (`buttonBarIconClassName`): they move `selectedRowIndex` like a click (keeping the selected column, so `isSelectPatch` grids still send `Select`); Next without a selection selects the first row; disabled on the first/last row.
- **Right — paging:** "Rows per page:" select, "Page X of Y", Previous/Next icon buttons (inline SVG chevrons with `aria-label`/`title`), disabled on the first/last page.

New toolbar buttons use the `buttonBar*` classes (not `buttonPrimaryClassName`): only the main action is primary, everything else secondary.

The selected row lives in the grid's store state (`GridStore.tsx`), not local component state, so it follows the server and is sent with every command.
