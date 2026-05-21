import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
