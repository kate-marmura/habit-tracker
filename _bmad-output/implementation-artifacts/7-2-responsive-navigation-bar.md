# Story 7.2: Responsive Navigation Bar

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a navigation bar to move between my habits, archived list, and settings,
so that I can access all parts of the app easily.

## Acceptance Criteria

1. **NavBar component exists:** A `NavBar` component renders a persistent top bar on all authenticated pages via `AppLayout`.
2. **Nav links with Lucide icons:** Nav items (Archived, Settings, Log out) use Lucide icons: `Archive` for Archived, `Settings` (gear) for Settings, `LogOut` for Log out.
3. **Active route highlighted:** The currently active nav link is visually distinguished (e.g., pink text/background) from inactive links.
4. **Mobile responsive — icon only:** On small viewports (< 640px / `sm` breakpoint), nav items show only icons with no text labels. Touch targets remain ≥ 44x44px.
5. **Desktop responsive — icon + text:** On larger viewports (≥ 640px), nav items show both the icon and the text label.
6. **Logo area takes at least 50% width:** The left side (app title + subtitle) uses `min-w-[50%]` or equivalent so it never gets squeezed by the nav buttons. The title and subtitle display in a single line or stack naturally without line-breaking mid-word.
7. **"Back to habits" uses icon:** On `HabitCalendarPage` and `ArchivedHabitsPage`, the "Back to habits" link uses an `ArrowLeft` Lucide icon. On mobile, it shows only the icon; on desktop, it shows icon + "Back to habits" text.
8. **Logout accessible from nav:** Logout button is part of the NavBar, accessible on every authenticated page.
9. **Per-page header nav removed:** The duplicated navigation links (Archived, Settings, Log out) currently inline in `HabitListPage`'s header are removed — NavBar handles them.
10. **Navigation transitions within 300ms:** Client-side link navigation is instant (React Router, no full page reloads). (NFR3 — already satisfied by existing React Router setup.)

## Tasks / Subtasks

