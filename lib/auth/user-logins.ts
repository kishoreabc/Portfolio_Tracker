import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';

/**
 * Checks whether an email address is included in the ALLOWED_EMAILS environment variable.
 */
export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowedEmailsStr = process.env.ALLOWED_EMAILS;
  if (!allowedEmailsStr) return false;

  const allowedEmails = allowedEmailsStr
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.trim().toLowerCase());
}

export interface UserLoginPayload {
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: string;
}

/**
 * Safely extracts client IP address and User-Agent from incoming Next.js request headers.
 */
export async function getClientRequestMetadata(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get('x-forwarded-for');
    let ipAddress: string | null = null;

    if (forwardedFor) {
      // First IP in comma-separated chain is the client IP
      ipAddress = forwardedFor.split(',')[0].trim();
    } else {
      ipAddress =
        reqHeaders.get('x-real-ip') ||
        reqHeaders.get('cf-connecting-ip') ||
        reqHeaders.get('fastly-client-ip') ||
        reqHeaders.get('true-client-ip') ||
        null;
    }

    const userAgent = reqHeaders.get('user-agent') || null;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Records a user login event into the Supabase database.
 * Designed to never throw or interrupt the authentication flow.
 */
export async function recordUserLogin(payload: UserLoginPayload): Promise<void> {
  if (!payload.email) return;

  try {
    const { ipAddress, userAgent } = await getClientRequestMetadata();
    const isAllowed = isAllowedEmail(payload.email);

    const { error } = await supabase.from('user_logins').insert({
      email: payload.email.trim().toLowerCase(),
      name: payload.name || null,
      image: payload.image || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      provider: payload.provider || 'google',
      is_allowed_email: isAllowed,
    });

    if (error) {
      console.warn('[Auth Audit] Could not record user login to Supabase:', error.message);
      if (error.code === 'PGRST205' || error.message.includes('user_logins')) {
        console.info(
          '[Auth Audit] Notice: Table public.user_logins does not exist yet. Please run migration 006_create_user_logins.sql in your Supabase SQL editor.'
        );
      }
    } else {
      console.log(
        `[Auth Audit] Login recorded for ${payload.email} (allowed=${isAllowed}) from IP: ${ipAddress || 'unknown'}`
      );
    }
  } catch (err) {
    console.error('[Auth Audit] Unexpected error recording user login:', err);
  }
}
