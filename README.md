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
│   ├── console-2026-05-18T18-05-35-962Z.log
│   ├── console-2026-05-19T05-17-21-809Z.log
│   ├── console-2026-05-19T05-18-04-737Z.log
│   ├── console-2026-05-19T05-19-00-559Z.log
│   ├── console-2026-05-19T05-20-08-205Z.log
│   ├── console-2026-05-19T05-21-48-729Z.log
│   ├── console-2026-05-19T05-22-52-558Z.log
│   ├── console-2026-05-19T05-26-03-205Z.log
│   ├── console-2026-05-19T05-53-23-298Z.log
│   ├── console-2026-05-19T06-00-53-823Z.log
│   ├── console-2026-05-19T06-01-01-910Z.log
│   ├── console-2026-05-19T07-16-36-590Z.log
│   ├── console-2026-05-19T07-29-03-593Z.log
│   ├── console-2026-05-19T07-34-39-094Z.log
│   ├── console-2026-05-19T07-37-13-845Z.log
│   ├── console-2026-05-19T07-44-18-593Z.log
│   ├── console-2026-05-20T07-58-27-772Z.log
│   ├── console-2026-05-20T08-11-16-890Z.log
│   ├── console-2026-05-20T08-11-29-644Z.log
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
│   ├── page-2026-05-18T17-57-02-800Z.yml
│   ├── page-2026-05-19T05-17-22-043Z.yml
│   ├── page-2026-05-19T05-17-32-529Z.yml
│   ├── page-2026-05-19T05-17-44-225Z.yml
│   ├── page-2026-05-19T05-17-50-248Z.yml
│   ├── page-2026-05-19T05-17-56-635Z.yml
│   ├── page-2026-05-19T05-18-01-399Z.yml
│   ├── page-2026-05-19T05-18-04-902Z.yml
│   ├── page-2026-05-19T05-18-21-221Z.png
│   ├── page-2026-05-19T05-19-00-706Z.yml
│   ├── page-2026-05-19T05-19-07-141Z.png
│   ├── page-2026-05-19T05-20-08-336Z.yml
│   ├── page-2026-05-19T05-20-11-904Z.yml
│   ├── page-2026-05-19T05-20-15-581Z.yml
│   ├── page-2026-05-19T05-20-21-592Z.png
│   ├── page-2026-05-19T05-20-28-124Z.yml
│   ├── page-2026-05-19T05-20-35-920Z.png
│   ├── page-2026-05-19T05-22-52-761Z.yml
│   ├── page-2026-05-19T05-22-57-471Z.yml
│   ├── page-2026-05-19T05-23-00-916Z.yml
│   ├── page-2026-05-19T05-23-06-138Z.yml
│   ├── page-2026-05-19T05-26-03-362Z.yml
│   ├── page-2026-05-19T05-26-07-014Z.yml
│   ├── page-2026-05-19T05-26-10-662Z.yml
│   ├── page-2026-05-19T05-26-15-488Z.yml
│   ├── page-2026-05-19T05-26-50-771Z.png
│   ├── page-2026-05-19T05-28-50-779Z.yml
│   ├── page-2026-05-19T05-30-07-811Z.yml
│   ├── page-2026-05-19T05-30-15-910Z.yml
│   ├── page-2026-05-19T05-30-30-882Z.png
│   ├── page-2026-05-19T05-30-40-012Z.yml
│   ├── page-2026-05-19T05-30-49-323Z.yml
│   ├── page-2026-05-19T05-30-54-695Z.yml
│   ├── page-2026-05-19T05-31-01-193Z.png
│   ├── page-2026-05-19T05-53-31-155Z.yml
│   ├── page-2026-05-19T06-00-54-770Z.yml
│   ├── page-2026-05-19T06-01-02-830Z.yml
│   ├── page-2026-05-19T07-16-37-150Z.yml
│   ├── page-2026-05-19T07-16-48-050Z.yml
│   ├── page-2026-05-19T07-16-58-062Z.yml
│   ├── page-2026-05-19T07-17-16-603Z.yml
│   ├── page-2026-05-19T07-29-04-053Z.yml
│   ├── page-2026-05-19T07-29-13-430Z.yml
│   ├── page-2026-05-19T07-29-25-915Z.yml
│   ├── page-2026-05-19T07-29-34-095Z.yml
│   ├── page-2026-05-19T07-34-39-588Z.yml
│   ├── page-2026-05-19T07-34-49-943Z.yml
│   ├── page-2026-05-19T07-34-59-456Z.yml
│   ├── page-2026-05-19T07-37-14-115Z.yml
│   ├── page-2026-05-19T07-37-28-467Z.yml
│   ├── page-2026-05-19T07-37-39-339Z.yml
│   ├── page-2026-05-19T07-44-19-070Z.yml
│   ├── page-2026-05-19T07-44-30-113Z.yml
│   ├── page-2026-05-19T07-44-34-963Z.yml
│   ├── page-2026-05-20T07-58-28-528Z.yml
│   ├── page-2026-05-20T07-58-55-362Z.yml
│   ├── page-2026-05-20T08-11-17-212Z.yml
│   └── page-2026-05-20T08-11-29-775Z.yml
├── backlog/
│   ├── archive/
│   │   ├── TICKET-001.md
│   │   ├── TICKET-002.md
│   │   ├── TICKET-003.md
│   │   ├── TICKET-004.md
│   │   ├── TICKET-005.md
│   │   ├── TICKET-006.md
│   │   ├── TICKET-007.md
│   │   ├── TICKET-008.md
│   │   ├── TICKET-009.md
│   │   ├── TICKET-010.md
│   │   ├── TICKET-011.md
│   │   ├── TICKET-012.md
│   │   ├── TICKET-013.md
│   │   ├── TICKET-014.md
│   │   ├── TICKET-015.md
│   │   ├── TICKET-016.md
│   │   ├── TICKET-017.md
│   │   ├── TICKET-018.md
│   │   ├── TICKET-019.md
│   │   ├── TICKET-020.md
│   │   ├── TICKET-021.md
│   │   ├── TICKET-022.md
│   │   ├── TICKET-023.md
│   │   ├── TICKET-024.md
│   │   ├── TICKET-025.md
│   │   ├── TICKET-027.md
│   │   ├── TICKET-028.md
│   │   ├── TICKET-029.md
│   │   ├── TICKET-030.md
│   │   ├── TICKET-031.md
│   │   ├── TICKET-032.md
│   │   ├── TICKET-033.md
│   │   ├── TICKET-034.md
│   │   ├── TICKET-035.md
│   │   ├── TICKET-036.md
│   │   ├── TICKET-037.md
│   │   └── TICKET-038.md
│   ├── README.md
│   └── TICKET-039.md
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
│   │   │   ├── api.ts
│   │   │   ├── cropImage.ts
│   │   │   └── theme.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── HostView.tsx
│   │   │   ├── JoinView.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── QuizEditor.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ResultsView.tsx
│   │   │   └── Settings.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── themeStore.ts
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
│   │   │   ├── prisma.ts
│   │   │   └── supabase.ts
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
