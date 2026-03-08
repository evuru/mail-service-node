import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { IEmailApp } from '../models/EmailApp';

// Per-app transporter cache keyed by app._id
const cache = new Map<string, Transporter>();

export function getAppTransporter(app: IEmailApp): Transporter {
  const cached = cache.get(app._id);
  if (cached) return cached;
  const t = nodemailer.createTransport({
    host: app.smtp_host,
    port: app.smtp_port,
    secure: app.smtp_secure,
    auth: { user: app.smtp_user, pass: app.smtp_pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
  cache.set(app._id, t);
  return t;
}

// Call after updating an app's SMTP config to discard the stale transporter
export function clearAppTransporter(appId: string): void {
  cache.delete(appId);
}

export async function verifyAppTransporter(app: IEmailApp): Promise<void> {
  const t = getAppTransporter(app);
  await t.verify();
}
