# MCP Servers Comparison: Playwright MCP vs Postgres MCP

**Project:** habit-tracker  
**Date:** 2026-04-08  
**Task:** Task 2 — MCP Servers (Nearform AI Upskilling)

---

## Setup

Both servers are registered in `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    },
    "postgres": {
      "command": "node",
      "args": [
        "/Users/katemarmura/.nvm/versions/node/v22.15.1/lib/node_modules/@modelcontextprotocol/server-postgres/dist/index.js",
        "postgresql://postgres:postgres@localhost:5432/habit_tracker"
      ]
    }
  }
}
```

**Installation:**
```bash
npm install -g @playwright/mcp @modelcontextprotocol/server-postgres
# Versions tested: @playwright/mcp@0.0.70, @modelcontextprotocol/server-postgres@0.6.2
```

> **Note:** Postgres MCP requires the database to be running (`docker compose --profile dev up`). The connection string uses the defaults defined in `docker-compose.yml`. The MCP connects in **read-only mode by default** — it cannot INSERT, UPDATE, or DELETE rows.

---

## Coverage map

The two servers cover different layers of the stack — together they give full-stack observability:

| Layer | Tool |
|---|---|
| Frontend / browser | Playwright MCP |
| Backend / database | Postgres MCP |

---

## 1. Playwright MCP (`@playwright/mcp`)

### What it does

Gives Claude a real browser to control — navigate pages, click elements, fill forms, take screenshots, inspect the DOM accessibility tree, intercept network requests, and generate TypeScript Playwright test code from interactions.

### Tool inventory (61 tools)

| Category | Key tools |
|---|---|
| Navigation | `browser_navigate`, `browser_navigate_back` |
| Interaction | `browser_click`, `browser_type`, `browser_fill_form`, `browser_hover`, `browser_drag`, `browser_press_key`, `browser_select_option` |
| Observation | `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages` |
| Network | `browser_network_requests`, `browser_network_state_set`, `browser_route`, `browser_route_list` |
| Cookies/Storage | `browser_cookie_get`, `browser_cookie_list`, `browser_cookie_clear`, `browser_cookie_delete` |
| Advanced | `browser_evaluate`, `browser_run_code`, `browser_file_upload`, `browser_handle_dialog`, `browser_wait_for` |
| Session | `browser_tabs`, `browser_close`, `browser_resize` |

### Example interactions (habit-tracker project)

**Scenario 1: Smoke test the login flow**

> Prompt: "Navigate to the habit tracker at localhost:5173, take a screenshot, then log in with test@example.com / password123 and verify the habits page loads."

```
→ browser_navigate({ url: "http://localhost:5173" })
→ browser_take_screenshot({ filename: "login-page.png" })
→ browser_fill_form({ fields: [
     { selector: "input[type=email]", value: "test@example.com" },
     { selector: "input[type=password]", value: "password123" }
  ]})
→ browser_click({ selector: "button[type=submit]" })
→ browser_snapshot()
  Result: Accessibility tree confirms "My Habits" heading visible, habit list rendered.
```

**Scenario 2: Create a habit and mark today**

> Prompt: "Create a new habit called 'Daily Reading', open its calendar, mark today as complete, and verify the cell turns green."

```
→ browser_click({ selector: "button[aria-label='Add habit']" })
→ browser_fill_form({ fields: [{ selector: "input[name=name]", value: "Daily Reading" }] })
→ browser_click({ selector: "button[type=submit]" })
→ browser_click({ selector: "text=Daily Reading" })
→ browser_snapshot()
  Result: Grid role visible, today's cell identified.
→ browser_click({ selector: "[aria-label='April 8 (today)']" })
→ browser_snapshot()
  Result: Cell aria-label now includes "(completed)" — visual confirmation without assert code needed.
```

**Scenario 3: Generate a Playwright test from interaction**

> Prompt: "Record me creating a habit and checking today's entry, then output the TypeScript Playwright test."

```
→ browser_navigate, browser_click, browser_fill_form, browser_click...
→ browser_run_code({ language: "typescript", code: "..." })
  Result: Claude outputs a ready-to-paste .spec.ts test using page.getByRole(), getByLabel(), expect().
```

