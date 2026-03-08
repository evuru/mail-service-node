Standard Email Types & Payload Schemas

These 10 schemas define the data your API expects for each specific email type.

1. Welcome Email

Slug: welcome-user

Payload:

{
  "name": "Welcome Email",
  "description": "Welcome users to the platform and provide them with essential information to get started.",
  "fields": [
    { "key": "user_name", "type": "string", "required": true },
    { "key": "action_url", "type": "string", "required": true },
    { "key": "login_id", "type": "string", "required": false }
  ]
}
 

2. OTP Verification

Slug: otp-verification

Payload:

{
  "name": "OTP Code",
  "description": "Sends a one-time password to users for verification purposes, such as during login or sensitive actions.",
  "fields": [
    { "key": "user_name", "type": "string", "required": true },
    { "key": "otp_code", "type": "string", "required": true },
    { "key": "expiry", "type": "string", "required": true, "example": "10 minutes" }
  ]
}


3. Password Reset

Slug: password-reset

Payload:

{
  "name": "Password Reset",
  "description": "Sends a password reset link to users who have forgotten their password.",
  "fields": [
    { "key": "user_name", "type": "string", "required": true },
    { "key": "reset_url", "type": "string", "required": true },
    { "key": "request_ip", "type": "string", "required": false }
  ]
}


4. Transaction Alert (Credit/Debit)

Slug: transaction-alert

Payload:

{
  "name": "Transaction Notification",
  "description": "Alerts users when a transaction occurs.",
  "fields": [
    { "key": "amount", "type": "string", "required": true },
    { "key": "currency", "type": "string", "required": true },
    { "key": "type", "type": "string", "required": true, "description": "Credit or Debit" },
    { "key": "reference", "type": "string", "required": true },
    { "key": "timestamp", "type": "string", "required": true }
  ]
}


5. Security Alert (New Login)

Slug: security-alert

Payload:

{
  "name": "New Login Detected",
  "description": "Alerts users when a new login is detected.",
  "fields": [
    { "key": "device", "type": "string", "required": true },
    { "key": "location", "type": "string", "required": true },
    { "key": "browser", "type": "string", "required": true }
  ]
}


6. Invoice / Receipt

Slug: invoice-receipt

Payload:

{
  "name": "Purchase Receipt",
  "description": "Sends a purchase receipt to users after they complete a transaction.",
  "fields": [
    { "key": "order_id", "type": "string", "required": true },
    { "key": "items", "type": "array", "required": true, "description": "Array of {name, price}" },
    { "key": "total", "type": "string", "required": true },
    { "key": "download_url", "type": "string", "required": true }
  ]
}


7. Account Suspended / Locked

Slug: account-status-update

Payload:

{
  "name": "Account Status Notification",
  "description": "Alerts users when their account status changes (e.g., suspended or locked).",
  "fields": [
    { "key": "reason", "type": "string", "required": true },
    { "key": "support_url", "type": "string", "required": true }
  ]
}


8. Event/Webinar Invitation

Slug: event-invite

Payload:

{
  "name": "Event Invitation",
  "description": "Sends an invitation to users for an upcoming event or webinar.",
  "fields": [
    { "key": "event_name", "type": "string", "required": true },
    { "key": "date", "type": "string", "required": true },
    { "key": "rsvp_url", "type": "string", "required": true }
  ]
}


9. Feedback/Survey Request

Slug: feedback-request

Payload:

{
  "name": "Survey Request",
  "description": "Requests feedback from users after a product or service interaction.",
  "fields": [
    { "key": "product_name", "type": "string", "required": true },
    { "key": "survey_url", "type": "string", "required": true }
  ]
}


10. Low Balance/Usage Warning

Slug: usage-warning

Payload:

{
  "name": "Usage Alert",
  "description": "Alerts users when their usage is low",
  "fields": [
    { "key": "metric", "type": "string", "required": true, "example": "Credits" },
    { "key": "remaining", "type": "number", "required": true },
    { "key": "topup_url", "type": "string", "required": true }
  ]
}
