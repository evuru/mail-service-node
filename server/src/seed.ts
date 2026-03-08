import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { connectDB } from './config/db';
import { Template } from './models/Template';
import { PayloadSchema } from './models/PayloadSchema';
import { User, hashPassword } from './models/User';
import { EmailApp } from './models/EmailApp';
import { AppMember } from './models/AppMember';

// ─── Payload Schemas ──────────────────────────────────────────────────────────

const PAYLOAD_SCHEMAS = [
  {
    name: 'User Basic',
    description: 'Simple user identity fields — shared by welcome, subscribed, and similar templates.',
    fields: [
      { key: 'user_name', type: 'string', required: true,  example: 'Jane Doe',          description: 'User display name or first name' },
      { key: 'email',     type: 'string', required: false, example: 'jane@example.com',   description: 'User email address' },
      { key: 'appName',   type: 'string', required: false, example: 'My App',             description: 'App name shown in the layout header' },
      { key: 'year',      type: 'string', required: false, example: '2025',               description: 'Year shown in the layout footer' },
    ],
  },
  {
    name: 'Verification Code',
    description: 'OTP or email verification code emails.',
    fields: [
      { key: 'user_name', type: 'string', required: true,  example: 'Jane Doe',   description: 'User display name' },
      { key: 'code',      type: 'string', required: true,  example: '123456',     description: 'The one-time verification code' },
      { key: 'expiry',    type: 'string', required: true,  example: '10 minutes', description: 'How long the code remains valid' },
      { key: 'appName',   type: 'string', required: false, example: 'My App',     description: 'App name for the layout header' },
      { key: 'year',      type: 'string', required: false, example: '2025',       description: 'Year for the layout footer' },
    ],
  },
  {
    name: 'Password Reset',
    description: 'Password reset link emails.',
    fields: [
      { key: 'user_name',  type: 'string', required: true,  example: 'Jane Doe',                           description: 'User display name' },
      { key: 'reset_link', type: 'string', required: true,  example: 'https://app.com/reset?token=abc123', description: 'Password reset URL' },
      { key: 'expiry',     type: 'string', required: true,  example: '30 minutes',                         description: 'How long the link stays valid' },
      { key: 'appName',    type: 'string', required: false, example: 'My App',                             description: 'App name for the layout header' },
      { key: 'year',       type: 'string', required: false, example: '2025',                               description: 'Year for the layout footer' },
    ],
  },
  {
    name: 'Order Details',
    description: 'Order confirmation and shipping notification emails.',
    fields: [
      { key: 'user_name',     type: 'string', required: true,  example: 'Jane Doe',                             description: 'Customer name' },
      { key: 'order_id',      type: 'string', required: true,  example: 'ORD-0042',                             description: 'Order reference number' },
      { key: 'items',         type: 'array',  required: true,  example: '[{"name":"Widget","price":"$9.99"}]',   description: 'Array of {name, price} objects' },
      { key: 'total',         type: 'string', required: true,  example: '$9.99',                                description: 'Total order value' },
      { key: 'delivery_date', type: 'string', required: false, example: 'Dec 30, 2025',                         description: 'Expected delivery date' },
      { key: 'appName',       type: 'string', required: false, example: 'My App',                               description: 'App name for the layout header' },
      { key: 'year',          type: 'string', required: false, example: '2025',                                 description: 'Year for the layout footer' },
    ],
  },
];

// ─── Template Bodies ──────────────────────────────────────────────────────────