- [x] Task 1: Create NavBar component (AC: #1, #2, #3, #4, #5, #6, #8)
  - [x] Create `client/src/components/NavBar.tsx`
  - [x] Import Lucide icons: `Archive`, `Settings`, `LogOut` from `lucide-react`
  - [x] Import `Link`, `useLocation` from `react-router-dom`
  - [x] Import `useAuth` from `../contexts/AuthContext`
  - [x] Left section: App title "Habit Tracker" (`text-xl font-bold text-pink-500`) + subtitle "Let's start a better life" (`text-muted text-xs`). Wrap in a `Link to="/habits"` so clicking logo goes home. Apply `min-w-[50%]` to ensure the logo area never shrinks below half.
  - [x] Right section: Nav items in a flex row with gap
  - [x] Each nav item structure:
    ```tsx
    <Link to="/habits/archived" className="..." aria-label="Archived">
      <Archive size={20} />
      <span className="hidden sm:inline">Archived</span>
    </Link>
    ```
  - [x] Active route detection: `useLocation().pathname` — highlight the link whose `to` matches (use `startsWith` for `/habits/archived` vs `/habits`)
  - [x] Active style: `text-pink-500` (or `bg-pink-50 text-pink-500`); inactive: `text-text-secondary hover:bg-gray-100`
  - [x] Logout button: same icon-only/icon+text responsive pattern with `LogOut` icon. Uses `onClick={logout}` instead of `Link`.
  - [x] Container: `border-b border-border bg-surface` with inner `max-w-2xl mx-auto px-4 py-3 flex items-center justify-between`
  - [x] Nav items: `flex items-center gap-1 sm:gap-2` inside each link/button; `p-2 sm:px-3 sm:py-1.5 rounded-lg transition` for touch targets

- [x] Task 2: Add NavBar to AppLayout (AC: #1)
  - [x] In `client/src/components/AppLayout.tsx`, import NavBar
  - [x] Render `<NavBar />` above `<Outlet />`:
    ```tsx
    return (
      <>
        <NavBar />
        <Outlet />
      </>
    );
    ```

- [x] Task 3: Remove per-page header nav from HabitListPage (AC: #9)
  - [x] In `client/src/pages/HabitListPage.tsx`:
    - [x] Remove the entire `<header>` block (lines ~76-104) containing "Habit Tracker" title and Archived/Settings/Logout buttons
    - [x] Remove `useAuth` import and `const { logout } = useAuth()` since logout moves to NavBar
    - [x] Keep the `<main>` section with "Your Habits" heading and content unchanged
    - [x] The page now starts directly with `<div className="min-h-screen bg-background"><main>...</main></div>` (or just `<main>` since AppLayout could handle the min-h-screen)

- [x] Task 4: Update "Back to habits" on ArchivedHabitsPage (AC: #7)
  - [x] In `client/src/pages/ArchivedHabitsPage.tsx`:
    - [x] Import `ArrowLeft` from `lucide-react`
    - [x] Replace the "Back to habits" Link text with icon + responsive text:
      ```tsx
      <Link to="/habits" className="..." aria-label="Back to habits">
        <ArrowLeft size={20} />
        <span className="hidden sm:inline">Back to habits</span>
      </Link>
      ```
    - [x] Flex the link items with `flex items-center gap-1`

- [x] Task 5: Update "Back to habits" on HabitCalendarPage (AC: #7)
  - [x] In `client/src/pages/HabitCalendarPage.tsx`:
    - [x] Import `ArrowLeft` from `lucide-react`
    - [x] Replace the "Back to habits" Link text with icon + responsive text:
      ```tsx
      <Link to="/habits" className="flex items-center gap-1 ..." aria-label="Back to habits">
        <ArrowLeft size={20} />
        <span className="hidden sm:inline">Back to habits</span>
      </Link>
      ```

- [x] Task 6: Write tests for NavBar (AC: #1, #2, #3, #8)
  - [x] Create `client/src/components/NavBar.test.tsx`
  - [x] Test: renders Archived, Settings links and Log out button
  - [x] Test: active route gets highlighted class
  - [x] Test: logout button calls `logout` from AuthContext
  - [x] Test: links point to correct routes (/habits/archived, /settings)
  - [x] Test: logo links to /habits

- [x] Task 7: Update existing tests (AC: #9)
  - [x] Update `HabitListPage.test.tsx` if any tests reference the removed header nav (Archived/Settings/Logout buttons)
  - [x] Verify `ArchivedHabitsPage.test.tsx` and `HabitCalendarPage.test.tsx` still pass with the updated "Back to habits" markup

- [x] Task 8: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (all existing + new tests)
  - [x] Client build succeeds
  - [x] Visual check on mobile width (~375px): icons only, logo not squeezed, touch targets adequate
  - [x] Visual check on desktop width: icons + text labels, active route highlighted
  - [x] Manual test: navigate between Habits → Archived → Settings → back. Active highlight updates correctly. Logout works.

## Dev Notes

### Key UX issue being fixed (from Kate's screenshot)

The current `HabitListPage` header crams text-only buttons ("Archived", "Settings", "Log out") into a flex row alongside the logo. On mobile (screenshot at ~375px), this forces "Habit Tracker" and "Let's start a better life" into a tiny sliver, causing ugly word-wrapping ("Habit\nTracker", "Let's start a\nbetter life"). The fix:
1. Icons save horizontal space on mobile (icon-only ≈ 44px vs text button ≈ 80-100px)
2. Logo area reserves at least 50% width so it never gets compressed
3. Nav items use `hidden sm:inline` on text labels to drop text on mobile

### Lucide icons to use

| Nav item | Icon | Import |
|----------|------|--------|
| Archived | `Archive` | `import { Archive } from 'lucide-react'` |
| Settings | `Settings` | `import { Settings } from 'lucide-react'` |
| Log out | `LogOut` | `import { LogOut } from 'lucide-react'` |
| Back to habits | `ArrowLeft` | `import { ArrowLeft } from 'lucide-react'` |

Lucide React is already installed and used throughout the project (e.g., `Eye`, `Pencil`, `Archive`, `Trash2`, `ChevronLeft`, `ChevronRight` in HabitCard, HabitSettingsDropdown, MonthNavigator).

### Active route detection

Use `useLocation().pathname` and compare:
- `/habits` exact (or starts with `/habits` but NOT `/habits/archived`) → "Habits" is active (home/logo)
- `/habits/archived` → "Archived" is active
- `/settings` → "Settings" is active

Be careful: `/habits/:id` (calendar page) should highlight the Habits/home nav item, NOT the Archived item. Use `pathname === '/habits/archived'` for archived, `pathname === '/settings'` for settings, and everything else highlights the home/habits logo.

### Responsive pattern for icon + text

```tsx
<Link to="/habits/archived" className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-lg transition text-text-secondary hover:bg-gray-100" aria-label="Archived">
  <Archive size={20} />
  <span className="hidden sm:inline text-sm font-medium">Archived</span>
</Link>
```

- `hidden sm:inline` on the `<span>` hides text below 640px
- `p-2` gives a square 44px touch target on mobile (20px icon + 2×8px padding)
- `sm:px-3 sm:py-1.5` restores normal button padding on desktop
- `aria-label` ensures accessibility when text is hidden

### Logo area 50% minimum width

```tsx
<Link to="/habits" className="min-w-[50%]">
  <h1 className="text-xl font-bold text-pink-500 truncate">Habit Tracker</h1>
  <p className="text-muted text-xs">Let&apos;s start a better life</p>
</Link>
```

`min-w-[50%]` on the left section prevents the flex container from shrinking the logo below half the available width. The nav items on the right will compress or wrap if needed, but the logo stays readable.

### NavBar lives in AppLayout, not individual pages

After story 7-1, `AppLayout` is a pure route guard (`isAuthenticated ? <Outlet /> : <Navigate />`). This story adds NavBar above the Outlet:

```tsx
export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
```

This means NavBar appears on HabitListPage, HabitCalendarPage, ArchivedHabitsPage, and SettingsPage — removing the need for per-page nav.

### Critical implementation guardrails

1. **Do NOT create a hamburger menu or bottom nav.** Kate's feedback shows she prefers the top-bar approach with icon-only on mobile. Keep it simple.
2. **Do NOT create a sidebar.** The app is narrow (`max-w-2xl`) — a sidebar would waste space.
3. **REMOVE the per-page header nav from HabitListPage.** The Archived/Settings/Logout buttons move to NavBar. The "Habit Tracker" title + subtitle move to NavBar. HabitListPage only keeps its "Your Habits" + "+ New habit" section.
4. **Do NOT remove the page-specific sub-header from HabitCalendarPage.** It shows the habit name and settings dropdown — those are page-specific, not navigation. Only update the "Back to habits" link to use an icon.
5. **Do NOT remove the header from ArchivedHabitsPage.** It shows "Archived Habits" title and "Back to habits" — keep the title, update "Back to habits" to use an icon.
6. **The NavBar subtitle is "Let's start a better life"** — matches the existing branding. Keep `text-muted text-xs` styling.
7. **`Settings` is both a Lucide icon name and a common variable name.** Import carefully to avoid naming conflicts. If needed, rename the import: `import { Settings as SettingsIcon } from 'lucide-react'`.
8. **Do NOT change the `max-w-2xl` layout constraint.** NavBar inner content should use the same `max-w-2xl mx-auto px-4` as page content for visual alignment.
9. **Logout in NavBar needs `useAuth`** — the hook must be called inside the component (it's within the AuthProvider tree since NavBar is inside AppLayout which is inside AuthProvider).

### What changes per page

| Page | Current header | After story |
|------|---------------|-------------|
| HabitListPage | Logo + Archived/Settings/Logout | **Remove entire header.** NavBar handles nav. Page starts with "Your Habits" section. |
| HabitCalendarPage | Habit name + Settings dropdown + "Back to habits" | **Keep sub-header** but update "Back to habits" to use ArrowLeft icon + responsive text. |
| ArchivedHabitsPage | "Archived Habits" + "Back to habits" | **Keep header** but update "Back to habits" to use ArrowLeft icon + responsive text. |
| SettingsPage | Has its own header (Back to habits / similar) | **Keep page content.** Check if it has nav items to remove. |

### Previous story intelligence

From story 7-1 (Auth Layout & Protected Routes):
- `AppLayout.tsx` is at `client/src/components/AppLayout.tsx` — currently just renders `<Outlet />` when authenticated
- Per-page auth guards were removed — `HabitListPage` no longer imports `useNavigate` for auth, only uses `useAuth` for `logout`
- After removing the header nav, `useAuth` can be removed entirely from HabitListPage (logout moves to NavBar)

From the codebase:
- Lucide React is used in HabitCard (`Eye`, `Pencil`, `Archive`, `Trash2`), MonthNavigator (`ChevronLeft`, `ChevronRight`), DayCell (`Check`). Follow the same import pattern.
- The `border-b border-border bg-surface` header pattern is consistent across all pages. NavBar should use the same styling.
- `max-w-2xl mx-auto px-4` is the universal content width constraint.

### Git intelligence

```
feat(shell): responsive navigation bar with icons (E7-S2)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/components/NavBar.tsx`, `client/src/components/NavBar.test.tsx` |
| Client (modified) | `client/src/components/AppLayout.tsx` (add NavBar), `client/src/pages/HabitListPage.tsx` (remove header nav), `client/src/pages/ArchivedHabitsPage.tsx` (icon "Back"), `client/src/pages/HabitCalendarPage.tsx` (icon "Back"), `client/src/pages/HabitListPage.test.tsx` (update if needed) |

### What this story does NOT include

- No backend changes
- No bottom nav bar or hamburger menu
- No sidebar
- No React.lazy / code-splitting (story 7-3)
- No 404 route (story 7-3)
- No changes to api.ts or AuthContext
- No changes to auth pages (login, register, etc.)

### References

- [Source: architecture.md §6 — Component Hierarchy (NavBar under AppLayout)]
- [Source: epics-and-stories.md — E7-S2 acceptance criteria]
- [Source: prd.md — FR31 (navigate between habit list, calendar, settings)]
- [Source: prd.md — NFR3 (navigation transitions within 300ms)]
- [Source: client/src/pages/HabitListPage.tsx — current header nav (lines 76-104)]
- [Source: client/src/pages/HabitCalendarPage.tsx — "Back to habits" link (lines 333-338)]
- [Source: client/src/pages/ArchivedHabitsPage.tsx — header + "Back to habits" (lines 64-75)]
- [Source: client/src/components/AppLayout.tsx — current pure route guard]
- [Source: Kate's screenshot — mobile layout squeezing logo/subtitle]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

(none)

### Completion Notes List

- Created `NavBar.tsx` with Lucide icons (`Archive`, `Settings as SettingsIcon`, `LogOut`), active-route highlighting via `useLocation().pathname`, icon-only on mobile (`hidden sm:inline`), `min-w-[50%]` logo area, `aria-label` on every nav item.
- Post-review polish: when the habits/home destination is active, the pink highlight applies to the whole header rather than only the logo block, avoiding an awkward half-header tint on mobile.
- `AppLayout.tsx` updated to render `<NavBar />` above `<Outlet />`.
- `HabitListPage.tsx` — removed entire `<header>` block with logo/Archived/Settings/Logout. Removed `useAuth`, `Link` imports. Page starts at `<main>`.
- `ArchivedHabitsPage.tsx` and `HabitCalendarPage.tsx` — "Back to habits" links updated to `ArrowLeft` icon + responsive `hidden sm:inline` text with `aria-label`.
- `NavBar.test.tsx` (6 tests): links, active highlighting, logo href, logout clears localStorage.
- `HabitListPage.test.tsx` — replaced "has link to archived" test with "does not render per-page header nav" since NavBar handles it.
- Verified: `npm test` (214 tests), `npm run lint`, `npm run build` in `client/`.

### File List

- `client/src/components/NavBar.tsx` (new)
- `client/src/components/NavBar.test.tsx` (new)
- `client/src/components/AppLayout.tsx` (modified)
- `client/src/pages/HabitListPage.tsx` (modified)
- `client/src/pages/ArchivedHabitsPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/HabitListPage.test.tsx` (modified)

## Change Log

- **2026-03-24:** Story 7.2 implemented — NavBar with Lucide icons, AppLayout integration, per-page header nav removed; sprint status → review.
