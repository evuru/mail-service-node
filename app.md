Technical Requirements: Template-Based Email Microservice

1. Project Overview

The goal is to build a standalone, open-source Email Template Service that decouples email logic from the main application. It is designed to be highly configurable and provider-agnostic, allowing any application to send emails using their own custom domain and SMTP settings (e.g., Hostinger, GoDaddy, Amazon SES, or Private Mail Servers). It will provide a REST API for sending transactional emails, a database to store HTML templates with dynamic placeholders, and a Management UI for editing and testing those templates.

2. Technical Stack

Runtime: Node.js (v18+)

Framework: Express.js

Email Library: Nodemailer

Templating Engine: Handlebars.js (for variable injection)

CSS Processor: juice (to automatically inline CSS for email client compatibility)

Database: PostgreSQL or MongoDB (to store templates and logs)

SMTP Provider: Configurable (supports Hostinger, GoDaddy, etc.)

3. Core Functional Requirements

A. The Template Engine

Variable Injection: Use Handlebars syntax (e.g., {{user_name}}) to allow dynamic content.

Layout Support: Ability to define a "Base Layout" (header/footer) that all templates wrap into.

Inlining: The service must convert <style> blocks into inline style attributes automatically before sending.

B. Template Management UI
This UI is designed to be decoupled from the core API. While it can initially be served as static HTML/React files directly from the Express server for simplicity (zero-build approach), the architecture supports switching to a separate Vite + React application as the project scales.
Template Gallery: A dashboard listing all active templates (e.g., welcome-email, password-reset).

Live Editor: A split-screen UI:

Left Side: Code editor (Monaco or React-Simple-Code-Editor) for HTML/Handlebars logic.

Right Side: Real-time iframe preview of the rendered email.

Metadata Editor: Fields to edit the "Subject Line" and "Sender Name" per template.

Test Module: A "Send Test" button that prompts for a destination email and a JSON object to simulate the API call.

C. The Sending API

Endpoint: POST /v1/send

Authentication: Requires a static API Key in the header (X-API-KEY).

Payload Structure:

{
  "template_slug": "verification-code",
  "recipient": "user@example.com",
  "data": {
    "code": "123456",
    "expiry": "10 minutes"
  }
}



4. SMTP Configuration (Universal/Configurable)

The developer must implement a flexible configuration system to allow the service to work across various providers (Hostinger, GoDaddy, etc.):

Host: process.env.SMTP_HOST

Port: process.env.SMTP_PORT (e.g., 465 or 587)

Secure: process.env.SMTP_SECURE (Boolean)

Auth: user: process.env.SMTP_USER, pass: process.env.SMTP_PASS

5. API Logic Flow (Sequence)

Receive Request: API validates the API Key and checks if template_slug exists in the DB.

Fetch Template: Retrieve the HTML and Subject from the database.

Compile: Use Handlebars to merge the data object into the HTML and Subject line.

Inline CSS: Pass the resulting HTML through juice to ensure high deliverability across Outlook/Gmail.

Send: Dispatch the email via Nodemailer.

Log: Store a record in the sent_logs table (Status, Recipient, Timestamp).

6. Security & Performance

Rate Limiting: Protect the API from abuse using express-rate-limit.

SMTP Pooling: Enable connection pooling in Nodemailer to reuse the SMTP connection for high-frequency sends.

Error Handling: Implement a retry mechanism (3 attempts) if the SMTP server is temporarily unreachable.

7. Database Schema Suggestion

Table: templates

id (UUID)

slug (String, Unique) - e.g., "welcome-email"

subject (String) - Supports variables like "Welcome {{name}}!"

body_html (Text)

created_at / updated_at (Timestamp)

Table: email_logs

id (UUID)

template_id (FK)

recipient (String)

status (Enum: success, failed)

error_message (Text, nullable)