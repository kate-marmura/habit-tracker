# Habit Tracker

A habit tracking web application with a calendar-based interface, progress statistics, and AI coaching.

## Tech Stack

- **Client:** React 19, Vite, TypeScript, Tailwind CSS v4, TanStack React Query, React Router v7
- **Server:** Express 5, TypeScript, Prisma, PostgreSQL
- **Auth:** JWT-based authentication

## Project Structure

```
habit-tracker/
├── client/              # React SPA (Vite + TypeScript)
│   ├── Dockerfile       # Multi-stage build → Nginx
│   └── nginx.conf       # SPA routing + API proxy
├── server/              # Express API (TypeScript)
│   └── Dockerfile       # Multi-stage build → Node.js
├── docker-compose.yml   # Dev, prod, and test profiles
├── .env.example         # Environment variable template
├── .prettierrc          # Shared Prettier config
└── package.json         # Root scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

### Running with Docker (recommended)

```bash
# Development — hot reload for both client and server
docker compose --profile dev up --build

# Production-like — Nginx + compiled server
docker compose --profile prod up --build

# Stop all services
docker compose --profile dev down
```

| Profile | Client | Server | DB |
|---------|--------|--------|----|
| `dev` | Vite dev server on `http://localhost:5173` | Express with hot reload on `http://localhost:3001` | PostgreSQL on internal network |
| `prod` | Nginx on `http://localhost:80` | Compiled Node.js on `http://localhost:3001` | PostgreSQL on internal network |
| `test` | — | — | Isolated test DB on `localhost:5433` |

Health check: `curl http://localhost:3001/api/health`

### Running without Docker

1. Install dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
2. Update `DATABASE_URL` in `.env` to use `localhost` instead of `db`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/habit_tracker
   ```
3. Start the development servers:
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