**Scenario 4: Debug a UI regression**

> Prompt: "The archive button isn't working. Open the habit list, click archive on the first habit, check the console for errors."

```
→ browser_navigate({ url: "http://localhost:5173" })
→ browser_click({ selector: "[aria-label='Archive habit']" })
→ browser_console_messages()
  Result: Console output shows "Uncaught TypeError: Cannot read properties of undefined (reading 'id')"
  → Pinpoints exactly which line is failing without opening DevTools manually.
```

### What it does well

- **Zero-config UI testing**: No test file needed — describe what to do in plain English and Claude drives the browser.
- **Snapshot-driven assertions**: `browser_snapshot` returns the full accessibility tree as text, which Claude reads to verify state without visual comparison code.
- **Test generation**: Every interaction can be output as a ready-to-use `.spec.ts` file — great for seeding new e2e test files.
- **Network interception**: `browser_route` lets you mock API responses mid-session, useful for testing error states (e.g., simulate a 500 from `/api/habits`).
- **Already integrated**: This project already uses Playwright for e2e tests in `e2e/` — the MCP is the interactive complement to those static spec files.

### Limitations

- **Headed browser by default**: Launches a visible Chromium window. Add `--headless` to the args for CI use.
- **Session is ephemeral**: Each Claude Code session starts a fresh browser context — no saved login state unless you use `--storage-state`.
- **Slow for pure API/data testing**: If you only need to verify what's in the database, browser overhead is unnecessary — use Postgres MCP instead.
- **No mobile device emulation by default**: Requires `--device "iPhone 15"` flag to test responsive layouts.
- **Tool count is large (61)**: Context overhead per interaction is non-trivial — avoid chaining too many browser calls in a single prompt.

### Recommended use cases for this project

| Use case | Fit |
|---|---|
| Interactive e2e test authoring | ★★★★★ |
| Debugging UI regressions | ★★★★★ |
| Smoke-testing new pages before writing specs | ★★★★☆ |
| Screenshot-based visual review | ★★★★☆ |
| Verifying database state | ★☆☆☆☆ |

---

## 2. Postgres MCP (`@modelcontextprotocol/server-postgres`)

### What it does

Connects Claude directly to the PostgreSQL database and exposes two tools: **`query`** (run any read SQL) and **`list_tables`** (describe the schema). This gives Claude full visibility into what is actually stored — independent of what the UI or API claims to show.

### Tool inventory (2 tools)

| Tool | Description |
|---|---|
| `query` | Execute any read-only SQL query and return results as structured data |
| `list_tables` | Return the full schema — all tables, columns, types, and constraints |

### Example interactions (habit-tracker project)

**Scenario 1: Verify a habit entry was actually saved**

> Prompt: "I just marked April 8 as complete for habit ID 3. Confirm the row exists in the database."

```sql
→ query("SELECT * FROM habit_entries WHERE habit_id = 3 AND date = '2026-04-08'")
  Result: { id: 91, habit_id: 3, date: "2026-04-08", completed: true, created_at: "..." }
  → Confirms the UI toggle actually persisted — rules out an optimistic-update bug.
```

**Scenario 2: Debug a calendar gap**

> Prompt: "The calendar for 'Exercise' shows a gap on March 31 even though I remember completing it. Check the database."

```sql
→ query("SELECT date, completed FROM habit_entries WHERE habit_id = 5 AND date BETWEEN '2026-03-28' AND '2026-04-03' ORDER BY date")
  Result: March 31 row is missing entirely — not false, just absent.
  → Confirms it's a missing insert, not a display bug. Points investigation at the POST /entries handler.
```

**Scenario 3: Inspect the schema after a migration**

> Prompt: "We just added an 'archived_at' column to habits. Confirm it's there and nullable."

```
→ list_tables()
  Result: habits table schema includes:
    archived_at | timestamp without time zone | nullable | default: null
  → Migration applied correctly, no code change needed.
```

**Scenario 4: Find data integrity issues**

> Prompt: "Are there any habit_entries that reference habit IDs that no longer exist (orphaned rows)?"

