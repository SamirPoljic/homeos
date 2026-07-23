import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Home OS <onboarding@resend.dev>';

export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('RESEND_API_KEY nije postavljen - email nije poslan (samo log):', { to, subject });
    return;
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('Greška pri slanju emaila preko Resend:', err.message);
  }
}
