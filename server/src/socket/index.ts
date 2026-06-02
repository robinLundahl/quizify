import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { registerGameHandlers } from './gameHandlers.js'
import { verifyToken } from '../lib/jwt.js'

declare module 'socket.io' {
  interface SocketData {
    userId: string | null
    participantId?: string
    sessionId?: string
  }
}

export let io: Server

export function initSocket(httpServer: HttpServer) {
  // Allow both production domains, preview deployments, and local dev
  const allowedOrigins = [
    'http://localhost:5173',
    'https://quizcraft.online',
    'https://www.quizcraft.online',
    process.env['CLIENT_URL'] || '',
  ].filter(Boolean)

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true)

        // Allow exact matches
        if (allowedOrigins.includes(origin)) return callback(null, true)

        // Allow all Vercel preview deployments
        if (origin.endsWith('.vercel.app')) return callback(null, true)

        // Reject other origins
        callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    const token = match?.[1]
    if (token) {
      try {
        const payload = verifyToken(token)
        socket.data.userId = payload.userId
      } catch {
        socket.data.userId = null
      }
    } else {
      socket.data.userId = null
    }
    next()
  })

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)
    registerGameHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })

  return io
}