```sql
→ query("SELECT he.id, he.habit_id FROM habit_entries he LEFT JOIN habits h ON h.id = he.habit_id WHERE h.id IS NULL")
  Result: 0 rows — no orphaned entries. Foreign key constraint is holding.
```

**Scenario 5: Check streak calculation data**

> Prompt: "Show me all completed entries for habit 'Morning Run' in the last 30 days, so I can manually verify the streak count the UI shows."

```sql
→ query("SELECT e.date FROM habit_entries e JOIN habits h ON h.id = e.habit_id WHERE h.name = 'Morning Run' AND e.completed = true AND e.date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY e.date DESC")
  Result: 18 rows returned — matches the "18-day streak" shown in the UI.
```

### What it does well

- **Ground truth access**: The database is the source of truth. Querying it directly resolves disputes between what the UI shows and what actually happened.
- **Schema introspection**: `list_tables` gives Claude full table/column/type knowledge without reading Prisma schema files — useful when debugging a migration.
- **Zero auth overhead**: No API key or token required — just a connection string. Works immediately once Docker is up.
- **Fast for data questions**: A SQL query returns results in milliseconds; no browser, no HTTP stack, no ORM overhead.
- **Pairs naturally with Playwright**: Playwright drives the UI action; Postgres MCP confirms the database effect. Together they give end-to-end verification.

### Limitations

- **Read-only**: The MCP only exposes `SELECT` queries. Cannot seed data, fix corrupt rows, or test write paths via SQL — use the app or Prisma Studio for that.
- **Requires running database**: Docker must be up (`docker compose --profile dev up`) before the MCP is usable. It fails silently if the DB is down.
- **No query history or saved snippets**: Each session starts fresh — useful queries need to be re-typed or saved manually outside the tool.
- **Raw SQL only**: No Prisma-aware query builder — you write plain SQL against the actual table names, which must match the Prisma migration output.
- **Local only**: Connects to `localhost:5432`. Cannot point at a remote staging/prod database without changing the connection string in `.mcp.json`.

### Recommended use cases for this project

| Use case | Fit |
|---|---|
| Verifying data was persisted after a UI action | ★★★★★ |
| Debugging calendar/streak display vs. stored data | ★★★★★ |
| Inspecting schema after Prisma migrations | ★★★★★ |
| Finding orphaned or corrupt rows | ★★★★☆ |
| Testing write paths / seeding data | ★☆☆☆☆ |

---

## Side-by-side comparison

| Dimension | Playwright MCP | Postgres MCP |
|---|---|---|
| **Version tested** | 0.0.70 | 0.6.2 |
| **Auth required** | None | None (connection string only) |
| **Setup effort** | Low (zero-config) | Low (Docker must be running) |
| **Tool count** | 61 | 2 |
| **Layer** | Frontend / browser | Backend / database |
| **State persistence** | Ephemeral (per session) | Permanent (database rows persist) |
| **Best single use** | Interactive e2e test authoring | Verify data after a UI action |
| **Biggest limitation** | Needs running app + headed browser | Read-only; can't seed or write data |
| **Risk of destructive action** | Low (browser only) | None (read-only SQL) |
| **Maintenance status** | Active (Microsoft/Playwright) | Active (Anthropic/MCP) |

---

## Recommendation

For the habit-tracker project, **Playwright MCP and Postgres MCP cover the two halves of the stack**:

- Use **Playwright MCP** as an interactive frontend co-pilot — spin up the app, describe a user flow in plain English, get a passing e2e spec out the other end. It's the right tool any time the question is "does the UI behave correctly?"
- Use **Postgres MCP** as a backend data verifier — any time a bug might be a persistence issue ("did that really save?"), a migration question ("is the column there?"), or a data integrity check ("are there orphaned rows?"), query the database directly instead of inferring from the UI.

**The combination is more powerful than either alone:** Playwright tells you what the user sees; Postgres tells you what actually happened in storage. A bug that looks like a UI issue often turns out to be a missing write — or vice versa — and having both tools means you can pinpoint the layer without guessing.
