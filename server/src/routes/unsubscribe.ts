import { Router, Request, Response } from 'express';
import { verifyUnsubscribeToken } from '../services/emailService';
import { Unsubscribe } from '../models/Unsubscribe';
import { EmailApp } from '../models/EmailApp';

export const unsubscribeRouter = Router();

// GET /v1/unsubscribe?token=<hmac>&email=<address>&app=<appId>
// Public — no auth required (embedded in email links)
unsubscribeRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { token, email, app: appId } = req.query as Record<string, string>;

  if (!token || !email || !appId) {
    res.status(400).send(page('Invalid Link', 'This unsubscribe link is missing required parameters.', false));
    return;
  }

  if (!verifyUnsubscribeToken(token, appId, email)) {
    res.status(403).send(page('Invalid Link', 'This unsubscribe link is invalid or has been tampered with.', false));
    return;
  }

  try {
    const emailApp = await EmailApp.findById(appId);
    const appName = emailApp?.app_name ?? 'this service';

    // Upsert — idempotent, clicking twice is fine
    await Unsubscribe.updateOne(
      { app_id: appId, email: email.toLowerCase() },
      { $setOnInsert: { app_id: appId, email: email.toLowerCase(), unsubscribed_at: new Date() } },
      { upsert: true }
    );

    res.send(page(
      'Unsubscribed',
      `<strong>${email}</strong> has been removed from all future emails from <strong>${appName}</strong>. You will not receive any more messages.`,
      true
    ));
  } catch {
    res.status(500).send(page('Error', 'Something went wrong. Please try again later.', false));
  }
});

// POST /v1/unsubscribe — one-click unsubscribe (RFC 8058 / List-Unsubscribe-Post)
unsubscribeRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { token, email, app: appId } = req.query as Record<string, string>;

  if (!token || !email || !appId || !verifyUnsubscribeToken(token, appId, email)) {
    res.status(403).json({ error: 'Invalid unsubscribe token' });
    return;
  }

  try {
    await Unsubscribe.updateOne(
      { app_id: appId, email: email.toLowerCase() },
      { $setOnInsert: { app_id: appId, email: email.toLowerCase(), unsubscribed_at: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ message: 'Unsubscribed' });
  } catch {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// ─── HTML page helper ─────────────────────────────────────────────────────────

function page(title: string, body: string, success: boolean): string {
  const color = success ? '#16a34a' : '#dc2626';
  const icon = success ? '✓' : '✗';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: ${color}; color: #fff; font-size: 28px; line-height: 56px; margin: 0 auto 24px; }
    h1 { margin: 0 0 12px; font-size: 22px; color: #111827; }
    p { margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}
