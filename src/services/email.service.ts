// /src/services/email.service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(
  email: string, 
  temporaryPassword: string,
  invitedBy: string
) {
  const inviteUrl = `${process.env.APP_URL}/signin?email=${encodeURIComponent(email)}`;
  
  await resend.emails.send({
    from: 'GGK Learning <noreply@ggklearning.com>',
    to: email,
    subject: 'You've been invited to GGK Learning System',
    html: `
      <h2>Welcome to GGK Learning System</h2>
      <p>You've been invited by ${invitedBy} to join as an administrator.</p>
      <p>Your temporary password is: <strong>${temporaryPassword}</strong></p>
      <p><a href="${inviteUrl}">Click here to sign in</a></p>
      <p>Please change your password after your first login.</p>
    `
  });
}