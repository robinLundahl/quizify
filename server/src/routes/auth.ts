import { Router, type Request, type Response, type NextFunction } from 'express'
import passport from 'passport'
import bcrypt from 'bcrypt'
import { signToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../lib/prisma.js'
import type { User } from '../generated/prisma/client.js'

const router = Router()
const CLIENT_URL = process.env['CLIENT_URL'] ?? 'http://localhost:5173'

function setTokenAndRedirect(res: Response, user: User) {
  const token = signToken(user.id)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.redirect(`${CLIENT_URL}/dashboard`)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string }

  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' })
    return
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Invalid email address.' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.provider !== 'email') {
      res.status(409).json({ error: 'An account with this email already exists. Sign in with Google.' })
    } else {
      res.status(409).json({ error: 'An account with this email already exists.' })
    }
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name: name.trim(), email, provider: 'email', passwordHash },
  })

  const token = signToken(user.id)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar })
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' })
    return
  }
  if (!user.passwordHash) {
    res.status(401).json({ error: 'This account uses Google sign-in. Please log in with Google.' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' })
    return
  }

  const token = signToken(user.id)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar })
})

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=auth` }),
  (req: Request, res: Response, _next: NextFunction) => {
    setTokenAndRedirect(res, req.user as User)
  }
)


router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar })
})

router.delete('/account', requireAuth, async (req, res) => {
  await prisma.user.delete({ where: { id: req.userId } })
  res.clearCookie('token')
  res.json({ ok: true })
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

export default router
