import nodemailer from 'nodemailer';
import { PlatformMailer } from '../models/PlatformMailer';

export interface SystemEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendVia(
  cfg: { host: string; port: number; secure: boolean; user: string; pass: string; from_name: string; from_email: string },
  opts: SystemEmailOptions,
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  const from = `"${cfg.from_name || cfg.user}" <${cfg.from_email || cfg.user}>`;
  await transport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
}

export async function sendSystemEmail(opts: SystemEmailOptions): Promise<void> {
  const mailers = await PlatformMailer.find({ is_active: true }).sort({ priority: 1 }).lean();

  // Try each configured mailer in priority order
  if (mailers.length > 0) {
    let lastErr: Error | null = null;
    for (const m of mailers) {
      try {
        await sendVia(m, opts);
        return;
      } catch (err) {
        lastErr = err as Error;
        console.warn(`[PlatformMailer] "${m.name}" failed: ${lastErr.message}`);
      }
    }
    throw lastErr ?? new Error('All platform mailers failed');
  }

  // Fall back to env-configured SMTP if no DB mailers exist
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    await sendVia(
      {
        host:       process.env.SMTP_HOST,
        port:       Number(process.env.SMTP_PORT) || 587,
        secure:     process.env.SMTP_SECURE === 'true',
        user:       process.env.SMTP_USER,
        pass:       process.env.SMTP_PASS ?? '',
        from_name:  process.env.SMTP_FROM_NAME ?? process.env.APP_NAME ?? 'Mail Service',
        from_email: process.env.SMTP_USER,
      },
      opts,
    );
    return;
  }

  throw new Error('No platform mailer configured (add one in Platform Settings → Mailers)');
}

export async function testMailerConfig(
  cfg: { host: string; port: number; secure: boolean; user: string; pass: string; from_name: string; from_email: string },
  to: string,
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transport.verify();
  await transport.sendMail({
    from: `"${cfg.from_name || cfg.user}" <${cfg.from_email || cfg.user}>`,
    to,
    subject: 'Platform mailer test',
    text: 'This is a test email from your Mail Service platform mailer configuration.',
    html: '<p>This is a test email from your <b>Mail Service</b> platform mailer configuration.</p>',
  });
}
