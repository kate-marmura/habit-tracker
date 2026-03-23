import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config.js';

let transporter: Transporter;

if (config.NODE_ENV === 'test') {
  transporter = nodemailer.createTransport({ jsonTransport: true });
} else if (config.SMTP_HOST && config.SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth:
      config.SMTP_USER && config.SMTP_PASS
        ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
        : undefined,
  });
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true });
  if (config.NODE_ENV === 'development') {
    console.warn('SMTP not configured — emails will be logged to console');
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  const info = await transporter.sendMail({
    from: config.FROM_EMAIL,
    to: params.to,
    subject: 'Reset your Habbit Tracker password',
    text: `You requested a password reset. Click the link below to set a new password:\n\n${params.resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  });

  if (config.NODE_ENV === 'development' && !config.SMTP_HOST) {
    const raw = info.message;
    if (typeof raw === 'string') {
      try {
        console.log('Password reset email (dev):', JSON.parse(raw));
      } catch {
        console.log('Password reset email (dev):', raw);
      }
    } else {
      console.log('Password reset email (dev):', raw);
    }
  }
}

export { transporter };
