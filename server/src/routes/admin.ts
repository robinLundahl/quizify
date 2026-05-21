import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { Plan } from '../generated/prisma/client.js'

const router = Router()

const VALID_PLANS: Plan[] = ['FREE', 'PRO']

router.get('/users', async (req, res) => {
  const search = (req.query['search'] as string | undefined)?.trim()
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: { id: true, name: true, email: true, avatar: true, plan: true, isAdmin: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

router.patch('/users/:id/plan', async (req, res) => {
  const { plan } = req.body as { plan?: Plan }
  if (!plan || !VALID_PLANS.includes(plan)) {
    res.status(400).json({ error: 'plan must be FREE or PRO' })
    return
  }
  const exists = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!exists) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { plan },
    select: { id: true, name: true, email: true, plan: true },
  })
  res.json(user)
})

export default router
