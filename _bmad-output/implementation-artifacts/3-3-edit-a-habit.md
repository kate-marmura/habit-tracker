# Story 3.3: Edit a Habit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to update my habit's name and description,
so that I can refine my goals over time.

## Acceptance Criteria

1. **`PUT /api/habits/:id`** accepts JSON **`{ name, description }`** where:
   - **`name`**: required after trim, 1–100 characters (same rules as create — [Source: Story 3.1 / `createHabitSchema`])
   - **`description`**: optional; omit, empty string after trim, or whitespace-only → stored as **`null`** (same semantics as create)
2. Only the **owning user** may update (`userId` from JWT must match habit row) — **NFR9**
3. Returns **`404`** with consistent API error shape if the habit **does not exist** or **belongs to another user** (do not leak cross-user existence)
4. Returns **`422`** for invalid body (**`VALIDATION_ERROR`** via Zod, matching existing `error-handler` behavior)
5. **`startDate`** and **`isArchived`** are **not** accepted in the body and **must not** change via this endpoint (**FR7** / Architecture §4 — start date immutable)
6. Successful update returns **`200`** with the **full habit object** using the **same JSON shape** as list/create (`id`, `name`, `description`, `startDate` as `YYYY-MM-DD`, `isArchived`, `createdAt`, `updatedAt`)
7. **`GET /api/habits/:id`** (supporting, Architecture §5): returns **`200`** + habit object for the authenticated owner; **`404`** if missing or other user’s habit — **required** so `HabitCalendarPage` can show the real habit name/description and prefill the edit form (stub today only shows `id` from the URL)
8. **`HabitCalendarPage`** loads habit detail on mount (from **`GET /api/habits/:id`**); shows at least **habit name** in the header or main area (calendar grid remains Epic 4)
9. **`HabitSettingsDropdown`** on **`HabitCalendarPage`** (Architecture §6): trigger (e.g. gear / “⋯” menu) opens actions; **Edit** opens an **edit modal** (or panel) with **name** + **description** fields; **`startDate`** shown **read-only** if displayed (reinforces FR7)
10. On successful **`PUT`**, **UI updates immediately** on the calendar page (local state) without a full page reload
11. **`401`** when not authenticated (existing middleware)
12. **Route registration order** in `habit.routes.ts`: keep static segments like **`/archived`** before **`/:id`**; **`GET /:id`** and **`PUT /:id`** share the param — validate **`id`** as UUID (Zod) in route handler or middleware to avoid odd DB errors

## Tasks / Subtasks

