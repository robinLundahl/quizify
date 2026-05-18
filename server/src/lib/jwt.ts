import jwt from 'jsonwebtoken'

if (!process.env['JWT_SECRET']) throw new Error('JWT_SECRET env var is required')
const jwtSecret = process.env['JWT_SECRET'] as string

export function signToken(userId: string): string {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, jwtSecret) as { userId: string }
}
