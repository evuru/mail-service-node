Email Deliverability & Anti-Spam Configuration

Since you are using custom SMTP (Hostinger, GoDaddy, etc.), you are responsible for the domain's reputation. Follow these four pillars to ensure emails land in the Inbox.

1. DNS Authentication (The "Big Three")

You must add these records to the DNS settings of every sending domain/subdomain:

SPF (Sender Policy Framework): Tells mail servers which IPs/Services are allowed to send on your behalf.

Value: v=spf1 include:_spf.mail.hostinger.com ~all (Adjust based on provider).

DKIM (DomainKeys Identified Mail): Adds a cryptographic signature to the header.

Value: Generated in your Hostinger/GoDaddy Email Panel.

DMARC: Tells servers what to do if SPF or DKIM fails.

Value: v=DMARC1; p=quarantine; adkim=r; aspf=r; (Start with p=none to monitor, then move to p=quarantine).

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