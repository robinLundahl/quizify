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
│   │   └── ship/
│   │       └── SKILL.md
│   ├── settings.json
│   └── update-readme-structure.py
├── backlog/
│   ├── archive/
│   │   ├── TICKET-001.md
│   │   ├── TICKET-002.md
│   │   └── TICKET-003.md
│   ├── README.md
│   └── TICKET-004.md
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
│   │   │   └── useQuizzes.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── QuizEditor.tsx
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
│   │   │   └── quiz.ts
│   │   ├── services/
│   │   ├── socket/
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
├── package.json
└── README.md
```
