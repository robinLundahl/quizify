# Quizify

A Kahoot-style quiz platform. Create and host real-time quizzes with multiple question types including map pins.

**Stack:** React · TypeScript · Node.js · PostgreSQL · Prisma · Socket.io · Tailwind CSS

## Features

- Google OAuth login
- Create and manage quizzes
- Multiple question types: multiple choice, true/false, open-ended, image, and map pin
- Real-time game sessions via WebSockets
- Score tracking per participant

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### 1. Clone the repo

```bash
git clone https://github.com/robinLundahl/quizify.git
cd quizify
```

### 2. Install dependencies

```bash
npm install          # root (concurrently)
cd client && npm install
cd ../server && npm install
```

### 3. Configure environment

Copy the example and fill in your values:

```bash
cp .env.example server/.env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random secret for signing tokens |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `CLIENT_URL` | Frontend URL (default: `http://localhost:5173`) |
| `BACKEND_URL` | Backend URL (default: `http://localhost:3001`) |

### 4. Set up the database

```bash
cd server
npx prisma migrate dev
```

### 5. Run locally

From the project root:

```bash
npm run dev
```

This starts both the backend (port 3001) and the frontend (port 5173) concurrently.

## Project structure

```
quiz/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── store/
│       └── lib/
└── server/          # Express backend
    ├── prisma/      # Schema and migrations
    └── src/
        ├── lib/     # Prisma, JWT, Passport
        ├── middleware/
        ├── routes/
        └── socket/
```
