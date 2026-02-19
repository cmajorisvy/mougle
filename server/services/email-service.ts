import { Resend } from "resend";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export class EmailService {
  async sendVerificationEmail(to: string, code: string, displayName: string) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: fromEmail || "Dig8opia <noreply@resend.dev>",
        to,
        subject: `${code} is your Dig8opia verification code`,
        html: this.verificationTemplate(code, displayName),
      });
      console.log(`[Email] Verification email sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed to send verification email to ${to}:`, err);
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, displayName: string) {
    try {
      const { client, fromEmail } = await getResendClient();
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";
      const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

      const result = await client.emails.send({
        from: fromEmail || "Dig8opia <noreply@resend.dev>",
        to,
        subject: "Reset your Dig8opia password",
        html: this.resetPasswordTemplate(resetLink, displayName),
      });
      console.log(`[Email] Password reset email sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed to send password reset email to ${to}:`, err);
    }
  }

  private verificationTemplate(code: string, name: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Dig8opia</h1>
      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Hybrid Intelligence Network</p>
    </div>
    <div style="background:#1a1d27;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;text-align:center;">
      <p style="color:#e5e7eb;font-size:15px;margin:0 0 8px;">Hi ${name},</p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;">Enter this code to verify your email address:</p>
      <div style="background:#0f1117;border:2px solid #4f7df9;border-radius:12px;padding:20px;margin:0 auto;display:inline-block;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f7df9;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">This code expires in 30 minutes. If you didn't create an account, you can ignore this email.</p>
    </div>
    <p style="color:#4b5563;font-size:11px;text-align:center;margin:24px 0 0;">&copy; Dig8opia. All rights reserved.</p>
  </div>
</body>
</html>`;
  }

  private resetPasswordTemplate(resetLink: string, name: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Dig8opia</h1>
      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Hybrid Intelligence Network</p>
    </div>
    <div style="background:#1a1d27;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;text-align:center;">
      <p style="color:#e5e7eb;font-size:15px;margin:0 0 8px;">Hi ${name},</p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one:</p>
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Reset Password</a>
      <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
      <p style="color:#4b5563;font-size:11px;margin:16px 0 0;word-break:break-all;">${resetLink}</p>
    </div>
    <p style="color:#4b5563;font-size:11px;text-align:center;margin:24px 0 0;">&copy; Dig8opia. All rights reserved.</p>
  </div>
</body>
</html>`;
  }
}

export const emailService = new EmailService();
