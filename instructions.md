# Email Deliverability — Implementation Guide

This document explains how the mail service meets the four email deliverability pillars. It covers what is implemented in code, what requires manual DNS configuration, and what remains optional for future scaling.

---

## Pillar 1 — DNS Authentication (Manual Setup Required)

These are DNS records you must add in your domain registrar / hosting panel. The service cannot set these for you, but the **App Settings → DNS Guide** tab shows the exact values to copy based on your sending domain.

### SPF (Sender Policy Framework)
Declares which mail servers are authorised to send on your domain's behalf.

| Record | Type | Value |
|--------|------|-------|
| `@` or `yourdomain.com` | TXT | `v=spf1 include:_spf.mail.hostinger.com ~all` |

Adjust the `include:` value to match your provider:
- Hostinger: `include:_spf.mail.hostinger.com`
- GoDaddy: `include:secureserver.net`
- Namecheap: `include:spf.namecheap.com`
- SendGrid: `include:sendgrid.net`
- Mailgun: `include:mailgun.org`
- Zoho: `include:zoho.com`

### DKIM (DomainKeys Identified Mail)
A cryptographic signature added to every outgoing email. Generated inside your email provider's panel (not in Node.js).

1. Go to your SMTP provider's dashboard → Email → DKIM Settings.
2. Copy the TXT record they provide (it will look like `selector._domainkey.yourdomain.com`).
3. Add it to your DNS.

> Note: Hostinger, GoDaddy, and most providers generate DKIM keys automatically when you set up a custom email. Check your email dashboard under "Email Authentication" or "DKIM".

### DMARC (Domain-based Message Authentication)
Tells receiving mail servers what to do if SPF or DKIM fails.

**Start with `p=none` (monitor mode) for the first 2–4 weeks:**

| Record | Type | Value |
|--------|------|-------|
| `_dmarc.yourdomain.com` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; adkim=r; aspf=r;` |

**After reviewing reports, escalate to quarantine:**
```
v=DMARC1; p=quarantine; adkim=r; aspf=r;
```

> `rua` is the email address that will receive aggregate DMARC reports. Use a real inbox you check.

---

## Pillar 2 — Technical Header Hygiene (Implemented in Code)

All of the following are automatically added to every outgoing email by `emailService.ts`.

### Headers Added Automatically

| Header | Value | Purpose |
|--------|-------|---------|
| `Precedence` | `bulk` | Tells mail clients this is bulk/transactional mail — suppresses auto-replies |
| `X-Mailer` | `Mail Service` | Identifies the sending software |
| `List-Unsubscribe` | `<https://yourserver.com/v1/unsubscribe?token=...>` | Required by Gmail / Yahoo for bulk senders; allows one-click unsubscribe |
| `List-Unsubscribe-Post` | `List-Unsubscribe=One-Click` | Enables Gmail's "Unsubscribe" button in the mail header |

### Unsubscribe System

The service generates a per-recipient HMAC token (signed with `JWT_SECRET`) and appends it to a permanent unsubscribe URL. When a recipient clicks the link:

1. The server verifies the token.
2. Their email is added to the `Unsubscribe` collection for that app.
3. A plain HTML confirmation page is returned.
4. All future sends to that address from that app are **silently skipped** (logged as `unsubscribed`).

**Endpoint:** `GET /v1/unsubscribe?token=<hmac>&email=<address>&app=<appId>`

No authentication required — it is a public link embedded in emails.

### Plain Text Alternative

Every HTML email is accompanied by an auto-generated plain text version (HTML tags stripped, entities decoded). This improves the text-to-HTML ratio which spam filters check, and ensures the email is readable in plain-text clients.

### From Field Format

Every email is sent with a properly formatted `From` header:
```
"App Name" <smtp_user@domain.com>
```
This matches the format required by Gmail and Outlook for consistent sender identity.

---

## Pillar 3 — Content Guardrails (Team Responsibility)

These are writing guidelines that must be followed when authoring templates. The service cannot enforce all of them automatically.

### Rules to Follow

1. **Text-to-HTML ratio** — Every template must contain meaningful text content, not just images. The service automatically generates a plain text version to help, but the HTML itself should still have real text.

2. **Avoid spam trigger words** in subject lines:
   - Bad: `FREE OFFER`, `ACT NOW!!!`, `URGENT`, `You've been selected`, `Click here immediately`
   - Good: `Your order #1234 has been confirmed`, `Reset your password`, `Welcome to [App Name]`

3. **Consistent From name** — Use the same `smtp_from_name` across all sends from an app. Changing the sender name frequently damages reputation.

4. **Image-to-text balance** — Never send an email that is a single large image with no text. Spam filters cannot read images.

5. **Unsubscribe link in body** — While `List-Unsubscribe` is set in the header, also include a visible unsubscribe link in the email footer of any marketing or newsletter templates. The variable `{{unsubscribeUrl}}` is automatically injected into every template at send time (if `app_url` or `SERVER_URL` is configured). Example footer usage:
   ```html
   <p style="font-size:11px;color:#999;">
     Don't want these emails? <a href="{{unsubscribeUrl}}">Unsubscribe</a>
   </p>
   ```
   If neither `app_url` nor `SERVER_URL` is set, `{{unsubscribeUrl}}` resolves to an empty string — the link will be present but broken, so ensure a URL is always configured before sending marketing email.

---

## Pillar 4 — IP Warmup (Operational, Not Implemented)

> This pillar is not yet implemented in code. It requires manual discipline unless a rate-limiting feature is added later.

If you are sending from a brand new domain or IP, mail providers are sceptical. Follow this ramp-up schedule:

| Day | Max sends/day |
|-----|--------------|
| 1–3 | 50 |
| 4–6 | 100 |
| 7–9 | 250 |
| 10–12 | 500 |
| 13–15 | 1,000 |
| 16+ | Double every 3 days until desired volume |

**Signs you are going too fast:**
- Emails landing in spam on Gmail or Outlook
- Bounce rates above 2%
- DMARC reports showing failures

**How to warm up:**
- Send to your most engaged users first (people who will open and click).
- Avoid purchasing email lists.
- Monitor your sending domain at [MXToolbox](https://mxtoolbox.com) and [Mail Tester](https://www.mail-tester.com).

**Future implementation option:** Add a `daily_limit` field to the `EmailApp` model. Before sending, count today's successful logs for the app and reject with `429 Too Many Requests` if the limit is reached. This can be enforced per-app from the App Settings page.

---

## Environment Variables Required

Add these to your `.env.*` files:

```env
# Required for List-Unsubscribe header — the public URL of this server
SERVER_URL=https://yourdomain.com

# Already required — also used to sign unsubscribe tokens
JWT_SECRET=your-secret-here
```

---

## DNS Setup Checklist

Use this checklist when deploying a new sending domain:

- [ ] SPF TXT record added for the sending domain
- [ ] DKIM record generated in provider panel and added to DNS
- [ ] DMARC record added (`p=none` to start)
- [ ] `app_url` set in App Settings → General (or `SERVER_URL` env var as server-wide fallback)
- [ ] `smtp_from_name` set to a recognisable brand name in App Settings
- [ ] SMTP credentials tested (use the "Test Send" feature)
- [ ] First sends limited to under 100/day for the first week
- [ ] DMARC reports reviewed after 2 weeks, policy escalated to `p=quarantine`
