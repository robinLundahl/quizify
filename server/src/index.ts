import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import { createServer } from 'http'
import { initSocket } from './socket/index.js'
import { configurePassport } from './lib/passport.js'
import authRouter from './routes/auth.js'
import quizRouter from './routes/quiz.js'
import sessionsRouter from './routes/sessions.js'
import adminRouter from './routes/admin.js'
import marketplaceRouter from './routes/marketplace.js'
import { requireAuth } from './middleware/requireAuth.js'
import { requireAdmin } from './middleware/requireAdmin.js'

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

configurePassport()

app.use('/api/auth', authRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/admin', requireAuth, requireAdmin, adminRouter)
app.use('/api/marketplace', marketplaceRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

initSocket(httpServer)

const PORT = process.env['PORT'] ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
