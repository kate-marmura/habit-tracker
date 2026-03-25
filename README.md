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

## Screenshots from the app
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 51 34" src="https://github.com/user-attachments/assets/255fd02c-42ea-424f-84e1-33392e9410e2" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 52 31" src="https://github.com/user-attachments/assets/692d72b6-fb74-49cb-9bf2-6fb7ad2983ae" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 52 50" src="https://github.com/user-attachments/assets/6f02e6ee-4149-4a2b-acb9-09b997d45853" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 53 02" src="https://github.com/user-attachments/assets/ebe1f97f-71d7-483d-9275-dae9e8fd1eab" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 53 24" src="https://github.com/user-attachments/assets/ce5a0cbb-4b24-4234-a173-7488e0eb207b" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 53 35" src="https://github.com/user-attachments/assets/e45c953a-3fbd-4305-99c3-a80e65a42f6c" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 53 42" src="https://github.com/user-attachments/assets/7bdcac2c-0cac-4b3e-be66-45c303d63f8f" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 53 46" src="https://github.com/user-attachments/assets/6eb6dced-d9c0-4ad5-b6ec-ca0df50edcb6" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 54 03" src="https://github.com/user-attachments/assets/0fb230b4-130b-4d5a-a292-b246c3cb376f" />
<img width="1510" height="753" alt="Screenshot 2026-03-25 at 14 54 17" src="https://github.com/user-attachments/assets/a9062fb2-c1ae-45f5-9d34-31fd5cb8aa3a" />
