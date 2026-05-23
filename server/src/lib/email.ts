import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY'])

export async function sendVerificationEmail(to: string, code: string) {
  // In dev with Resend's sandbox address, delivery only works to the account owner's email.
  const recipient = process.env['NODE_ENV'] !== 'production' && process.env['DEV_EMAIL']
    ? process.env['DEV_EMAIL']
    : to

  await resend.emails.send({
    from: process.env['FROM_EMAIL']!,
    to: recipient,
    subject: 'Your Quizify verification code',
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 15 minutes.</p>`,
  })
}
