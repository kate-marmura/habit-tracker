# Story 1.1: Initialize Monorepo Structure

Status: ready-for-dev

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

- [ ] Task 1: Initialize root project (AC: #4)
  - [ ] Create root `package.json` with workspace scripts (`test:e2e` placeholder)
  - [ ] Create `.gitignore` covering node_modules, dist, .env, .env.dev, .env.test, coverage, .DS_Store, prisma generated client
  - [ ] Create `.env.example` documenting all required env vars with safe defaults (see Environment Variables section below)
  - [ ] Create `README.md` with project overview, setup instructions, and script reference

- [ ] Task 2: Scaffold client package (AC: #1, #2)
  - [ ] Run `npm create vite@latest client -- --template react-ts` (or scaffold manually)
  - [ ] Verify React 19 is installed (`react@^19`, `react-dom@^19`)
  - [ ] Verify Vite is latest stable, `vite.config.ts` present
  - [ ] Verify `client/package.json` has `dev`, `build`, `preview` scripts
  - [ ] Add `@tanstack/react-query` dependency (needed from E4-S3 onwards, but establish now)
  - [ ] Add `date-fns` dependency
  - [ ] Add `lucide-react` dependency
  - [ ] Add `react-router-dom@^7` dependency

- [ ] Task 3: Configure TypeScript strict mode — client (AC: #7)
  - [ ] Set `"strict": true` in `client/tsconfig.json`
  - [ ] Set `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
  - [ ] Verify no TypeScript errors with `npx tsc --noEmit`

- [ ] Task 4: Configure Tailwind CSS v4 — client (AC: #5)
  - [ ] Install Tailwind CSS v4: `npm install tailwindcss @tailwindcss/vite`
  - [ ] Add Tailwind Vite plugin to `vite.config.ts`
  - [ ] Configure custom color palette in CSS using `@theme` directive (v4 CSS-first approach — NO `tailwind.config.js`)
  - [ ] Define exact colors from Architecture §6 Design System (see Color Palette section below)
  - [ ] Verify utility classes work: `bg-pink-500`, `text-text`, `bg-surface`, etc.

- [ ] Task 5: Scaffold server package (AC: #1, #3)
  - [ ] Create `server/` directory with `package.json`
  - [ ] Install Express 5: `npm install express@^5`
  - [ ] Install TypeScript tooling: `npm install -D typescript @types/node @types/express tsx`
  - [ ] Create `server/src/index.ts` with minimal placeholder (server start)
  - [ ] Configure `package.json` scripts: `"dev": "tsx watch src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`
  - [ ] Add `"type": "module"` to package.json for ESM support

- [ ] Task 6: Configure TypeScript strict mode — server (AC: #7)
  - [ ] Create `server/tsconfig.json` with `"strict": true`
  - [ ] Set `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
  - [ ] Set `"outDir": "./dist"`, `"rootDir": "./src"`
  - [ ] Verify no TypeScript errors with `npx tsc --noEmit`

- [ ] Task 7: Configure ESLint for both packages (AC: #6)
  - [ ] Install ESLint 9+ with flat config support in both packages
  - [ ] Client: `npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh`
  - [ ] Server: `npm install -D eslint @eslint/js typescript-eslint`
  - [ ] Create `client/eslint.config.mjs` with flat config (TypeScript + React rules)
  - [ ] Create `server/eslint.config.mjs` with flat config (TypeScript rules)
  - [ ] Add `"lint": "eslint ."` script to both package.json files
  - [ ] Verify `npm run lint` passes in both packages

- [ ] Task 8: Configure Prettier for both packages (AC: #6)
  - [ ] Install Prettier in both packages: `npm install -D prettier eslint-config-prettier`
  - [ ] Create shared `.prettierrc` at root (or one per package): `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`
  - [ ] Create `.prettierignore` (dist, node_modules, coverage)
  - [ ] Add `"format": "prettier --write ."` script to both package.json files
  - [ ] Ensure ESLint config includes `eslint-config-prettier` to disable conflicting rules
  - [ ] Verify `npm run format` works in both packages

- [ ] Task 9: Verify complete setup
  - [ ] Client dev server starts: `cd client && npm run dev` → Vite serves on localhost:5173
  - [ ] Client builds without errors: `cd client && npm run build`
  - [ ] Server compiles without errors: `cd server && npx tsc --noEmit`
  - [ ] ESLint passes in both packages
  - [ ] Prettier passes in both packages
  - [ ] Git repo initialized with initial commit

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

### Debug Log References

### Completion Notes List

### File List
