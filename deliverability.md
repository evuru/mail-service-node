Email Deliverability & Anti-Spam Configuration

Since you are using custom SMTP (Hostinger, GoDaddy, etc.), you are responsible for the domain's reputation. Follow these four pillars to ensure emails land in the Inbox.

1. DNS Authentication (The "Big Three")

You must add these records to the DNS settings of every sending domain/subdomain:

SPF (Sender Policy Framework): Tells mail servers which IPs/Services are allowed to send on your behalf.

Value: v=spf1 include:_spf.mail.hostinger.com ~all (Adjust based on provider).

DKIM (DomainKeys Identified Mail): Adds a cryptographic signature to the header. Nothing to configure in this app — signing is done by your SMTP provider.

Steps:
1. Go to your provider's dashboard → Email Authentication / DKIM Settings.
2. Copy the TXT record (name like `mail._domainkey.yourdomain.com`, value starts with `v=DKIM1; k=rsa; p=...`).
3. Add it as a TXT record in your domain registrar's DNS panel.
4. Verify with: dig TXT mail._domainkey.yourdomain.com  or  https://mxtoolbox.com/dkim.aspx

Note: The provider signs emails automatically once the DNS record is live. No code changes needed.

DMARC: Tells servers what to do if SPF or DKIM fails. Set in your domain registrar's DNS panel — nothing to change in this app.

Steps:
1. Add a TXT record: name = _dmarc.yourdomain.com, value = v=DMARC1; p=none; rua=mailto:you@yourdomain.com; adkim=r; aspf=r;
2. Replace rua email with a real inbox — aggregate reports will be sent there.
3. After 2–4 weeks, once SPF + DKIM are confirmed passing, escalate: p=none → p=quarantine → p=reject
4. Verify with: dig TXT _dmarc.yourdomain.com  or  https://mxtoolbox.com/dmarc.aspx

2. Technical Header Hygiene

The Node.js service should ensure these headers are present:

List-Unsubscribe: Always include an unsubscribe link in the header.

Message-ID: Ensure Nodemailer generates a unique, domain-matched Message-ID.

Precedence: For transactional mail, use Precedence: bulk or Priority: Normal.

3. Content Guardrails

Text-to-HTML Ratio: Never send an email that is only an image. Ensure there is significant text content.

Avoid "Spammy" Words: Avoid excessive use of "FREE," "URGENT," or "ACT NOW" in the subject line.

Consistent From Name: Use a recognizable name, e.g., {{appName}} Notifications <info@aa.bb.com>.

4. IP Warmup

If the domain is brand new, do not send 10,000 emails on day one. Start with 50-100/day and double the volume every 3 days to build trust with Gmail/Outlook filters.