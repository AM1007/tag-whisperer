import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function sendConfirmationEmail(email, repo, confirmToken) {
  const confirmUrl = `${BASE_URL}/api/confirm/${confirmToken}`;

  await transporter.sendMail({
    from: '"Tag Whisperer" <noreply@tagwhisperer.dev>',
    to: email,
    subject: `Confirm your subscription to ${repo}`,
    html: `
      <h2>Confirm your subscription</h2>
      <p>You subscribed to release notifications for <strong>${repo}</strong>.</p>
      <p><a href="${confirmUrl}">Click here to confirm</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}

export async function sendReleaseNotification(email, repo, tag, unsubscribeToken) {
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe/${unsubscribeToken}`;

  await transporter.sendMail({
    from: '"Tag Whisperer" <noreply@tagwhisperer.dev>',
    to: email,
    subject: `New release: ${repo} ${tag}`,
    html: `
      <h2>New release detected!</h2>
      <p><strong>${repo}</strong> released version <strong>${tag}</strong>.</p>
      <p><a href="https://github.com/${repo}/releases/tag/${tag}">View on GitHub</a></p>
      <hr>
      <p><small><a href="${unsubscribeUrl}">Unsubscribe</a></small></p>
    `,
  });
}