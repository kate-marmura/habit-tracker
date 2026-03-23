# Story 1.1: Initialize Monorepo Structure

Status: done

## Story

As a developer,
I want the monorepo scaffolded with client and server packages,
so that I can begin frontend and backend development with a shared root.

## Acceptance Criteria

1. Root directory contains `client/` and `server/` directories, each with its own `package.json`
2. Client initialized with Vite + React 19 + TypeScript
3. Server initialized with Express 5 + TypeScript
4. Root contains `.gitignore`, `.env.example`, and `README.md`
5. Tailwind CSS v4 configured in client with custom color palette per Architecture §6 (pink/grey/white theme)
6. ESLint and Prettier configured for both packages
7. TypeScript strict mode enabled in both `tsconfig.json` files

## Tasks / Subtasks

- [x] Task 1: Initialize root project (AC: #4)
  - [x] Create root `package.json` with workspace scripts (`test:e2e` placeholder)
  - [x] Create `.gitignore` covering node_modules, dist, .env, .env.dev, .env.test, coverage, .DS_Store, prisma generated client
  - [x] Create `.env.example` documenting all required env vars with safe defaults (see Environment Variables section below)
  - [x] Create `README.md` with project overview, setup instructions, and script reference

- [x] Task 2: Scaffold client package (AC: #1, #2)
  - [x] Run `npm create vite@latest client -- --template react-ts` (or scaffold manually)
  - [x] Verify React 19 is installed (`react@^19`, `react-dom@^19`)
  - [x] Verify Vite is latest stable, `vite.config.ts` present
  - [x] Verify `client/package.json` has `dev`, `build`, `preview` scripts
  - [x] Add `@tanstack/react-query` dependency (needed from E4-S3 onwards, but establish now)
  - [x] Add `date-fns` dependency
  - [x] Add `lucide-react` dependency
  - [x] Add `react-router-dom@^7` dependency

- [x] Task 3: Configure TypeScript strict mode — client (AC: #7)
  - [x] Set `"strict": true` in `client/tsconfig.json`
  - [x] Set `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
  - [x] Verify no TypeScript errors with `npx tsc --noEmit`

- [x] Task 4: Configure Tailwind CSS v4 — client (AC: #5)
  - [x] Install Tailwind CSS v4: `npm install tailwindcss @tailwindcss/vite`
  - [x] Add Tailwind Vite plugin to `vite.config.ts`
  - [x] Configure custom color palette in CSS using `@theme` directive (v4 CSS-first approach — NO `tailwind.config.js`)
  - [x] Define exact colors from Architecture §6 Design System (see Color Palette section below)
  - [x] Verify utility classes work: `bg-pink-500`, `text-text`, `bg-surface`, etc.

- [x] Task 5: Scaffold server package (AC: #1, #3)
  - [x] Create `server/` directory with `package.json`
  - [x] Install Express 5: `npm install express@^5`
  - [x] Install TypeScript tooling: `npm install -D typescript @types/node @types/express tsx`
  - [x] Create `server/src/index.ts` with minimal placeholder (server start)
  - [x] Configure `package.json` scripts: `"dev": "tsx watch src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`
  - [x] Add `"type": "module"` to package.json for ESM support

- [x] Task 6: Configure TypeScript strict mode — server (AC: #7)
  - [x] Create `server/tsconfig.json` with `"strict": true`
  - [x] Set `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
  - [x] Set `"outDir": "./dist"`, `"rootDir": "./src"`
  - [x] Verify no TypeScript errors with `npx tsc --noEmit`

- [x] Task 7: Configure ESLint for both packages (AC: #6)
  - [x] Install ESLint 9+ with flat config support in both packages
  - [x] Client: `npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh`
  - [x] Server: `npm install -D eslint @eslint/js typescript-eslint`
  - [x] Create `client/eslint.config.mjs` with flat config (TypeScript + React rules)
  - [x] Create `server/eslint.config.mjs` with flat config (TypeScript rules)
  - [x] Add `"lint": "eslint ."` script to both package.json files
  - [x] Verify `npm run lint` passes in both packages

- [x] Task 8: Configure Prettier for both packages (AC: #6)
  - [x] Install Prettier in both packages: `npm install -D prettier eslint-config-prettier`
  - [x] Create shared `.prettierrc` at root (or one per package): `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`
  - [x] Create `.prettierignore` (dist, node_modules, coverage)
  - [x] Add `"format": "prettier --write ."` script to both package.json files
  - [x] Ensure ESLint config includes `eslint-config-prettier` to disable conflicting rules
  - [x] Verify `npm run format` works in both packages

- [x] Task 9: Verify complete setup
  - [x] Client dev server starts: `cd client && npm run dev` → Vite serves on localhost:5173
  - [x] Client builds without errors: `cd client && npm run build`
  - [x] Server compiles without errors: `cd server && npx tsc --noEmit`
  - [x] ESLint passes in both packages
  - [x] Prettier passes in both packages
  - [x] Git repo initialized with initial commit

## Dev Notes

### Critical Architecture Constraints

- **Monorepo structure**: Simple shared root, NO monorepo tooling (no Turborepo, no Nx). Each package has its own `package.json`. [Source: Architecture §11, §14]
- **No SSR/SSG**: Client is a pure CSR SPA. No server-side rendering. [Source: Architecture §1]
- **Custom calendar**: Calendar UI is custom-built CSS Grid, NOT a third-party calendar library. [Source: Architecture §6]
- **State management**: `@tanstack/react-query` for server state, React Context for auth, `useState` for local UI. NO Redux, NO Zustand. [Source: Architecture §6]

### Tailwind CSS v4 — CSS-First Configuration (CRITICAL)

Tailwind v4 does NOT use `tailwind.config.js` or `tailwind.config.ts`. Colors are defined via CSS `@theme` directive. The client's main CSS file should contain:

```css
@import "tailwindcss";

@theme {
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-border: #E5E7EB;
  --color-muted: #9CA3AF;
  --color-text: #111827;
  --color-text-secondary: #6B7280;

  --color-pink-50: #FDF2F8;
  --color-pink-100: #FCE7F3;
  --color-pink-300: #F9A8D4;
  --color-pink-400: #F472B6;
  --color-pink-500: #EC4899;
  --color-pink-600: #DB2777;
  --color-pink-700: #BE185D;
}
```

This generates utility classes like `bg-background`, `text-text`, `bg-pink-500`, etc. [Source: Architecture §6 Design System & Color Palette]

### ESLint 9 Flat Config (CRITICAL)

ESLint 9 requires flat config format. Do NOT create `.eslintrc.*` files. Use `eslint.config.mjs` with the array export format. Requires `typescript-eslint` v8+ for ESLint 9 compatibility.

### Express 5 + TypeScript

- Use `tsx` (NOT `ts-node`) for development — faster, better ESM support
- Use `tsx watch` for hot reload during development
- Add `"type": "module"` to `server/package.json` for ESM
- TypeScript config: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`

### Environment Variables (.env.example)

Document all variables needed across the project (values are safe defaults for local dev):

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/habbit_tracker

# Auth
JWT_SECRET=dev-secret-change-in-production-min-256-bits
JWT_EXPIRY=7d

# Email (Phase 2+)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# FROM_EMAIL=noreply@habbittracker.app

# App
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

# AI (Phase 2)
# OPENAI_API_KEY=
# OPENAI_MODEL=gpt-4o-mini
```

### Project Structure Notes

Final directory tree after this story should match:

```
habbit-tracker/
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css          (Tailwind @import + @theme)
│   │   ├── components/        (empty, future use)
│   │   ├── pages/             (empty, future use)
│   │   ├── hooks/             (empty, future use)
│   │   ├── services/          (empty, future use)
│   │   ├── contexts/          (empty, future use)
│   │   ├── types/             (empty, future use)
│   │   └── utils/             (empty, future use)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   └── package.json
├── server/
│   ├── src/
│   │   └── index.ts           (minimal placeholder)
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   └── package.json
├── .gitignore
├── .env.example
├── .prettierrc
├── .prettierignore
├── package.json               (root with workspace scripts)
└── README.md
```

Subdirectories under `client/src/` (components, pages, hooks, services, contexts, types, utils) should be created as empty directories with `.gitkeep` files so the structure is committed. [Source: Architecture §11]

### What This Story Does NOT Include

- No Docker/Docker Compose (E1-S2)
- No database/Prisma setup (E1-S3)
- No Express routes, middleware, or app.ts (E1-S4)
- No CI pipeline (E1-S5)
- No test framework setup (E1-S6)
- No application logic of any kind — this is pure scaffolding

### References

- [Source: Architecture §2 — Tech Stack (all library choices and versions)]
- [Source: Architecture §6 — Frontend Architecture (component hierarchy, route structure, state management, design system, color palette)]
- [Source: Architecture §7 — Backend Architecture (project structure)]
- [Source: Architecture §11 — Project Structure (monorepo layout)]
- [Source: Architecture §12 — Deployment Architecture (env vars)]
- [Source: Architecture §14 — Key Technical Decisions Summary]
- [Source: PRD — Web App Specific Requirements (visual design, responsive design)]
- [Source: Epics — E1 overview, E1-S1 acceptance criteria]

## Dev Agent Record

### Agent Model Used

Claude (claude-4.6-opus)

### Debug Log References

No debug issues encountered. All tasks completed on first pass.

### Completion Notes List

- **Task 1:** Created root `package.json` with workspace scripts, `.gitignore`, `.env.example` (all env vars documented), and `README.md` with setup instructions.
- **Task 2:** Scaffolded client via `npm create vite@latest` with react-ts template. React 19.2.4, Vite 8.0.1 installed. Added `@tanstack/react-query`, `date-fns`, `lucide-react`, `react-router-dom@^7`. Created empty subdirectories (components, pages, hooks, services, contexts, types, utils) with `.gitkeep` files. Removed Vite boilerplate (App.css, default assets).
- **Task 3:** Client tsconfig already had `"strict": true` from Vite scaffold. Target is ES2023 (superset of requested ES2022), module ESNext, moduleResolution bundler — all present. `tsc --noEmit` passes.
- **Task 4:** Installed `tailwindcss` + `@tailwindcss/vite`. Added Tailwind Vite plugin. Configured `@theme` directive in `index.css` with exact pink/grey/white color palette from Architecture §6. Verified via production build.
- **Task 5:** Created `server/` with `package.json` (`"type": "module"`), installed Express 5.1.0, TypeScript tooling (typescript, @types/node, @types/express, tsx). Created minimal `src/index.ts` placeholder.
- **Task 6:** Created `server/tsconfig.json` with strict mode, target ES2022, module/moduleResolution NodeNext, outDir/rootDir configured. `tsc --noEmit` passes.
- **Task 7:** Client ESLint came pre-configured from Vite scaffold (`eslint.config.js` flat config with React hooks + refresh plugins). Created `server/eslint.config.mjs` with TypeScript rules. Both `npm run lint` pass.
- **Task 8:** Installed Prettier + eslint-config-prettier in both packages. Created root `.prettierrc` and `.prettierignore`. Added `format` scripts to both package.json files. Integrated eslint-config-prettier into both ESLint configs. Both `npm run format` and `npm run lint` pass.
- **Task 9:** All verifications passed: client dev server on :5173, client build succeeds, server `tsc --noEmit` succeeds, ESLint and Prettier pass in both packages. Git repo initialized with initial commit.
- **Note:** Client ESLint config uses `eslint.config.js` (Vite default) rather than `.mjs` — functionally equivalent since client has `"type": "module"`.

### File List

- `package.json` (new) — root package.json with workspace scripts
- `.gitignore` (new) — git ignore rules
- `.env.example` (new) — environment variable template
- `README.md` (new) — project overview and setup guide
- `.prettierrc` (new) — shared Prettier configuration
- `.prettierignore` (new) — Prettier ignore rules
- `client/package.json` (modified) — added dependencies and format script
- `client/vite.config.ts` (modified) — added Tailwind Vite plugin
- `client/eslint.config.js` (modified) — added eslint-config-prettier
- `client/src/index.css` (modified) — replaced Vite defaults with Tailwind @theme config
- `client/src/App.tsx` (modified) — replaced Vite boilerplate with Tailwind placeholder
- `client/src/App.css` (deleted) — removed Vite boilerplate
- `client/src/assets/react.svg` (deleted) — removed Vite boilerplate
- `client/src/assets/vite.svg` (deleted) — removed Vite boilerplate
- `client/src/components/.gitkeep` (new)
- `client/src/pages/.gitkeep` (new)
- `client/src/hooks/.gitkeep` (new)
- `client/src/services/.gitkeep` (new)
- `client/src/contexts/.gitkeep` (new)
- `client/src/types/.gitkeep` (new)
- `client/src/utils/.gitkeep` (new)
- `server/package.json` (new) — server package with Express 5, tsx, scripts
- `server/tsconfig.json` (new) — TypeScript strict config for server
- `server/eslint.config.mjs` (new) — ESLint 9 flat config for server
- `server/src/index.ts` (new) — minimal server placeholder
