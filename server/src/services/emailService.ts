import crypto from 'crypto';
import Handlebars from 'handlebars';
import juice from 'juice';
import { getAppTransporter } from '../config/smtp';
import { Template } from '../models/Template';
import { EmailLog } from '../models/EmailLog';
import { Unsubscribe } from '../models/Unsubscribe';
import type { IEmailApp } from '../models/EmailApp';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGlobalVars(app: IEmailApp): Record<string, string> {
  return {
    appName: app.app_name || 'Mail Service',
    year: new Date().getFullYear().toString(),
  };
}

/** Strip HTML tags and decode common entities to produce a plain-text version. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Generate an HMAC-SHA256 unsubscribe token for a recipient + app pair. */
export function generateUnsubscribeToken(appId: string, email: string): string {
  const secret = process.env.JWT_SECRET!;
  return crypto.createHmac('sha256', secret).update(`${appId}|${email.toLowerCase()}`).digest('hex');
}

/** Verify an unsubscribe token. */
export function verifyUnsubscribeToken(token: string, appId: string, email: string): boolean {
  return generateUnsubscribeToken(appId, email) === token;
}

/** Build the full List-Unsubscribe URL for a given recipient + app.
 *  Priority: app.app_url → SERVER_URL env var.
 *  Returns null if neither is set — caller should omit the header entirely.
 */
function buildUnsubscribeUrl(app: IEmailApp, email: string): string | null {
  const base = (app.app_url || process.env.SERVER_URL || '').replace(/\/$/, '');
  if (!base) return null;
  const token = generateUnsubscribeToken(app._id, email);
  return `${base}/v1/unsubscribe?token=${token}&email=${encodeURIComponent(email)}&app=${app._id}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface SendEmailOptions {
  template_slug: string;
  recipient: string;
  data: Record<string, unknown>;
  app: IEmailApp;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── sendEmail ────────────────────────────────────────────────────────────────

export const sendEmail = async (options: SendEmailOptions): Promise<SendResult> => {
  const { template_slug, recipient, data, app } = options;

  // Check if recipient has unsubscribed from this app
  const unsubscribed = await Unsubscribe.findOne({ app_id: app._id, email: recipient.toLowerCase() });
  if (unsubscribed) {
    await EmailLog.create({
      app_id: app._id, template_id: null, template_slug, recipient,
      status: 'unsubscribed',
    });
    return { success: false, error: 'Recipient has unsubscribed' };
  }

  // Look in app-specific templates first, then global (app_id: null)
  const template =
    await Template.findOne({ slug: template_slug, app_id: app._id, is_layout: false }) ??
    await Template.findOne({ slug: template_slug, app_id: null, is_layout: false });

  if (!template) throw new Error(`Template "${template_slug}" not found`);

  const unsubscribeUrl = buildUnsubscribeUrl(app, recipient);
  const mergedData = { ...getGlobalVars(app), ...data, ...(unsubscribeUrl ? { unsubscribeUrl } : {}) };
  const renderedBody = await buildBody(template.body_html, template.use_layout, template.layout_slug ?? null, app, mergedData);
  const inlinedHtml = juice(renderedBody);
  const plainText = htmlToPlainText(renderedBody);
  const renderedSubject = Handlebars.compile(template.subject)(mergedData);

  const fromName = template.sender_name || app.smtp_from_name || app.app_name || 'Mail Service';
  const from = `"${fromName}" <${app.smtp_user}>`;

  const extraHeaders: Record<string, string> = {
    'Precedence': 'bulk',
    'X-Mailer': 'Mail Service',
  };
  if (unsubscribeUrl) {
    extraHeaders['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    extraHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await getAppTransporter(app).sendMail({
        from,
        to: recipient,
        subject: renderedSubject,
        html: inlinedHtml,
        text: plainText,
        headers: extraHeaders,
      });
      await EmailLog.create({
        app_id: app._id, template_id: template._id, template_slug, recipient, status: 'success',
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[EmailService] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  await EmailLog.create({
    app_id: app._id, template_id: template._id, template_slug, recipient,
    status: 'failed', error_message: lastError?.message,
  });
  return { success: false, error: lastError?.message };
};

// ─── renderTemplate (preview, no send) ───────────────────────────────────────

export const renderTemplate = async (
  template_slug: string,
  data: Record<string, unknown>,
  app: IEmailApp
): Promise<{ subject: string; html: string }> => {
  const template =
    await Template.findOne({ slug: template_slug, app_id: app._id }) ??
    await Template.findOne({ slug: template_slug, app_id: null });

  if (!template) throw new Error(`Template "${template_slug}" not found`);

  const mergedData = { ...getGlobalVars(app), ...data };
  const renderedBody = await buildBody(
    template.body_html,
    template.use_layout && !template.is_layout,
    template.layout_slug ?? null,
    app,
    mergedData
  );
  const html = juice(renderedBody);
  const subject = Handlebars.compile(template.subject)(mergedData);
  return { subject, html };
};

// ─── buildBody ────────────────────────────────────────────────────────────────

async function buildBody(
  bodyHtml: string,
  useLayout: boolean,
  layoutSlug: string | null,
  app: IEmailApp,
  data: Record<string, unknown>
): Promise<string> {
  if (useLayout) {
    const q = layoutSlug ? { slug: layoutSlug, is_layout: true } : { is_layout: true };
    const layout =
      await Template.findOne({ ...q, app_id: app._id }) ??
      await Template.findOne({ ...q, app_id: null });

    if (layout) {
      const renderedBody = Handlebars.compile(bodyHtml)(data);
      return Handlebars.compile(layout.body_html)({ ...data, body: renderedBody });
    }
  }
  return Handlebars.compile(bodyHtml)(data);
}
