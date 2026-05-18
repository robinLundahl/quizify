import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import { createServer } from 'http'
import { initSocket } from './socket/index.js'
import { configurePassport } from './lib/passport.js'
import authRouter from './routes/auth.js'

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

configurePassport()

app.use('/api/auth', authRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

initSocket(httpServer)

const PORT = process.env['PORT'] ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
