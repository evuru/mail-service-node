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
A cryptographic signature added to every outgoing email. Generated inside your email provider's panel (not in this app — nothing to configure here).

1. Go to your SMTP provider's dashboard → Email → DKIM Settings (sometimes called "Email Authentication").
2. Generate or locate the DKIM key — most providers (Hostinger, GoDaddy, etc.) create it automatically when you set up a custom email address.
3. Copy the TXT record they provide. It will look like:
   - **Name/Host:** `mail._domainkey.yourdomain.com` (the selector prefix varies by provider)
   - **Value:** `v=DKIM1; k=rsa; p=MIGf...` (long public key string)
4. Go to your **domain registrar's DNS panel** (Cloudflare, Namecheap, GoDaddy, etc.) and add a new **TXT record** with that name and value.
5. Save and allow DNS to propagate (usually minutes, up to 24 h).

**Verify it's working:**
```bash
dig TXT mail._domainkey.yourdomain.com
```
Or use [MXToolbox DKIM Lookup](https://mxtoolbox.com/dkim.aspx) — enter your domain and selector.

> **Nothing to do in this app.** DKIM signing happens at the SMTP provider level. Once the DNS record is live, your provider signs every outgoing email automatically. This service just calls your SMTP server — the provider handles the cryptographic signing.

### DMARC (Domain-based Message Authentication)
Tells receiving mail servers what to do if SPF or DKIM fails. Set up in your **domain registrar's DNS panel** — nothing to change in this app or its `.env` files.

**Add a TXT record:**

| Record | Type | Value |
|--------|------|-------|
| `_dmarc.yourdomain.com` | TXT | `v=DMARC1; p=none; rua=mailto:you@yourdomain.com; adkim=r; aspf=r;` |

Replace `you@yourdomain.com` with a real inbox — Google/Yahoo will send aggregate reports there showing whether SPF and DKIM are passing.

**Policy progression (start permissive, tighten over time):**

| Phase | Policy | When |
|-------|--------|------|
| Monitor | `p=none` | First 2–4 weeks — no action taken, reports only |
| Quarantine | `p=quarantine` | After confirming SPF + DKIM pass in reports |
| Reject | `p=reject` | Once fully confident — failed emails are dropped |

**Verify it's live:**
```bash
dig TXT _dmarc.yourdomain.com
```
Or use [MXToolbox DMARC Lookup](https://mxtoolbox.com/dmarc.aspx).

> `rua` is the reporting inbox. Use a real address you check — DMARC reports tell you if any other server is spoofing your domain.

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
