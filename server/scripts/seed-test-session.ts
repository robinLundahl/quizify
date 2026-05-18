/**
 * Creates a test user + quiz + session for Playwright testing.
 * Outputs a JSON object with { token, sessionId, code } to stdout.
 * Usage: npx tsx scripts/seed-test-session.ts
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import jwt from 'jsonwebtoken'

const pool = new pg.Pool({ connectionString: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  // Upsert a test user
  const user = await prisma.user.upsert({
    where: { email: 'playwright-test@quizify.test' },
    update: {},
    create: {
      email: 'playwright-test@quizify.test',
      name: 'Playwright Test',
      provider: 'test',
    },
  })

  // Upsert a test quiz with one MC question
  let quiz = await prisma.quiz.findFirst({ where: { ownerId: user.id, title: 'Playwright Test Quiz' } })
  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: 'Playwright Test Quiz',
        ownerId: user.id,
        questions: {
          create: [
            {
              type: 'MULTIPLE_CHOICE',
              text: 'What colour is the sky?',
              order: 0,
              timeLimit: 20,
              points: 1000,
              answerOptions: {
                create: [
                  { text: 'Blue', isCorrect: true },
                  { text: 'Red', isCorrect: false },
                  { text: 'Green', isCorrect: false },
                  { text: 'Yellow', isCorrect: false },
                ],
              },
            },
            {
              type: 'TRUE_FALSE',
              text: 'The Earth is flat.',
              order: 1,
              timeLimit: 15,
              points: 500,
              answerOptions: {
                create: [
                  { text: 'True', isCorrect: false },
                  { text: 'False', isCorrect: true },
                ],
              },
            },
          ],
        },
      },
    })
  }

  // Generate a unique 6-char code
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()

  // Create a fresh WAITING session
  const session = await prisma.gameSession.create({
    data: { quizId: quiz.id, hostId: user.id, code },
  })

  // Sign a JWT for this user
  const token = jwt.sign({ userId: user.id }, process.env['JWT_SECRET']!, { expiresIn: '1h' })

  await prisma.$disconnect()
  await pool.end()

  console.log(JSON.stringify({ token, sessionId: session.id, code, quizId: quiz.id, userId: user.id }))
}

main().catch((e) => { console.error(e); process.exit(1) })
