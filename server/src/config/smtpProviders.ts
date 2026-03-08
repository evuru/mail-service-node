export interface SmtpProvider {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  notes?: string;
}

export const SMTP_PROVIDERS: SmtpProvider[] = [
  { name: 'Hostinger',         host: 'smtp.hostinger.com',                      port: 465, secure: true  },
  { name: 'GoDaddy',           host: 'smtpout.secureserver.net',                port: 465, secure: true  },
  { name: 'Namecheap',         host: 'mail.privateemail.com',                   port: 465, secure: true  },
  { name: 'Zoho Mail',         host: 'smtp.zoho.com',                           port: 465, secure: true  },
  { name: 'Gmail',             host: 'smtp.gmail.com',                          port: 587, secure: false, notes: 'Requires App Password if 2FA is enabled' },
  { name: 'Outlook / Hotmail', host: 'smtp.office365.com',                      port: 587, secure: false },
  { name: 'SendGrid',          host: 'smtp.sendgrid.net',                       port: 587, secure: false, notes: 'Username is always "apikey", password is your API key' },
  { name: 'Mailgun',           host: 'smtp.mailgun.org',                        port: 587, secure: false },
  { name: 'Amazon SES',        host: 'email-smtp.us-east-1.amazonaws.com',      port: 587, secure: false, notes: 'Change region in host as needed' },
  { name: 'Brevo (Sendinblue)',host: 'smtp-relay.brevo.com',                    port: 587, secure: false },
];
