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
│   │   ├── backlog/
│   │   │   └── SKILL.md
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
│   ├── console-2026-05-21T09-43-30-339Z.log
│   ├── console-2026-05-21T09-45-22-632Z.log
│   ├── console-2026-05-21T09-59-12-689Z.log
│   ├── console-2026-05-24T07-15-50-296Z.log
│   ├── console-2026-05-24T07-19-02-115Z.log
│   ├── console-2026-05-24T07-29-33-083Z.log
│   ├── console-2026-05-24T07-37-21-755Z.log
│   ├── console-2026-05-24T07-37-43-465Z.log
│   ├── console-2026-05-24T07-41-11-338Z.log
│   ├── console-2026-05-24T07-49-22-045Z.log
│   ├── console-2026-05-24T08-23-25-801Z.log
│   ├── console-2026-05-26T09-19-02-727Z.log
│   ├── console-2026-05-26T09-19-45-153Z.log
│   ├── console-2026-05-26T09-26-32-488Z.log
│   ├── console-2026-05-26T09-51-45-879Z.log
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
│   ├── page-2026-05-20T08-11-29-775Z.yml
│   ├── page-2026-05-21T09-43-30-815Z.yml
│   ├── page-2026-05-21T09-43-42-504Z.png
│   ├── page-2026-05-21T09-43-49-837Z.yml
│   ├── page-2026-05-21T09-43-53-964Z.png
│   ├── page-2026-05-21T09-43-57-914Z.yml
│   ├── page-2026-05-21T09-44-01-833Z.png
│   ├── page-2026-05-21T09-44-19-661Z.yml
│   ├── page-2026-05-21T09-44-25-563Z.png
│   ├── page-2026-05-21T09-45-22-742Z.yml
│   ├── page-2026-05-21T09-45-26-048Z.yml
│   ├── page-2026-05-21T09-45-41-683Z.yml
│   ├── page-2026-05-21T09-45-52-623Z.png
│   ├── page-2026-05-21T09-59-12-961Z.yml
│   ├── page-2026-05-21T09-59-16-838Z.yml
│   ├── page-2026-05-21T09-59-32-930Z.yml
│   ├── page-2026-05-21T09-59-36-946Z.yml
│   ├── page-2026-05-21T09-59-48-751Z.png
│   ├── page-2026-05-24T07-15-50-754Z.yml
│   ├── page-2026-05-24T07-15-57-330Z.png
│   ├── page-2026-05-24T07-16-11-754Z.yml
│   ├── page-2026-05-24T07-16-15-315Z.png
│   ├── page-2026-05-24T07-16-21-077Z.yml
│   ├── page-2026-05-24T07-16-24-602Z.png
│   ├── page-2026-05-24T07-16-54-715Z.yml
│   ├── page-2026-05-24T07-16-59-139Z.yml
│   ├── page-2026-05-24T07-17-20-871Z.png
│   ├── page-2026-05-24T07-19-02-562Z.yml
│   ├── page-2026-05-24T07-19-06-204Z.png
│   ├── page-2026-05-24T07-19-13-572Z.yml
│   ├── page-2026-05-24T07-19-28-766Z.yml
│   ├── page-2026-05-24T07-19-32-956Z.yml
│   ├── page-2026-05-24T07-29-33-291Z.yml
│   ├── page-2026-05-24T07-29-36-691Z.yml
│   ├── page-2026-05-24T07-29-50-913Z.yml
│   ├── page-2026-05-24T07-30-00-606Z.yml
│   ├── page-2026-05-24T07-30-05-134Z.png
│   ├── page-2026-05-24T07-30-42-668Z.yml
│   ├── page-2026-05-24T07-30-47-288Z.png
│   ├── page-2026-05-24T07-37-21-936Z.yml
│   ├── page-2026-05-24T07-37-36-779Z.png
│   ├── page-2026-05-24T07-37-43-709Z.yml
│   ├── page-2026-05-24T07-37-48-566Z.yml
│   ├── page-2026-05-24T07-37-55-529Z.png
│   ├── page-2026-05-24T07-38-00-186Z.yml
│   ├── page-2026-05-24T07-38-08-845Z.png
│   ├── page-2026-05-24T07-41-11-475Z.yml
│   ├── page-2026-05-24T07-41-15-386Z.yml
│   ├── page-2026-05-24T07-41-18-928Z.png
│   ├── page-2026-05-24T07-49-22-229Z.yml
│   ├── page-2026-05-24T07-49-33-323Z.png
│   ├── page-2026-05-24T07-49-39-244Z.yml
│   ├── page-2026-05-24T07-49-43-059Z.yml
│   ├── page-2026-05-24T07-49-48-281Z.png
│   ├── page-2026-05-26T09-19-03-072Z.yml
│   ├── page-2026-05-26T09-19-37-640Z.png
│   ├── page-2026-05-26T09-19-45-355Z.yml
│   ├── page-2026-05-26T09-20-11-897Z.png
│   ├── page-2026-05-26T09-51-46-317Z.yml
│   └── page-2026-05-26T09-52-05-592Z.png
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
│   │   ├── TICKET-038.md
│   │   ├── TICKET-039.md
│   │   ├── TICKET-040.md
│   │   ├── TICKET-041.md
│   │   ├── TICKET-042.md
│   │   ├── TICKET-043.md
│   │   ├── TICKET-044.md
│   │   ├── TICKET-045.md
│   │   ├── TICKET-046.md
│   │   ├── TICKET-047.md
│   │   ├── TICKET-048.md
│   │   ├── TICKET-049.md
│   │   ├── TICKET-050.md
│   │   ├── TICKET-052.md
│   │   ├── TICKET-053.md
│   │   ├── TICKET-054.md
│   │   ├── TICKET-055.md
│   │   ├── TICKET-056.md
│   │   ├── TICKET-057.md
│   │   ├── TICKET-058.md
│   │   ├── TICKET-059.md
│   │   ├── TICKET-060.md
│   │   ├── TICKET-061.md
│   │   ├── TICKET-062.md
│   │   ├── TICKET-073.md
│   │   └── TICKET-084.md
│   ├── README.md
│   ├── TICKET-051.md
│   ├── TICKET-063.md
│   ├── TICKET-064.md
│   ├── TICKET-065.md
│   ├── TICKET-066.md
│   ├── TICKET-067.md
│   ├── TICKET-068.md
│   ├── TICKET-069.md
│   ├── TICKET-070.md
│   ├── TICKET-071.md
│   ├── TICKET-072.md
│   ├── TICKET-074.md
│   ├── TICKET-075.md
│   ├── TICKET-076.md
│   ├── TICKET-077.md
│   ├── TICKET-078.md
│   ├── TICKET-079.md
│   ├── TICKET-080.md
│   ├── TICKET-081.md
│   ├── TICKET-082.md
│   ├── TICKET-083.md
│   └── TICKET-085.md
├── client/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   │   ├── hero.png
│   │   │   └── vite.svg
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── quiz/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useQuizzes.ts
│   │   │   └── useSocket.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── audioUrl.ts
│   │   │   ├── cropImage.ts
│   │   │   └── theme.ts
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   └── sv.json
│   │   ├── pages/
│   │   │   ├── AdminPanel.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── HostView.tsx
│   │   │   ├── JoinView.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── MarketplaceListing.tsx
│   │   │   ├── QuizEditor.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ResultsView.tsx
│   │   │   └── Settings.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── themeStore.ts
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── i18n.ts
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
│   │   │   ├── anthropic.ts
│   │   │   ├── audioUrl.ts
│   │   │   ├── email.ts
│   │   │   ├── jwt.ts
│   │   │   ├── passport.ts
│   │   │   ├── planLimits.ts
│   │   │   ├── prisma.ts
│   │   │   └── supabase.ts
│   │   ├── middleware/
│   │   │   ├── requireAdmin.ts
│   │   │   └── requireAuth.ts
│   │   ├── routes/
│   │   │   ├── admin.ts
│   │   │   ├── auth.ts
│   │   │   ├── marketplace.ts
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
├── brainstorm-marketplace.md
├── CLAUDE.md
├── design.md
├── package.json
└── README.md
```
