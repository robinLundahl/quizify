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

// CORS configuration - allow production, preview, and local dev
const allowedOrigins: string[] = [
  'http://localhost:5173',
  'https://quizcraft.online',
  'https://www.quizcraft.online',
  process.env['CLIENT_URL'] || '',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)

    // Allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true)

    // Allow all Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true)

    // Reject other origins
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
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

const PORT = parseInt(process.env['PORT'] || '3001', 10)
const HOST = process.env['HOST'] ?? '0.0.0.0'
httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
})