const BASE_LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background-color: #1d4ed8; padding: 24px 32px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; }
    .content { padding: 32px; color: #374151; line-height: 1.6; font-size: 15px; }
    .content h2 { margin-top: 0; color: #111827; }
    .content a { color: #1d4ed8; }
    .footer { background-color: #f9fafb; padding: 20px 32px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>{{appName}}</h1></div>
    <div class="content">{{{body}}}</div>
    <div class="footer"><p>&copy; {{year}} {{appName}}. All rights reserved.</p></div>
  </div>
</body>
</html>`;

const WELCOME_BODY = `<h2>Welcome, {{user_name}}! 🎉</h2>
<p>We're thrilled to have you on board. Your account has been successfully created.</p>
<ul>
  <li>Complete your profile</li>
  <li>Explore our features</li>
  <li>Reach out to support if you need help</li>
</ul>
<p style="margin-top: 24px;">Best regards,<br/><strong>The Team</strong></p>`;

const PASSWORD_RESET_BODY = `<h2>Reset Your Password</h2>
<p>Hi {{user_name}},</p>
<p>We received a request to reset the password for your account:</p>
<p style="text-align: center; margin: 32px 0;">
  <a href="{{reset_link}}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700;">Reset Password</a>
</p>
<p>This link expires in <strong>{{expiry}}</strong>. If you didn't request this, ignore this email.</p>`;

const VERIFICATION_BODY = `<h2>Verify Your Email</h2>
<p>Hi {{user_name}},</p>
<p>Use the one-time code below to verify your email address:</p>
<p style="text-align: center; margin: 32px 0;">
  <span style="display: inline-block; font-size: 40px; font-weight: 700; letter-spacing: 14px; color: #1d4ed8; background-color: #eff6ff; padding: 20px 40px; border-radius: 8px; border: 2px solid #bfdbfe;">{{code}}</span>
</p>
<p>This code expires in <strong>{{expiry}}</strong>. Do not share it with anyone.</p>`;

const ORDER_BODY = `<h2>Order Confirmed! 🎉</h2>
<p>Hi {{user_name}},</p>
<p>Your order <strong>#{{order_id}}</strong> has been confirmed.</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background-color: #f9fafb;">
      <th style="text-align: left; padding: 10px 14px; border: 1px solid #e5e7eb;">Item</th>
      <th style="text-align: right; padding: 10px 14px; border: 1px solid #e5e7eb;">Price</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e5e7eb;">{{this.name}}</td>
      <td style="text-align: right; padding: 10px 14px; border: 1px solid #e5e7eb;">{{this.price}}</td>
    </tr>
    {{/each}}
  </tbody>
  <tfoot>
    <tr style="font-weight: 700; background-color: #f9fafb;">
      <td style="padding: 10px 14px; border: 1px solid #e5e7eb;">Total</td>
      <td style="text-align: right; padding: 10px 14px; border: 1px solid #e5e7eb;">{{total}}</td>
    </tr>
  </tfoot>
</table>
<p>Estimated delivery: <strong>{{delivery_date}}</strong></p>`;

// ─── Runner ───────────────────────────────────────────────────────────────────

const run = async () => {
  await connectDB();
  console.log('[Seed] Starting...');

  // 1. Seed default superadmin user
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'changeme123';

  let adminUser = await User.findOne({ email: ADMIN_EMAIL });
  if (adminUser) {
    console.log(`[Seed] Skipping admin user "${ADMIN_EMAIL}" (exists)`);
  } else {
    adminUser = await User.create({
      email: ADMIN_EMAIL,
      name: 'Admin',
      password_hash: await hashPassword(ADMIN_PASSWORD),
      role: 'superadmin',
      is_active: true,
    });
    console.log(`[Seed] Created superadmin "${ADMIN_EMAIL}" (password: ${ADMIN_PASSWORD})`);
  }

  // 2. Seed default EmailApp (owned by admin)
  const APP_NAME = process.env.SEED_APP_NAME || 'Default App';
  let defaultApp = await EmailApp.findOne({ owner_id: adminUser._id });
  if (defaultApp) {
    console.log(`[Seed] Skipping default EmailApp (exists: ${defaultApp.app_name})`);
  } else {
    defaultApp = await EmailApp.create({
      app_name: APP_NAME,
      owner_id: adminUser._id,
      api_key: randomUUID(),
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: Number(process.env.SMTP_PORT) || 587,
      smtp_secure: process.env.SMTP_SECURE === 'true',
      smtp_user: process.env.SMTP_USER || '',
      smtp_pass: process.env.SMTP_PASS || '',
      smtp_from_name: process.env.SMTP_FROM_NAME || APP_NAME,
    });
    await AppMember.create({ app_id: defaultApp._id, user_id: adminUser._id, role: 'owner' });
    console.log(`[Seed] Created EmailApp "${APP_NAME}" (api_key: ${defaultApp.api_key})`);
  }

  // 3. Seed payload schemas
  const schemaIds: Record<string, string> = {};
  for (const s of PAYLOAD_SCHEMAS) {
    let schema = await PayloadSchema.findOne({ name: s.name });
    if (schema) {
      console.log(`[Seed] Skipping schema "${s.name}" (exists)`);
    } else {
      schema = await PayloadSchema.create(s);
      console.log(`[Seed] Created schema "${s.name}"`);
    }
    schemaIds[s.name] = schema._id;
  }

  // 4. Seed global templates (app_id: null, is_global: true)
  const templates = [
    {
      slug: '_base_layout',
      name: 'Base Layout',
      subject: 'Base Layout',
      body_html: BASE_LAYOUT,
      is_layout: true,
      use_layout: false,
      app_id: null,
      is_global: true,
      payload_schema_id: null,
    },
    {
      slug: 'welcome-email',
      name: 'Welcome Email',
      subject: 'Welcome to the platform, {{user_name}}!',
      body_html: WELCOME_BODY,
      use_layout: true,
      is_layout: false,
      app_id: null,
      is_global: true,
      payload_schema_id: schemaIds['User Basic'],
    },
    {
      slug: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your password',
      body_html: PASSWORD_RESET_BODY,
      use_layout: true,
      is_layout: false,
      app_id: null,
      is_global: true,
      payload_schema_id: schemaIds['Password Reset'],
    },
    {
      slug: 'verification-code',
      name: 'Verification Code',
      subject: 'Your verification code: {{code}}',
      body_html: VERIFICATION_BODY,
      use_layout: true,
      is_layout: false,
      app_id: null,
      is_global: true,
      payload_schema_id: schemaIds['Verification Code'],
    },
    {
      slug: 'order-confirmation',
      name: 'Order Confirmation',
      subject: 'Order #{{order_id}} confirmed!',
      body_html: ORDER_BODY,
      use_layout: true,
      is_layout: false,
      app_id: null,
      is_global: true,
      payload_schema_id: schemaIds['Order Details'],
    },
  ];

  for (const t of templates) {
    const exists = await Template.findOne({ slug: t.slug, app_id: null });
    if (exists) { console.log(`[Seed] Skipping template "${t.slug}" (exists)`); continue; }
    await Template.create(t);
    console.log(`[Seed] Created global template "${t.slug}"`);
  }

  console.log('[Seed] Done.');
  await mongoose.connection.close();
};

run().catch((err) => { console.error('[Seed] Error:', err); process.exit(1); });
