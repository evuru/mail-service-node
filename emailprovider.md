Hostinger SMTP settings — fill these into server/.env.dev:


SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hello@yourdomain.com   ← your full Hostinger email address
SMTP_PASS=your_email_password    ← the password for that email account
SMTP_FROM_NAME=Your App Name
Where to find them in Hostinger:

Log in to hpanel.hostinger.com
Go to Emails → Email Accounts
Click Manage next to your email
Click Configure Mail Client (or check Email Settings)
You'll see a section like:

Setting	Value
SMTP Host	smtp.hostinger.com
SMTP Port	587 (TLS) or 465 (SSL)
Username	your full email (e.g. hello@yourdomain.com)
Password	the email account's password
Port 587 (what's already in .env.dev) with SMTP_SECURE=false is the standard for Hostinger. If you prefer SSL use port 465 with SMTP_SECURE=true.

The SMTP_USER must be the full email address, not just the username.