import crypto from 'crypto';
import nodemailer from 'nodemailer';

// ── HMAC-based OTP (no database storage) ─────────────────────────────────────
// A 6-digit code derived from HMAC-SHA256(secret, identifier:purpose:timeSlot).
// The same inputs always produce the same code, so verification is instant.
// Each time slot is 10 minutes; we accept the current and previous slot to
// handle edge cases where the user submits just after a slot boundary.

const OTP_SECRET = process.env.OTP_SECRET || 'pixora-otp-default-secret';
const SLOT_MS = 10 * 60 * 1000; // 10-minute window

function timeSlot(offsetSlots = 0): number {
  return Math.floor(Date.now() / SLOT_MS) + offsetSlots;
}

function computeCode(identifier: string, purpose: string, slot: number): string {
  const hmac = crypto.createHmac('sha256', OTP_SECRET);
  hmac.update(`${identifier.toLowerCase()}:${purpose}:${slot}`);
  const num = parseInt(hmac.digest('hex').slice(0, 8), 16);
  return String(num % 1_000_000).padStart(6, '0');
}

// Generate a code for the current time slot
export function generateCode(identifier: string, purpose: string): string {
  return computeCode(identifier, purpose, timeSlot());
}

// createOtp — generate + send; returns the code (for passing to send helpers)
export async function createOtp(
  identifier: string,
  _type: 'email' | 'phone',
  purpose: string
): Promise<string> {
  return generateCode(identifier, purpose);
}

// verifyOtp — check current and previous slot (handles boundary edge cases)
export async function verifyOtp(
  identifier: string,
  _type: 'email' | 'phone',
  purpose: string,
  code: string
): Promise<void> {
  const trimmed = code.trim();
  const valid =
    computeCode(identifier, purpose, timeSlot(0)) === trimmed ||
    computeCode(identifier, purpose, timeSlot(-1)) === trimmed;

  if (!valid) throw new Error('Invalid or expired OTP. Please request a new one.');
}

// ── Email delivery ────────────────────────────────────────────────────────────
export async function sendEmailOtp(email: string, code: string, purpose: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[DEV] Email OTP for ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const purposeLabel: Record<string, string> = {
    register: 'complete your registration',
    'update-email': 'verify your new email address',
    'update-phone': 'verify your new phone number',
    'delete-event': 'confirm event deletion',
    'delete-account': 'confirm account deletion',
    'change-password': 'confirm your password change',
  };

  await transporter.sendMail({
    from: `"Pixora" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Pixora OTP: ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Your verification code</h2>
        <p style="color:#666;margin-bottom:24px">Use this code to ${purposeLabel[purpose] ?? 'verify your action'}.</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px">${code}</div>
        <p style="color:#999;font-size:13px;margin-top:16px">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}

// ── Invite link notification ──────────────────────────────────────────────────
// Sends SMS (if phone provided) or email with the event join link.
export async function sendInviteLink(opts: {
  email: string;
  phone?: string;
  inviterName: string;
  eventName: string;
  joinUrl: string;
}): Promise<void> {
  const { email, phone, inviterName, eventName, joinUrl } = opts;

  if (phone) {
    await sendInviteSms(phone, inviterName, eventName, joinUrl);
  } else {
    await sendInviteEmail(email, inviterName, eventName, joinUrl);
  }
}

async function sendInviteEmail(to: string, inviterName: string, eventName: string, joinUrl: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[DEV] Invite email to ${to}: ${joinUrl}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"Pixora" <${process.env.SMTP_USER}>`,
    to,
    subject: `${inviterName} invited you to "${eventName}" on Pixora`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">You're invited!</h2>
        <p style="color:#666;margin-bottom:16px">
          <strong>${inviterName}</strong> has invited you to join the event
          <strong>"${eventName}"</strong> on Pixora.
        </p>
        <a href="${joinUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Join the event
        </a>
        <p style="color:#999;font-size:13px;margin-top:20px">
          Or copy this link: <a href="${joinUrl}" style="color:#000">${joinUrl}</a>
        </p>
      </div>
    `,
  });
}

async function sendInviteSms(phone: string, inviterName: string, eventName: string, joinUrl: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    console.log(`[DEV] Invite SMS to ${phone}: ${joinUrl}`);
    return;
  }
  const twilio = require('twilio')(accountSid, authToken);
  await twilio.messages.create({
    body: `${inviterName} invited you to "${eventName}" on Pixora. Join here: ${joinUrl}`,
    from,
    to: phone,
  });
}

// ── SMS delivery ──────────────────────────────────────────────────────────────
export async function sendPhoneOtp(phone: string, code: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log(`[DEV] Phone OTP for ${phone}: ${code}`);
    return;
  }

  const twilio = require('twilio')(accountSid, authToken);
  await twilio.messages.create({
    body: `Your Pixora verification code is: ${code}. Valid for 10 minutes.`,
    from,
    to: phone,
  });
}
