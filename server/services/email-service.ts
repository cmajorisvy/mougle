import { Resend } from "resend";

const ENV_RESEND_API_KEY = process.env.RESEND_API_KEY;
const ENV_RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const APP_BASE_URL = process.env.APP_BASE_URL || "https://www.mougle.com";

// Resend integration via Replit connector
let connectionSettings: any;

async function getCredentials() {
  if (ENV_RESEND_API_KEY) {
    return {
      apiKey: ENV_RESEND_API_KEY,
      fromEmail: ENV_RESEND_FROM_EMAIL || "noreply@mougle.com",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("Resend credentials not found (set RESEND_API_KEY or connect Resend on Replit).");
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
  const connectorFromEmail = connectionSettings.settings.from_email;
  const fromEmail = connectorFromEmail && connectorFromEmail.includes("@mougle.com")
    ? connectorFromEmail
    : "noreply@mougle.com";
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail,
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

const SENDER_LABELS: Record<string, string> = {
  verify: "Mougle Verification",
  notify: "Mougle Notifications",
  billing: "Mougle Billing",
  support: "Mougle Support",
  noreply: "Mougle",
  admin: "Mougle Admin",
};

function getSender(type: keyof typeof SENDER_LABELS, fromEmail?: string): string {
  const label = SENDER_LABELS[type] || "Mougle";
  if (fromEmail) {
    return `${label} <${fromEmail}>`;
  }
  return `${label} <noreply@mougle.com>`;
}

function baseUrl(): string {
  return APP_BASE_URL;
}

function wrapTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0b10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);border-radius:14px;padding:12px 20px;margin-bottom:12px;">
        <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;">M</span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">Mougle</h1>
      <p style="color:#6b7280;font-size:11px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Hybrid Intelligence Network</p>
    </div>
    ${content}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#374151;font-size:10px;margin:0 0 4px;">Digitally signed by Mougle Platform Security</p>
      <p style="color:#374151;font-size:10px;margin:0 0 8px;font-family:monospace;">sig: mgl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}</p>
      <p style="color:#4b5563;font-size:10px;margin:0 0 4px;">This is an automated message from Mougle. Please do not reply to this email.</p>
      <p style="color:#374151;font-size:10px;margin:0;">&copy; ${new Date().getFullYear()} Mougle. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function cardWrap(inner: string): string {
  return `<div style="background:#12141e;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;text-align:center;">${inner}</div>`;
}

export class EmailService {
  async sendVerificationEmail(to: string, code: string, displayName: string) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("verify", fromEmail),
        to,
        subject: `${code} is your Mougle verification code`,
        html: wrapTemplate(cardWrap(`
          <p style="color:#e5e7eb;font-size:15px;margin:0 0 8px;">Hi ${displayName},</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;">Enter this code to verify your email address:</p>
          <div style="background:#0a0b10;border:2px solid #4f7df9;border-radius:12px;padding:20px;margin:0 auto;display:inline-block;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f7df9;font-family:monospace;">${code}</span>
          </div>
          <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">This code expires in 30 minutes. If you didn't create an account, ignore this email.</p>
        `)),
      });
      console.log(`[Email] Verification sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed verification to ${to}:`, err);
    }
  }

  async sendWelcomeEmail(to: string, displayName: string) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("noreply", fromEmail),
        to,
        subject: "Welcome to Mougle — Your Intelligence Journey Starts Now",
        html: wrapTemplate(cardWrap(`
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 8px;font-weight:600;">Welcome, ${displayName}!</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;line-height:1.6;">
            You've joined Mougle — the world's first Hybrid Intelligence Network where humans and AI collaborate to create verified knowledge.
          </p>
          <div style="text-align:left;margin:20px 0;">
            <p style="color:#e5e7eb;font-size:13px;margin:0 0 12px;font-weight:600;">Here's what you can do:</p>
            <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">&#x2713; Explore topics and contribute insights</p>
            <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">&#x2713; Build your trust score and reputation</p>
            <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">&#x2713; Create AI agents and publish apps</p>
            <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">&#x2713; Join live debates and earn credits</p>
          </div>
          <a href="${baseUrl()}" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;margin-top:12px;">Start Exploring</a>
        `)),
      });
      console.log(`[Email] Welcome sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed welcome to ${to}:`, err);
    }
  }

  async sendAccountVerifiedEmail(to: string, displayName: string) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("verify", fromEmail),
        to,
        subject: "Your Mougle Account is Verified!",
        html: wrapTemplate(cardWrap(`
          <div style="font-size:48px;margin-bottom:16px;">&#x2705;</div>
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 8px;font-weight:600;">Account Verified, ${displayName}!</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;line-height:1.6;">
            Your email has been verified and your Mougle account is now fully active.
            You can now access all platform features.
          </p>
          <a href="${baseUrl()}" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Go to Dashboard</a>
        `)),
      });
      console.log(`[Email] Account verified sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed account verified to ${to}:`, err);
    }
  }

  async sendPurchaseConfirmation(to: string, displayName: string, purchase: { plan: string; amount: string; transactionId: string; date: string }) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("billing", fromEmail),
        to,
        subject: `Payment Confirmed — ${purchase.plan} Plan`,
        html: wrapTemplate(cardWrap(`
          <div style="font-size:48px;margin-bottom:16px;">&#x1F4B3;</div>
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 8px;font-weight:600;">Payment Confirmed!</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Hi ${displayName}, your purchase has been processed successfully.</p>
          <div style="background:#0a0b10;border-radius:12px;padding:20px;text-align:left;margin:0 0 20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#6b7280;font-size:12px;">Plan</span>
              <span style="color:#e5e7eb;font-size:12px;font-weight:600;">${purchase.plan}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#6b7280;font-size:12px;">Amount</span>
              <span style="color:#10b981;font-size:12px;font-weight:600;">${purchase.amount}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#6b7280;font-size:12px;">Transaction ID</span>
              <span style="color:#e5e7eb;font-size:12px;font-family:monospace;">${purchase.transactionId}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#6b7280;font-size:12px;">Date</span>
              <span style="color:#e5e7eb;font-size:12px;">${purchase.date}</span>
            </div>
          </div>
          <a href="${baseUrl()}/billing" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:10px;text-decoration:none;">View Billing</a>
        `)),
      });
      console.log(`[Email] Purchase confirmation sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed purchase confirmation to ${to}:`, err);
    }
  }

  async sendInvoiceEmail(to: string, displayName: string, invoice: { invoiceId: string; amount: string; period: string; items: { name: string; amount: string }[] }) {
    try {
      const { client, fromEmail } = await getResendClient();
      const itemsHtml = invoice.items.map(i =>
        `<tr><td style="color:#9ca3af;font-size:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">${i.name}</td><td style="color:#e5e7eb;font-size:12px;padding:8px 0;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${i.amount}</td></tr>`
      ).join("");
      const result = await client.emails.send({
        from: getSender("billing", fromEmail),
        to,
        subject: `Invoice ${invoice.invoiceId} — Mougle`,
        html: wrapTemplate(cardWrap(`
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 8px;font-weight:600;">Invoice</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Hi ${displayName}, here's your invoice for ${invoice.period}.</p>
          <div style="background:#0a0b10;border-radius:12px;padding:16px;margin:0 0 16px;">
            <p style="color:#6b7280;font-size:10px;margin:0 0 4px;">Invoice ID</p>
            <p style="color:#e5e7eb;font-size:13px;font-family:monospace;margin:0 0 12px;">${invoice.invoiceId}</p>
            <table style="width:100%;border-collapse:collapse;">${itemsHtml}
              <tr><td style="color:#e5e7eb;font-size:13px;padding:12px 0 0;font-weight:700;">Total</td><td style="color:#10b981;font-size:14px;padding:12px 0 0;text-align:right;font-weight:700;">${invoice.amount}</td></tr>
            </table>
          </div>
          <a href="${baseUrl()}/billing" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:10px;text-decoration:none;">View Invoice</a>
        `)),
      });
      console.log(`[Email] Invoice sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed invoice to ${to}:`, err);
    }
  }

  async sendPolicyNotification(to: string, displayName: string, policy: { title: string; summary: string; effectiveDate: string }) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("notify", fromEmail),
        to,
        subject: `Policy Update: ${policy.title} — Mougle`,
        html: wrapTemplate(cardWrap(`
          <div style="font-size:48px;margin-bottom:16px;">&#x1F4DC;</div>
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 8px;font-weight:600;">Policy Update</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Hi ${displayName}, we've updated our <strong style="color:#e5e7eb;">${policy.title}</strong>.</p>
          <div style="background:#0a0b10;border-radius:12px;padding:16px;text-align:left;margin:0 0 16px;">
            <p style="color:#6b7280;font-size:10px;text-transform:uppercase;margin:0 0 8px;">What Changed</p>
            <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5;">${policy.summary}</p>
          </div>
          <p style="color:#6b7280;font-size:11px;margin:0 0 16px;">Effective: ${policy.effectiveDate}</p>
          <a href="${baseUrl()}/policy/${policy.title.toLowerCase().replace(/\s+/g, '-')}" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:10px;text-decoration:none;">Read Full Policy</a>
        `)),
      });
      console.log(`[Email] Policy notification sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed policy notification to ${to}:`, err);
    }
  }

  async sendAdminAlert(to: string, alert: { title: string; severity: string; message: string; actionUrl?: string }) {
    try {
      const { client, fromEmail } = await getResendClient();
      const severityColor = alert.severity === "critical" ? "#ef4444" : alert.severity === "high" ? "#f97316" : "#eab308";
      const result = await client.emails.send({
        from: getSender("admin", fromEmail),
        to,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title} — Mougle Admin`,
        html: wrapTemplate(cardWrap(`
          <div style="background:${severityColor};display:inline-block;padding:4px 12px;border-radius:6px;margin-bottom:16px;">
            <span style="color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;">${alert.severity}</span>
          </div>
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 12px;font-weight:600;">${alert.title}</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;line-height:1.6;">${alert.message}</p>
          ${alert.actionUrl ? `<a href="${alert.actionUrl}" style="display:inline-block;background:${severityColor};color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:10px;text-decoration:none;">Take Action</a>` : ""}
        `)),
      });
      console.log(`[Email] Admin alert sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed admin alert to ${to}:`, err);
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, displayName: string) {
    try {
      const { client, fromEmail } = await getResendClient();
      const resetLink = `${baseUrl()}/auth/reset-password?token=${resetToken}`;
      const result = await client.emails.send({
        from: getSender("verify", fromEmail),
        to,
        subject: "Reset your Mougle password",
        html: wrapTemplate(cardWrap(`
          <p style="color:#e5e7eb;font-size:15px;margin:0 0 8px;">Hi ${displayName},</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one:</p>
          <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Reset Password</a>
          <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          <p style="color:#4b5563;font-size:11px;margin:16px 0 0;word-break:break-all;">${resetLink}</p>
        `)),
      });
      console.log(`[Email] Password reset sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed password reset to ${to}:`, err);
    }
  }

  async sendSupportTicketReply(to: string, displayName: string, ticket: { ticketId: string; subject: string; replyContent: string }) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("support", fromEmail),
        to,
        subject: `Re: ${ticket.subject} [Ticket #${ticket.ticketId}]`,
        html: wrapTemplate(cardWrap(`
          <p style="color:#e5e7eb;font-size:15px;margin:0 0 8px;">Hi ${displayName},</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 4px;">Our team has responded to your support ticket:</p>
          <p style="color:#6b7280;font-size:11px;margin:0 0 20px;font-family:monospace;">Ticket #${ticket.ticketId}</p>
          <div style="background:#0a0b10;border-left:3px solid #4f7df9;border-radius:8px;padding:16px;text-align:left;margin:0 0 20px;">
            <p style="color:#e5e7eb;font-size:13px;margin:0;line-height:1.6;white-space:pre-wrap;">${ticket.replyContent}</p>
          </div>
          <a href="${baseUrl()}/support" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:10px;text-decoration:none;">View Ticket</a>
        `)),
      });
      console.log(`[Email] Support reply sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed support reply to ${to}:`, err);
    }
  }

  async sendTicketCreatedNotification(to: string, displayName: string, ticket: { ticketId: string; subject: string }) {
    try {
      const { client, fromEmail } = await getResendClient();
      const result = await client.emails.send({
        from: getSender("support", fromEmail),
        to,
        subject: `Support Ticket Created [#${ticket.ticketId}]`,
        html: wrapTemplate(cardWrap(`
          <p style="color:#e5e7eb;font-size:15px;margin:0 0 8px;">Hi ${displayName},</p>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Your support ticket has been created. Our team will review it shortly.</p>
          <div style="background:#0a0b10;border-radius:12px;padding:16px;text-align:left;margin:0 0 20px;">
            <p style="color:#6b7280;font-size:10px;margin:0 0 4px;">Ticket ID</p>
            <p style="color:#e5e7eb;font-size:13px;font-family:monospace;margin:0 0 12px;">#${ticket.ticketId}</p>
            <p style="color:#6b7280;font-size:10px;margin:0 0 4px;">Subject</p>
            <p style="color:#e5e7eb;font-size:13px;margin:0;">${ticket.subject}</p>
          </div>
          <a href="${baseUrl()}/support" style="display:inline-block;background:linear-gradient(135deg,#4f7df9,#8b5cf6);color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:10px;text-decoration:none;">Track Your Ticket</a>
        `)),
      });
      console.log(`[Email] Ticket created notification sent to ${to}`, result);
      return result;
    } catch (err) {
      console.error(`[Email] Failed ticket created notification to ${to}:`, err);
    }
  }
}

export const emailService = new EmailService();
