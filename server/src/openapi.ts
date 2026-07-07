/**
 * OpenAPI 3.0 specification — edit this file to keep docs in sync with routes.
 *
 * To add/update an endpoint:
 *   1. Find or create the relevant tag section below.
 *   2. Add/edit the path entry under `paths`.
 *   3. Add/edit any shared types under `components.schemas`.
 *
 * Served at:  GET /openapi.json   (raw JSON)
 *             GET /api-docs       (Redoc UI)
 */

export function buildOpenApiSpec(serverUrl: string) {
  const appName = process.env.APP_NAME || 'Mail Service';

  return {
    openapi: '3.0.3',
    info: {
      title: `${appName} API`,
      version: '1.0.0',
      description: `
REST API for ${appName} — a multi-tenant transactional email service.

## Authentication

Two schemes are used depending on the route:

| Scheme | Header | Used for |
|--------|--------|----------|
| **API Key** | \`X-API-KEY: <key>\` | Sending email, templates, logs, preview, schemas |
| **Bearer JWT** | \`Authorization: Bearer <token>\` | Account, apps, orgs, AI, admin |

Most production integrations use the **API Key** routes only. Obtain your key from the app settings page.
      `.trim(),
      contact: { name: 'Support', email: `support@${new URL(serverUrl).hostname}` },
    },
    servers: [{ url: `${serverUrl}/v1`, description: 'API v1' }],

    tags: [
      { name: 'Email',           description: 'Send transactional emails and render previews' },
      { name: 'Templates',       description: 'Create and manage email templates (Handlebars)' },
      { name: 'Payload Schemas', description: 'Define and version the data shape templates expect' },
      { name: 'Logs',            description: 'Delivery history and stats for your app' },
      { name: 'Auth',            description: 'Register, login, profile, email verification' },
      { name: 'Apps',            description: 'Manage email apps and team members' },
      { name: 'Organisations',   description: 'Organisation settings, members, and plan' },
      { name: 'AI',              description: 'LLM-assisted template and schema generation' },
      { name: 'Admin',           description: 'Superadmin — users, mailers, platform config, plans' },
    ],

    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY',
          description: 'App API key — obtain from App Settings → API Key tab',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT returned by `/auth/login` or `/auth/register`',
        },
      },
      schemas: {

        // ── Shared primitives ──────────────────────────────────────────
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
          required: ['error'],
        },
        OkTrue: {
          type: 'object',
          properties: { ok: { type: 'boolean', enum: [true] } },
          required: ['ok'],
        },

        // ── Email ──────────────────────────────────────────────────────
        SendPayload: {
          type: 'object',
          required: ['template_slug', 'recipient'],
          properties: {
            template_slug: { type: 'string', example: 'welcome-email' },
            recipient:     { type: 'string', format: 'email', example: 'user@example.com' },
            data:          { type: 'object', additionalProperties: true, example: { user_name: 'Jane' } },
          },
        },
        SendRawPayload: {
          type: 'object',
          required: ['to', 'subject', 'html'],
          properties: {
            to:      { type: 'string', format: 'email' },
            subject: { type: 'string' },
            html:    { type: 'string' },
            text:    { type: 'string' },
          },
        },
        SendResult: {
          type: 'object',
          properties: {
            ok:          { type: 'boolean' },
            message_id:  { type: 'string' },
            log_id:      { type: 'string' },
          },
        },
        PreviewResult: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            html:    { type: 'string' },
          },
        },

        // ── Template ───────────────────────────────────────────────────
        Template: {
          type: 'object',
          properties: {
            _id:               { type: 'string' },
            slug:              { type: 'string', example: 'welcome-email' },
            name:              { type: 'string' },
            subject:           { type: 'string' },
            body_html:         { type: 'string' },
            sender_name:       { type: 'string' },
            use_layout:        { type: 'boolean' },
            is_layout:         { type: 'boolean' },
            is_global:         { type: 'boolean' },
            is_system:         { type: 'boolean' },
            app_id:            { type: 'string', nullable: true },
            layout_slug:       { type: 'string', nullable: true },
            payload_schema_id: { type: 'string', nullable: true },
            created_at:        { type: 'string', format: 'date-time' },
            updated_at:        { type: 'string', format: 'date-time' },
          },
        },
        TemplateWrite: {
          type: 'object',
          required: ['slug', 'name', 'subject', 'body_html'],
          properties: {
            slug:              { type: 'string' },
            name:              { type: 'string' },
            subject:           { type: 'string' },
            body_html:         { type: 'string' },
            sender_name:       { type: 'string' },
            use_layout:        { type: 'boolean' },
            layout_slug:       { type: 'string', nullable: true },
            payload_schema_id: { type: 'string', nullable: true },
          },
        },

        // ── Payload Schema ─────────────────────────────────────────────
        SchemaField: {
          type: 'object',
          required: ['key', 'type', 'required'],
          properties: {
            key:         { type: 'string', example: 'user_name' },
            type:        { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object'] },
            required:    { type: 'boolean' },
            example:     { type: 'string' },
            description: { type: 'string' },
          },
        },
        PayloadSchema: {
          type: 'object',
          properties: {
            _id:            { type: 'string' },
            name:           { type: 'string' },
            description:    { type: 'string' },
            fields:         { type: 'array', items: { '$ref': '#/components/schemas/SchemaField' } },
            is_system:      { type: 'boolean' },
            template_count: { type: 'integer' },
            created_at:     { type: 'string', format: 'date-time' },
            updated_at:     { type: 'string', format: 'date-time' },
          },
        },

        // ── Logs ───────────────────────────────────────────────────────
        EmailLog: {
          type: 'object',
          properties: {
            _id:           { type: 'string' },
            app_id:        { type: 'string', nullable: true },
            template_slug: { type: 'string' },
            recipient:     { type: 'string', format: 'email' },
            status:        { type: 'string', enum: ['success', 'failed', 'unsubscribed'] },
            error_message: { type: 'string' },
            sent_at:       { type: 'string', format: 'date-time' },
          },
        },
        LogsResponse: {
          type: 'object',
          properties: {
            logs:  { type: 'array', items: { '$ref': '#/components/schemas/EmailLog' } },
            total: { type: 'integer' },
            page:  { type: 'integer' },
            pages: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },

        // ── Auth / User ────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            _id:                  { type: 'string' },
            email:                { type: 'string', format: 'email' },
            name:                 { type: 'string' },
            role:                 { type: 'string', enum: ['superadmin', 'user'] },
            is_active:            { type: 'boolean' },
            org_id:               { type: 'string', nullable: true },
            is_org_admin:         { type: 'boolean' },
            phone:                { type: 'string' },
            phone_verified:       { type: 'boolean' },
            email_verified:       { type: 'boolean' },
            profile_image_base64: { type: 'string' },
            created_at:           { type: 'string', format: 'date-time' },
            updated_at:           { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token:             { type: 'string' },
            user:              { '$ref': '#/components/schemas/User' },
            needs_verification: { type: 'boolean' },
          },
        },

        // ── App ────────────────────────────────────────────────────────
        EmailApp: {
          type: 'object',
          properties: {
            _id:            { type: 'string' },
            app_name:       { type: 'string' },
            app_url:        { type: 'string' },
            api_key:        { type: 'string' },
            owner_id:       { type: 'string' },
            smtp_host:      { type: 'string' },
            smtp_port:      { type: 'integer' },
            smtp_secure:    { type: 'boolean' },
            smtp_user:      { type: 'string' },
            smtp_from_name: { type: 'string' },
            llm_enabled:    { type: 'boolean' },
            llm_min_role:   { type: 'string', enum: ['owner', 'editor', 'viewer'] },
            my_role:        { type: 'string', enum: ['owner', 'editor', 'viewer'] },
            created_at:     { type: 'string', format: 'date-time' },
            updated_at:     { type: 'string', format: 'date-time' },
          },
        },
        AppMember: {
          type: 'object',
          properties: {
            _id:        { type: 'string' },
            app_id:     { type: 'string' },
            user_id:    { type: 'string' },
            role:       { type: 'string', enum: ['owner', 'editor', 'viewer'] },
            can_read:   { type: 'boolean' },
            can_write:  { type: 'boolean' },
            can_delete: { type: 'boolean' },
            can_manage: { type: 'boolean' },
            user:       { type: 'object', nullable: true, properties: { _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } },
          },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Paths
    // ─────────────────────────────────────────────────────────────────────────
    paths: {

      // ── Auth ─────────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          description: 'First user registered automatically becomes superadmin.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['name', 'email', 'password'],
              properties: {
                name:     { type: 'string' },
                email:    { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                phone:    { type: 'string' },
              },
            }}},
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/AuthResponse' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
            409: { description: 'Email already registered' },
          },
        },
      },

      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['email', 'password'],
              properties: {
                email:    { type: 'string', format: 'email' },
                password: { type: 'string' },
              },
            }}},
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid credentials' },
          },
        },
      },

      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
          },
        },
        put: {
          tags: ['Auth'],
          summary: 'Update profile / change password',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                name:                 { type: 'string' },
                email:                { type: 'string', format: 'email' },
                phone:                { type: 'string' },
                password:             { type: 'string', minLength: 8 },
                profile_image_base64: { type: 'string', description: 'Base64-encoded image, max ~300 KB' },
              },
            }}},
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { '$ref': '#/components/schemas/AuthResponse' } } } },
          },
        },
      },

      '/auth/verify-email': {
        get: {
          tags: ['Auth'],
          summary: 'Verify email address via token link',
          parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Verified', content: { 'application/json': { schema: { '$ref': '#/components/schemas/OkTrue' } } } },
            400: { description: 'Invalid or expired token' },
          },
        },
      },

      '/auth/resend-verification': {
        post: {
          tags: ['Auth'],
          summary: 'Resend email verification link',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Sent', content: { 'application/json': { schema: { '$ref': '#/components/schemas/OkTrue' } } } },
            400: { description: 'Already verified' },
            503: { description: 'Mailer not configured' },
          },
        },
      },

      // ── Email ─────────────────────────────────────────────────────────────
      '/send': {
        post: {
          tags: ['Email'],
          summary: 'Send a templated email',
          description: 'Renders a Handlebars template with `data`, then delivers via the app\'s SMTP config.',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/SendPayload' } } },
          },
          responses: {
            200: { description: 'Sent', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SendResult' } } } },
            400: { description: 'Missing fields or template not found' },
            401: { description: 'Invalid or missing API key' },
            500: { description: 'SMTP delivery failed' },
          },
        },
      },

      '/send/raw': {
        post: {
          tags: ['Email'],
          summary: 'Send a raw HTML email (no template)',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/SendRawPayload' } } },
          },
          responses: {
            200: { description: 'Sent', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SendResult' } } } },
          },
        },
      },

      '/preview': {
        post: {
          tags: ['Email'],
          summary: 'Render a template preview (no email sent)',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/SendPayload' } } },
          },
          responses: {
            200: { description: 'Rendered HTML', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PreviewResult' } } } },
          },
        },
      },

      '/preview/raw': {
        post: {
          tags: ['Email'],
          summary: 'Render arbitrary HTML through the layout (no email sent)',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object',
              required: ['html'],
              properties: {
                html:        { type: 'string' },
                layout_slug: { type: 'string' },
                data:        { type: 'object', additionalProperties: true },
              },
            }}},
          },
          responses: {
            200: { description: 'Rendered HTML', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PreviewResult' } } } },
          },
        },
      },

      // ── Templates ─────────────────────────────────────────────────────────
      '/templates': {
        get: {
          tags: ['Templates'],
          summary: 'List templates for this app (includes globals)',
          security: [{ apiKey: [] }],
          parameters: [
            { name: 'q',          in: 'query', schema: { type: 'string' }, description: 'Search by name or slug' },
            { name: 'is_layout',  in: 'query', schema: { type: 'boolean' } },
            { name: 'schema_id',  in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Template' } } } } },
          },
        },
        post: {
          tags: ['Templates'],
          summary: 'Create a new template',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/TemplateWrite' } } },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Template' } } } },
            409: { description: 'Slug already in use' },
          },
        },
      },

      '/templates/{slug}': {
        get: {
          tags: ['Templates'],
          summary: 'Get a single template',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Template' } } } },
            404: { description: 'Not found' },
          },
        },
        put: {
          tags: ['Templates'],
          summary: 'Update a template',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/TemplateWrite' } } },
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Template' } } } },
          },
        },
        delete: {
          tags: ['Templates'],
          summary: 'Delete a template',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Deleted', content: { 'application/json': { schema: { '$ref': '#/components/schemas/OkTrue' } } } },
            403: { description: 'System templates cannot be deleted' },
          },
        },
      },

      '/templates/{slug}/versions': {
        get: {
          tags: ['Templates'],
          summary: 'List versions of a template',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Templates'],
          summary: 'Create a new version',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 201: { description: 'Created' } },
        },
      },

      // ── Payload Schemas ───────────────────────────────────────────────────
      '/payload-schemas': {
        get: {
          tags: ['Payload Schemas'],
          summary: 'List payload schemas',
          security: [{ apiKey: [] }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/PayloadSchema' } } } } },
          },
        },
        post: {
          tags: ['Payload Schemas'],
          summary: 'Create a payload schema',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['name'],
              properties: {
                name:        { type: 'string' },
                description: { type: 'string' },
                fields:      { type: 'array', items: { '$ref': '#/components/schemas/SchemaField' } },
              },
            }}},
          },
          responses: { 201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PayloadSchema' } } } } },
        },
      },

      '/payload-schemas/{id}': {
        get: {
          tags: ['Payload Schemas'], summary: 'Get a payload schema',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PayloadSchema' } } } } },
        },
        put: {
          tags: ['Payload Schemas'], summary: 'Update a payload schema',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Payload Schemas'], summary: 'Delete a payload schema',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Deleted' },
            403: { description: 'System schemas cannot be deleted' },
          },
        },
      },

      // ── Logs ──────────────────────────────────────────────────────────────
      '/logs': {
        get: {
          tags: ['Logs'],
          summary: 'List delivery logs for this app',
          security: [{ apiKey: [] }],
          parameters: [
            { name: 'page',          in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit',         in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'status',        in: 'query', schema: { type: 'string', enum: ['success', 'failed'] } },
            { name: 'template_slug', in: 'query', schema: { type: 'string' } },
            { name: 'recipient',     in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/LogsResponse' } } } },
          },
        },
      },

      '/logs/stats': {
        get: {
          tags: ['Logs'],
          summary: 'Delivery stats and chart data for this app',
          security: [{ apiKey: [] }],
          responses: { 200: { description: 'OK' } },
        },
      },

      '/logs/{id}': {
        delete: {
          tags: ['Logs'], summary: 'Delete a log entry',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      // ── Apps ──────────────────────────────────────────────────────────────
      '/apps': {
        get: {
          tags: ['Apps'], summary: 'List your email apps',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/EmailApp' } } } } } },
        },
        post: {
          tags: ['Apps'], summary: 'Create an email app',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['app_name'],
              properties: {
                app_name:       { type: 'string' },
                app_url:        { type: 'string' },
                smtp_host:      { type: 'string' },
                smtp_port:      { type: 'integer' },
                smtp_secure:    { type: 'boolean' },
                smtp_user:      { type: 'string' },
                smtp_pass:      { type: 'string' },
                smtp_from_name: { type: 'string' },
              },
            }}},
          },
          responses: { 201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/EmailApp' } } } } },
        },
      },

      '/apps/{id}': {
        get: {
          tags: ['Apps'], summary: 'Get an app',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' } },
        },
        put: {
          tags: ['Apps'], summary: 'Update an app',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Apps'], summary: 'Delete an app',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      '/apps/{id}/regenerate-key': {
        post: {
          tags: ['Apps'], summary: 'Rotate the API key',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'New key issued', content: { 'application/json': { schema: { type: 'object', properties: { api_key: { type: 'string' } } } } } } },
        },
      },

      '/apps/{id}/members': {
        get: {
          tags: ['Apps'], summary: 'List app members',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/AppMember' } } } } } },
        },
        post: {
          tags: ['Apps'], summary: 'Invite a member by email',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['email', 'role'],
              properties: {
                email: { type: 'string', format: 'email' },
                role:  { type: 'string', enum: ['owner', 'editor', 'viewer'] },
              },
            }}},
          },
          responses: { 201: { description: 'Added' } },
        },
      },

      '/apps/{id}/members/{userId}': {
        put: {
          tags: ['Apps'], summary: 'Update a member\'s role',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id',     in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Apps'], summary: 'Remove a member',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id',     in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Removed' } },
        },
      },

      // ── Organisations ─────────────────────────────────────────────────────
      '/orgs': {
        post: {
          tags: ['Organisations'], summary: 'Create an organisation',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } },
          },
          responses: { 201: { description: 'Created' } },
        },
      },

      '/orgs/me': {
        get: {
          tags: ['Organisations'], summary: 'Get your organisation',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
        put: {
          tags: ['Organisations'], summary: 'Update organisation name / logo',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Updated' } },
        },
      },

      '/orgs/me/members': {
        get: {
          tags: ['Organisations'], summary: 'List org members',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Organisations'], summary: 'Invite a member',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Invited' } },
        },
      },

      '/orgs/join': {
        post: {
          tags: ['Organisations'], summary: 'Join an org by invite code',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['invite_code'], properties: { invite_code: { type: 'string' } } } } },
          },
          responses: { 200: { description: 'Joined' } },
        },
      },

      // ── AI ────────────────────────────────────────────────────────────────
      '/ai/generate': {
        post: {
          tags: ['AI'],
          summary: 'Generate template HTML or subject with AI',
          description: 'Requires platform AI to be enabled and the app\'s `llm_enabled` flag set.',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['type', 'prompt'],
              properties: {
                type:   { type: 'string', enum: ['template', 'subject'] },
                prompt: { type: 'string' },
              },
            }}},
          },
          responses: {
            200: { description: 'Generated', content: { 'application/json': { schema: { type: 'object', properties: { html: { type: 'string' }, subject: { type: 'string' } } } } } },
            403: { description: 'AI not enabled for this app or user role' },
          },
        },
      },

      '/ai/improve': {
        post: {
          tags: ['AI'], summary: 'Improve existing template HTML with AI',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['html', 'instruction'],
              properties: {
                html:        { type: 'string' },
                instruction: { type: 'string' },
              },
            }}},
          },
          responses: { 200: { description: 'Improved HTML' } },
        },
      },

      '/ai/schema': {
        post: {
          tags: ['AI'], summary: 'Generate a payload schema from a description',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['description'],
              properties: { description: { type: 'string' } },
            }}},
          },
          responses: { 200: { description: 'Generated schema fields' } },
        },
      },

      // ── Admin ─────────────────────────────────────────────────────────────
      '/admin/dashboard': {
        get: {
          tags: ['Admin'], summary: 'Platform-wide dashboard stats',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
      },

      '/admin/users': {
        get: {
          tags: ['Admin'], summary: 'List all users',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'role',   in: 'query', schema: { type: 'string', enum: ['superadmin', 'user'] } },
            { name: 'org_id', in: 'query', schema: { type: 'string' } },
            { name: 'page',   in: 'query', schema: { type: 'integer' } },
            { name: 'limit',  in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Admin'], summary: 'Create a user',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Created' } },
        },
      },

      '/admin/users/{id}': {
        put: {
          tags: ['Admin'], summary: 'Update a user',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Admin'], summary: 'Delete a user',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      '/admin/mailers': {
        get: {
          tags: ['Admin'], summary: 'List platform mailers',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Admin'], summary: 'Add a platform mailer',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Created' } },
        },
      },

      '/admin/mailers/{id}': {
        put: {
          tags: ['Admin'], summary: 'Update a mailer',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Admin'], summary: 'Delete a mailer',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      '/admin/mailers/test': {
        post: {
          tags: ['Admin'], summary: 'Test a mailer config (sends a real email)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['host', 'user', 'pass', 'test_to'],
              properties: {
                host:       { type: 'string' },
                port:       { type: 'integer' },
                secure:     { type: 'boolean' },
                user:       { type: 'string' },
                pass:       { type: 'string' },
                from_name:  { type: 'string' },
                from_email: { type: 'string' },
                test_to:    { type: 'string', format: 'email' },
              },
            }}},
          },
          responses: { 200: { description: 'OK' }, 502: { description: 'SMTP error' } },
        },
      },

      '/admin/platform': {
        get: {
          tags: ['Admin'], summary: 'Get platform config (LLM + verification)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
        put: {
          tags: ['Admin'], summary: 'Update platform config',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Updated' } },
        },
      },

      '/admin/platform/mailer-status': {
        get: {
          tags: ['Admin'], summary: 'Check whether a mail config is available',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              configured:      { type: 'boolean' },
              has_db_mailer:   { type: 'boolean' },
              has_env_mailer:  { type: 'boolean' },
              env_vars_needed: { type: 'array', items: { type: 'string' }, nullable: true },
            },
          }}}}},
        },
      },

      '/admin/reverify/all': {
        post: {
          tags: ['Admin'], summary: 'Reset email verification for all users and resend tokens',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { include_superadmin: { type: 'boolean' } } } } },
          },
          responses: { 200: { description: 'Queued', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, queued: { type: 'integer' } } } } } } },
        },
      },

      '/admin/reverify/{userId}': {
        post: {
          tags: ['Admin'], summary: 'Reset email verification for a single user',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' } },
        },
      },
    },
  };
}
