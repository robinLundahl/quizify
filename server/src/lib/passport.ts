import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from './prisma.js'

export function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env['GOOGLE_CLIENT_ID'] ?? '',
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
        callbackURL: `${process.env['BACKEND_URL'] ?? 'http://localhost:3001'}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? ''
          const user = await prisma.user.upsert({
            where: { email },
            update: { name: profile.displayName, avatar: profile.photos?.[0]?.value },
            create: {
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              provider: 'google',
            },
          })
          done(null, user)
        } catch (err) {
          done(err as Error)
        }
      }
    )
  )
}
