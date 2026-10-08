# Supabase Authentication Email Configuration for Ridingo

This document outlines the exact email template and sender configuration to apply in your [Supabase Dashboard](https://supabase.com/dashboard).

---

## 1. Sender Configuration

In your Supabase project dashboard:
1. Navigate to **Project Settings** > **Authentication** > **SMTP Settings** (or **Authentication** > **Email**).
2. Configure the sender details as follows:

| Field | Setting / Value |
|---|---|
| **Sender Name** | `Ridingo` |
| **Sender Email** | `team.ridingo@gmail.com` |
| **Support Email** (optional) | `team.ridingo@gmail.com` |

> **Note:** If you are using Supabase's built-in email service or a custom SMTP provider (e.g., Resend, SendGrid, Amazon SES, or Gmail App Password), ensure the "Sender Email" matches your verified domain / sender identity.

---

## 2. Authentication Email Template (Plain Text)

To remove all images, graphics, and background illustrations:
1. Go to **Authentication** > **Email Templates** in your Supabase Dashboard.
2. Select **Magic Link** (and optionally **Confirm signup** if user registration requires email confirmation).
3. Update the fields below:

### Subject Line:
```text
Your Ridingo verification code: {{ .Token }}
```

### Body (Plain Text Version):
```text
Ridingo Verification

Hello,

Your 6-digit verification code for Ridingo is:

{{ .Token }}

Enter this code in the app to complete your verification. This code is valid for 10 minutes.

For your security, please do not share this code with anyone. Ridingo will never ask you for your verification code.

If you did not request this verification code, you can safely ignore this email.

--------------------------------------------------
Team Ridingo
Contact: team.ridingo@gmail.com
```

---

## 3. Minimal Clean HTML Version (Zero Images & Zero Backgrounds)

If you prefer clean formatted text without any external asset loading or image requests:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ridingo Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; background-color: #ffffff; line-height: 1.6;">
  <div style="max-width: 520px; margin: 0 auto;">
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">Ridingo Verification</h2>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">Hello,</p>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">Your 6-digit verification code for Ridingo is:</p>
    
    <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #111827; padding: 12px 0; font-family: 'Courier New', Courier, monospace;">
      {{ .Token }}
    </div>
    
    <p style="margin: 20px 0 12px 0; font-size: 14px; color: #4b5563;">
      Enter this code in the app to complete your sign-in. This code is valid for 10 minutes.
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6b7280;">
      For your security, do not share this code with anyone. Ridingo will never ask you for this code.
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #6b7280;">
      If you did not request this verification code, please ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    
    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
      Team Ridingo &bull; team.ridingo@gmail.com
    </p>
  </div>
</body>
</html>
```

---

## 4. Key Variables Reference

| Variable | Description |
|---|---|
| `{{ .Token }}` | The 6-digit numeric OTP code entered by the user in the Ridingo app. |
| `{{ .ConfirmationURL }}` | Direct link fallback (optional; not needed for strict 6-digit OTP verification). |
| `{{ .Email }}` | User's recipient email address. |