- [x] Task 1: Service — get + update (AC: #1–#6, #7, #3)
  - [x] Add **`getHabitById(userId: string, habitId: string)`** in `server/src/services/habit.service.ts`: `findFirst` where `{ id: habitId, userId }`, map `startDate` with `formatCalendarDate`; if missing → throw **`AppError(404, 'NOT_FOUND', ...)`** (reuse code/message pattern from other resources in this codebase)
  - [x] Add **`updateHabit(userId: string, habitId: string, input: { name: string; description?: string | null })`**: verify ownership (same as get); **`update`** with `name` + normalized `description`; `select` via shared **`habitSelectFields`**; return serialized habit
  - [x] Do **not** add any code path that mutates **`startDate`** or **`isArchived`** here

- [x] Task 2: Zod schemas + routes (AC: #1, #4–#6, #7, #11–#12)
  - [x] Define **`updateHabitBodySchema`** (mirror name/description parts of `createHabitSchema` — no `startDate`)
  - [x] **`router.get('/:id', ...)`** — parse `req.params.id` with **`z.string().uuid()`**; call `getHabitById`; `res.json(habit)`
  - [x] **`router.put('/:id', ...)`** — parse params + `updateHabitBodySchema.parse(req.body)`; call `updateHabit`; `res.json(habit)`
  - [x] Ensure **`GET /archived`** and **`GET /`** remain registered **before** **`/:id`**

- [x] Task 3: Server integration tests (AC: #1–#7, #11)
  - [x] Add **`server/src/__tests__/habits.detail-update.test.ts`** (or extend habits tests): auth + `X-Timezone`, isolated user + habit cleanup
  - [x] **GET**: `200` owner; `404` other user’s habit; `404` random UUID; `401` no token
  - [x] **PUT**: `200` updates name/description; `200` clears description when sending empty/`null`; `404` wrong user / missing; `422` empty name, name > 100, bad JSON shape; assert **`startDate`** unchanged and **`isArchived`** unchanged
  - [x] Optional: assert **`updatedAt`** changes on update (Prisma `@updatedAt`)

- [x] Task 4: Client types + API (AC: #6–#10)
  - [x] Add **`UpdateHabitPayload`** in `client/src/types/habit.ts` (`{ name: string; description?: string }`)
  - [x] Extend **`client/src/services/habitsApi.ts`**: **`fetchHabitById(id)`** → `get<Habit>(\`/api/habits/${id}\`)`; **`updateHabit(id, payload)`** → `put<Habit>(\`/api/habits/${id}\`, payload)`

- [x] Task 5: `HabitSettingsDropdown` + edit modal (AC: #8–#10)
  - [x] New **`client/src/components/HabitSettingsDropdown.tsx`**: accessible menu button + menu with **Edit** (archive/delete **E3-S4+** — do not implement real archive here unless you intentionally split scope)
  - [x] New **`EditHabitModal.tsx`** (or reuse patterns from **`CreateHabitModal.tsx`**): controlled fields, validation before submit, loading/error states, **`put`** on save, **`onSaved(habit)`** callback
  - [x] Refactor **`HabitCalendarPage.tsx`**: fetch habit on mount; loading/error UI; display **name**; render **`HabitSettingsDropdown`** wired to open **`EditHabitModal`**; on save, **`setHabit`** (or equivalent) with returned object

- [x] Task 6: Client tests
  - [x] Tests for **`HabitCalendarPage`**: mock **`fetchHabitById`**; open dropdown → edit → mock **`updateHabit`** → assert updated name visible
  - [x] Tests for **`EditHabitModal`** validation / error paths as needed

- [x] Task 7: Verify (all ACs)
  - [x] `npm run lint`, `npm test`, client + server builds

## Dev Notes

### Story scope

- **In scope:** `GET` + `PUT` for single habit (owner-only), calendar page shell enhancement, settings dropdown + edit modal.
- **Out of scope:** Archive, unarchive, delete, calendar grid, day entries, stats (**Epic 4–5**), global **`NavBar`** (**Epic 7**).

### Previous story intelligence (3.2)

- **`habitSelectFields`**, **`listActiveHabits`**, **`listArchivedHabits`**, **`createHabit`** live in **`habit.service.ts`** — extend; keep **JSON shape** identical across all habit endpoints
- **`habit.routes.ts`** already has **`GET /archived`**, **`GET /`**, **`POST /`** — append **`/:id`** routes **after** static paths
- **`habitsApi.ts`** exists — add get/put helpers there
- **`HabitCalendarPage`** is currently a **stub** — this story **replaces** “habit id only” with real **GET**-driven content + settings UI
- **Testing:** follow **`habits.list.test.ts`** / **`habits.create.test.ts`** isolation patterns (dedicated test user email, `afterAll` cleanup)

### Architecture compliance

- **Endpoints:** [Source: `_bmad-output/architecture.md` §5 — `GET /api/habits/:id`, `PUT /api/habits/:id`]
- **Component tree:** [Source: Architecture §6 — `HabitCalendarPage` → `HabitSettingsDropdown` (edit, archive)] — implement **Edit**; **Archive** waits for **E3-S4**
- **Errors:** `{ error: { code, message } }` consistent with **`error-handler`**

### Product references

- **FR7** — edit name and goal description; start date fixed at creation [Source: `_bmad-output/prd.md`]
- **NFR9** — users only access their own habit data
- **E3-S3** — [Source: `_bmad-output/epics-and-stories.md`]

### File structure (expected touches)

| Area | Files |
|------|--------|
| Server | `server/src/services/habit.service.ts`, `server/src/routes/habit.routes.ts`, `server/src/__tests__/habits.detail-update.test.ts` (new) |
| Client | `client/src/types/habit.ts`, `client/src/services/habitsApi.ts`, `client/src/pages/HabitCalendarPage.tsx`, `client/src/components/HabitSettingsDropdown.tsx` (new), `client/src/components/EditHabitModal.tsx` (new), tests |

### Latest tech notes

- No stack upgrades required; use existing Express, Prisma, Zod, Vitest, Jest patterns.

### Project context

- No `project-context.md` in repo — rely on this story + architecture + prior habit stories.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Added `getHabitById` and `updateHabit` service functions; `getHabitById` uses `findFirst` with userId scoping and throws `AppError(404)` if not found; `updateHabit` checks ownership before updating, normalizes description (trim or null)
- Task 2: Defined `updateHabitBodySchema` (name+description, no startDate); added `habitIdParam` UUID validator; registered `GET /:id` and `PUT /:id` routes after static paths
- Task 3: Created `habits.detail-update.test.ts` with 16 integration tests covering GET (owner, other user 404, missing 404, non-UUID 422, 401) and PUT (update, clear description, immutable startDate/isArchived, updatedAt changes, ownership, validation, 401)
- Task 4: Added `UpdateHabitPayload` type; extended `habitsApi.ts` with `fetchHabitById` and `updateHabit` helpers
- Task 5: Created `EditHabitModal` (reuses CreateHabitModal patterns — name+description fields, validation, loading/error, Escape to close, startDate shown read-only); created `HabitSettingsDropdown` (accessible menu button with Edit action); refactored `HabitCalendarPage` to fetch habit on mount and display name/description/startDate with loading/error states
- Task 6: Created `HabitCalendarPage.test.tsx` with 11 tests covering loading, fetch, error, dropdown, edit modal open/save/validate/error, read-only startDate display
- Task 7: Lint clean, 83 server tests pass, 65 client tests pass, both builds succeed

### Change Log

- 2026-03-23: Implemented Story 3.3 — edit a habit (GET + PUT /:id, calendar page, settings dropdown, edit modal)

### File List

- server/src/services/habit.service.ts (modified)
- server/src/routes/habit.routes.ts (modified)
- server/src/__tests__/habits.detail-update.test.ts (new)
- client/src/types/habit.ts (modified)
- client/src/services/habitsApi.ts (modified)
- client/src/pages/HabitCalendarPage.tsx (modified)
- client/src/components/HabitSettingsDropdown.tsx (new)
- client/src/components/EditHabitModal.tsx (new)
- client/src/pages/HabitCalendarPage.test.tsx (new)
