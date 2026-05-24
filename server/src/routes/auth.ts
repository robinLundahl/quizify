import { Router, type Request, type Response, type NextFunction } from 'express'
import passport from 'passport'
import bcrypt from 'bcrypt'
import multer from 'multer'
import path from 'path'
import { signToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../lib/prisma.js'
import { getSupabase, AVATARS_BUCKET } from '../lib/supabase.js'
import { sendVerificationEmail } from '../lib/email.js'
import type { User } from '../generated/prisma/client.js'

const router = Router()
const CLIENT_URL = process.env['CLIENT_URL'] ?? 'http://localhost:5173'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed.'))
    }
  },
})

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

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await prisma.emailVerification.upsert({
    where: { userId: user.id },
    create: { userId: user.id, code, expiresAt },
    update: { code, expiresAt },
  })
  await sendVerificationEmail(email, code)

  res.json({ pending: true, userId: user.id })
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

  if (!user.emailVerified) {
    res.status(403).json({ error: 'email_not_verified', userId: user.id })
    return
  }

  const token = signToken(user.id)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, plan: user.plan, isAdmin: user.isAdmin, aiGenerationsUsedThisMonth: user.aiGenerationsUsedThisMonth })
})

router.post('/verify-email', async (req: Request, res: Response) => {
  const { userId, code } = req.body as { userId?: string; code?: string }
  if (!userId || !code) {
    res.status(400).json({ error: 'userId and code are required.' })
    return
  }

  const verification = await prisma.emailVerification.findUnique({ where: { userId } })
  if (!verification || verification.code !== code || verification.expiresAt < new Date()) {
    res.status(400).json({ error: 'Invalid or expired code.' })
    return
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  })
  await prisma.emailVerification.delete({ where: { userId } })

  const token = signToken(user.id)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, plan: user.plan, isAdmin: user.isAdmin, aiGenerationsUsedThisMonth: user.aiGenerationsUsedThisMonth })
})

router.post('/resend-verification', async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string }
  if (!userId) {
    res.status(400).json({ error: 'userId is required.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.provider !== 'email' || user.emailVerified) {
    res.status(400).json({ error: 'Cannot resend verification.' })
    return
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await prisma.emailVerification.upsert({
    where: { userId },
    create: { userId, code, expiresAt },
    update: { code, expiresAt },
  })
  await sendVerificationEmail(user.email, code)

  res.json({ ok: true })
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
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, plan: user.plan, isAdmin: user.isAdmin, aiGenerationsUsedThisMonth: user.aiGenerationsUsedThisMonth })
})

router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name cannot be empty.' })
    return
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name: name.trim() },
  })
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, plan: user.plan, isAdmin: user.isAdmin, aiGenerationsUsedThisMonth: user.aiGenerationsUsedThisMonth })
})

router.patch('/avatar', requireAuth, upload.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' })
    return
  }

  const supabase = getSupabase()
  const ext = path.extname(req.file.originalname).toLowerCase()
  const filePath = `${req.userId}/${Date.now()}${ext}`

  // Delete old custom avatar if it's stored in our bucket
  const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatar: true } })
  const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
  if (existing?.avatar?.includes(supabaseUrl) && existing.avatar.includes(AVATARS_BUCKET)) {
    const oldPath = existing.avatar.split(`${AVATARS_BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(AVATARS_BUCKET).remove([oldPath])
  }

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, req.file.buffer, { contentType: req.file.mimetype })

  if (uploadError) {
    res.status(500).json({ error: 'Upload failed. Please try again.' })
    return
  }

  const { data: { publicUrl } } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
  const user = await prisma.user.update({ where: { id: req.userId }, data: { avatar: publicUrl } })
  res.json({ avatar: user.avatar })
})

router.delete('/avatar', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabase()
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatar: true } })

  const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
  if (user?.avatar?.includes(supabaseUrl) && user.avatar.includes(AVATARS_BUCKET)) {
    const oldPath = user.avatar.split(`${AVATARS_BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(AVATARS_BUCKET).remove([oldPath])
  }

  await prisma.user.update({ where: { id: req.userId }, data: { avatar: null } })
  res.json({ ok: true })
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
