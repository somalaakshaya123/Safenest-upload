import crypto from "crypto";
import { prisma } from "./db";

export async function logAudit(userId: string | null, action: string, details?: string) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? undefined, action, details },
    });
  } catch {
    // Audit logging must never crash the primary request flow.
  }
}

/**
 * Demo-mode OTP: generates a real 6-digit code and stores it hashed-ish
 * (kept simple for hackathon scope). In production this would be dispatched
 * via SMS/email provider; here it is surfaced back in the API response
 * behind a clearly labeled DEMO_MODE flag so judges can verify the flow
 * without needing real SMS/email infrastructure.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export const DEMO_MODE = process.env.DEMO_MODE !== "false"; // default true for hackathon judging

// Very small in-memory rate limiter keyed by identifier (email/IP).
// Resets on server restart — fine for a single-instance hackathon deployment.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}
