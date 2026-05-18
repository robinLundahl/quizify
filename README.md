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
├── .claude/
│   ├── skills/
│   │   ├── frontend-design/
│   │   │   └── SKILL.md
│   │   └── ship/
│   │       └── SKILL.md
│   ├── settings.json
│   ├── settings.local.json
│   └── update-readme-structure.py
├── .playwright-mcp/
│   ├── console-2026-05-18T14-35-50-338Z.log
│   ├── console-2026-05-18T14-36-21-044Z.log
│   ├── console-2026-05-18T14-38-35-883Z.log
│   ├── console-2026-05-18T14-38-57-650Z.log
│   ├── console-2026-05-18T14-40-31-019Z.log
│   ├── console-2026-05-18T17-28-45-736Z.log
│   ├── console-2026-05-18T17-29-33-585Z.log
│   ├── console-2026-05-18T17-31-55-430Z.log
│   ├── page-2026-05-18T14-35-50-838Z.yml
│   ├── page-2026-05-18T14-36-21-233Z.yml
│   ├── page-2026-05-18T14-36-58-082Z.yml
│   ├── page-2026-05-18T14-38-36-041Z.yml
│   ├── page-2026-05-18T14-38-57-800Z.yml
│   ├── page-2026-05-18T14-40-31-259Z.yml
│   ├── page-2026-05-18T14-40-48-948Z.yml
│   ├── page-2026-05-18T14-41-11-854Z.yml
│   ├── page-2026-05-18T14-42-09-356Z.yml
│   ├── page-2026-05-18T14-42-53-123Z.yml
│   ├── page-2026-05-18T17-28-47-374Z.yml
│   ├── page-2026-05-18T17-29-25-619Z.yml
│   ├── page-2026-05-18T17-29-33-858Z.yml
│   ├── page-2026-05-18T17-29-56-673Z.yml
│   ├── page-2026-05-18T17-30-09-479Z.yml
│   ├── page-2026-05-18T17-30-20-943Z.yml
│   ├── page-2026-05-18T17-30-41-317Z.yml
│   ├── page-2026-05-18T17-30-48-245Z.yml
│   ├── page-2026-05-18T17-30-59-861Z.yml
│   ├── page-2026-05-18T17-31-11-122Z.yml
│   ├── page-2026-05-18T17-31-15-023Z.yml
│   ├── page-2026-05-18T17-31-18-646Z.yml
│   ├── page-2026-05-18T17-31-25-369Z.yml
│   ├── page-2026-05-18T17-31-55-548Z.yml
│   ├── page-2026-05-18T17-32-39-618Z.yml
│   ├── page-2026-05-18T17-52-01-805Z.yml
│   ├── page-2026-05-18T17-52-12-813Z.yml
│   ├── page-2026-05-18T17-56-50-389Z.yml
│   └── page-2026-05-18T17-57-02-800Z.yml
├── backlog/
│   ├── archive/
│   │   ├── TICKET-001.md
│   │   ├── TICKET-002.md
│   │   ├── TICKET-003.md
│   │   ├── TICKET-004.md
│   │   ├── TICKET-005.md
│   │   ├── TICKET-006.md
│   │   └── TICKET-007.md
│   ├── README.md
│   └── TICKET-008.md
├── client/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   │   ├── hero.png
│   │   │   └── vite.svg
│   │   ├── components/
│   │   │   ├── quiz/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useQuizzes.ts
│   │   │   └── useSocket.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── HostView.tsx
│   │   │   ├── JoinView.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── QuizEditor.tsx
│   │   │   └── ResultsView.tsx
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── scripts/
│   │   └── seed-test-session.ts
│   ├── src/
│   │   ├── controllers/
│   │   ├── lib/
│   │   │   ├── jwt.ts
│   │   │   ├── passport.ts
│   │   │   └── prisma.ts
│   │   ├── middleware/
│   │   │   └── requireAuth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── quiz.ts
│   │   │   └── sessions.ts
│   │   ├── services/
│   │   ├── socket/
│   │   │   ├── gameHandlers.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── uploads/
│   ├── .gitignore
│   ├── package.json
│   ├── prisma.config.ts
│   └── tsconfig.json
├── .env.example
├── .gitignore
├── CLAUDE.md
├── design.md
├── package.json
└── README.md
```
