import { Router, type Request, type Response, type NextFunction } from 'express'
import passport from 'passport'
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

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

export default router
