# Habbit Tracker

A habit tracking web application with a calendar-based interface, progress statistics, and AI coaching.

## Tech Stack

- **Client:** React 19, Vite, TypeScript, Tailwind CSS v4, TanStack React Query, React Router v7
- **Server:** Express 5, TypeScript, Prisma, PostgreSQL
- **Auth:** JWT-based authentication

## Project Structure

```
habbit-tracker/
├── client/          # React SPA (Vite + TypeScript)
├── server/          # Express API (TypeScript)
├── .env.example     # Environment variable template
├── .prettierrc      # Shared Prettier config
└── package.json     # Root scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Docker)

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
4. Start the development servers:
   ```bash
   # Terminal 1 - Client
   cd client && npm run dev

   # Terminal 2 - Server
   cd server && npm run dev
   ```

The client runs on `http://localhost:5173` and the server on `http://localhost:3001`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:client` | Start client dev server |
| `npm run dev:server` | Start server dev server |
| `npm run build:client` | Build client for production |
| `npm run build:server` | Compile server TypeScript |
| `npm run lint:client` | Lint client code |
| `npm run lint:server` | Lint server code |
| `npm run format:client` | Format client code |
| `npm run format:server` | Format server code |
| `npm run test:e2e` | Run E2E tests (placeholder) |
