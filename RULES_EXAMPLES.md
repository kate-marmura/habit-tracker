# Custom Rules — Before & After Examples

This file demonstrates how the 9 project-specific rules in `AGENTS.md` change agent
suggestions. Each example shows a realistic incorrect suggestion and the corrected version
the rules produce.

---

## Rule 1 — Use CalendarDate strings, not raw `Date` objects

**Scenario:** Agent is asked to add a "default start date" to a new form field.

```ts
// BEFORE — agent suggests using JS Date directly
const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
// Risk: toISOString() converts to UTC — at 11pm UTC-5 this returns tomorrow's date

// AFTER — rule steers agent toward the project's calendar-date utility
import { getTodayInTimezone } from '../lib/calendar-date';
const [startDate, setStartDate] = useState(() => getTodayInTimezone(userTimezone));
// Safe: timezone-aware, consistent with how all other dates are produced in this codebase
```

---

## Rule 2 — Always include `userId` in Prisma queries

**Scenario:** Agent is asked to add a "get entry by ID" endpoint.

```ts
// BEFORE — agent omits userId, any authenticated user can read any entry
const entry = await prisma.dayEntry.findUnique({
  where: { id: entryId },
});

// AFTER — rule reminds agent to scope every query to the authenticated user
const habit = await prisma.habit.findFirst({
  where: { id: habitId, userId },   // verify ownership via the parent habit
  select: { id: true },
});
if (!habit) throw new AppError(404, 'NOT_FOUND', 'Habit not found');

const entry = await prisma.dayEntry.findFirst({
  where: { habitId, entryDate: parseCalendarDate(date) },
});
```

**Real violation found & fixed:** `HabitListPage.tsx` and `ArchivedHabitsPage.tsx` (see Rule 4 below).

---

## Rule 3 — Import `config`, never read `process.env` directly

**Scenario:** Agent adds JWT verification to a new middleware.

```ts
// BEFORE — agent reads process.env directly, bypasses startup validation
import jwt from 'jsonwebtoken';
const payload = jwt.verify(token, process.env.JWT_SECRET!);
// Risk: if JWT_SECRET is missing, this crashes at runtime with a cryptic error

// AFTER — rule routes agent through the validated config module
import { config } from '../config.js';
const payload = jwt.verify(token, config.JWT_SECRET);
// Safe: if JWT_SECRET is missing, the server refuses to start with a clear message
```

**Audit result:** No violations found in the codebase — all server code already uses `config`.

---

## Rule 4 — Invalidate TanStack Query cache after every mutation

**Scenario:** Agent implements a delete handler on the habit list page.

```ts
// BEFORE — agent only updates local state, server and client drift apart
function handleDeleted() {
  if (!deletingHabit) return;
  queryClient.setQueryData<Habit[]>(['habits'], (old) =>
    old?.filter((h) => h.id !== deletingHabit.id),
  );
  setDeletingHabit(null);
}
// Risk: if another tab or background refetch runs, the deleted item reappears

// AFTER — rule ensures a background refetch is always triggered
function handleDeleted() {
  if (!deletingHabit) return;
  queryClient.setQueryData<Habit[]>(['habits'], (old) =>
    old?.filter((h) => h.id !== deletingHabit.id),
  );
  void queryClient.invalidateQueries({ queryKey: ['habits'] }); // ← added
  setDeletingHabit(null);
}
```

**Real violations found & fixed:**
- `HabitListPage.tsx` — `handleCreated`, `handleEditSaved`, `handleDeleted`
- `ArchivedHabitsPage.tsx` — `handleDeleted`

---

## Rule 5 — Export Zod schemas from route files

**Scenario:** Agent adds entry creation validation to `entry.routes.ts`.

```ts
// BEFORE — schema is defined inline and unexported
const createEntryBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
// Problem: integration tests must duplicate this shape, so test data drifts from real validation

// AFTER — rule requires the schema to be exported
export const createEntryBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Test file can now import and reuse it:
import { createEntryBody } from '../../routes/entry.routes.js';
const validBody = { date: '2026-03-10' } satisfies z.infer<typeof createEntryBody>;
```

**Real violations found & fixed:** `entry.routes.ts` — `habitIdParam`, `monthQuery`,
`createEntryBody`, `dateParam` were all unexported.

---

## Rule 6 — Never mock the database — always use the test Docker DB

**Scenario:** Agent writes a new server integration test for habit creation.

```ts
// BEFORE — agent mocks Prisma to avoid needing a DB
jest.mock('../lib/prisma', () => ({
  habit: {
    create: jest.fn().mockResolvedValue({ id: 'abc', name: 'Test', ... }),
  },
}));
// Risk: mock never runs migrations — a schema change that breaks real inserts
// will silently pass all tests

// AFTER — rule requires the real test DB (docker compose --profile test up)
import { prisma } from '../lib/prisma.js';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  // seed real data
});
// Now schema changes, constraint violations, and migration failures are caught
```

**Audit result:** No violations found — all server tests use real Prisma + test DB.

---

## Rule 7 — API errors must use `{ error: string }` shape

**Scenario:** Agent adds a validation error response to a new route.

```ts
// BEFORE — agent uses a different key name
if (!body.name) {
  return res.status(400).json({ message: 'Name is required' });
}
// Risk: client service layer does `err.error` — this response is silently swallowed

// AFTER — rule enforces the consistent shape the client already expects
if (!body.name) {
  return res.status(400).json({ error: 'Name is required' });
}
```

**Audit result:** No violations found — all existing routes use `{ error: ... }` consistently.

---

## Rule 8 — Test file placement: colocate on client, `__tests__/` on server

**Scenario:** Agent adds a test for a new server route.

```
// BEFORE — agent puts test next to the source file (wrong for server)
server/src/routes/habit.routes.test.ts

// AFTER — rule redirects agent to the correct location
server/src/__tests__/habits.create.test.ts
```

**Scenario:** Agent adds a test for a new React component.

```
// BEFORE — agent creates a __tests__ subfolder (wrong for client)
client/src/components/__tests__/NewComponent.test.tsx

// AFTER — rule collocates the test next to the component
client/src/components/NewComponent.test.tsx
```

**Audit result:** No violations found — file placement is consistent throughout.

---

## Rule 9 — Pin system time in tests that depend on the current date

**Scenario:** Agent writes a test for a component that initialises to the current month.

```ts
// BEFORE — test uses hardcoded March 2026 entry dates without pinning the clock
it('displays marked dates', async () => {
  vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
  renderPage();
  // When today is April 2026, the calendar shows April — the March entry is never
  // fetched, cells[9] is no longer March 10, and the assertion silently fails
  await vi.waitFor(() => expect(cells[9].className).toContain('bg-pink-marked'));
});

// AFTER — rule requires pinning new Date() to the month the test data lives in
it('displays marked dates', async () => {
  vi.useFakeTimers({ now: new Date(2026, 2, 15), shouldAdvanceTime: true });
  vi.mocked(fetchEntries).mockResolvedValue([{ id: 'e1', entryDate: '2026-03-10' }]);
  renderPage(); // component initialises to March 2026 ✓
  await vi.waitFor(() => expect(cells[9].className).toContain('bg-pink-marked'));
});

afterEach(() => {
  vi.useRealTimers(); // prevent timer state from leaking into the next test
});
```

**Real violations found & fixed:** 12 tests in `HabitCalendarPage.test.tsx` were failing
because they relied on the calendar defaulting to March 2026 but had no clock pinning.
All were fixed by adding `vi.useFakeTimers({ now: new Date(2026, 2, 15), shouldAdvanceTime: true })`
and `vi.useRealTimers()` in `afterEach`.
