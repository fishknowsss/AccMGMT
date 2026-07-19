import { json } from './http';

export type AuthEnv = {
  SITE_PASSWORD_SHA256?: string;
  SESSION_SECRET?: string;
  SITE_SESSION_TTL_SECONDS?: string;
};

const sessionCookieName = 'accmgmt_session';
const defaultSessionTtlSeconds = 60 * 60 * 24 * 400;

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

export async function verifySitePassword(password: string, env: AuthEnv): Promise<boolean> {
  const expected = env.SITE_PASSWORD_SHA256?.trim().toLowerCase();
  if (!expected) {
    return false;
  }

  const actual = await sha256Hex(password);
  return constantTimeEqual(actual, expected);
}

export async function buildSessionCookie(env: AuthEnv, now = new Date(), secure = true): Promise<string> {
  const timestamp = String(now.getTime());
  const signature = await signSessionValue(timestamp, env);
  const maxAge = getSessionTtlSeconds(env);
  const expires = new Date(now.getTime() + maxAge * 1000).toUTCString();
  const parts = [
    `${sessionCookieName}=${timestamp}.${signature}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    `Expires=${expires}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function buildClearSessionCookie(): string {
  return `${sessionCookieName}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure`;
}

export async function isAuthorizedRequest(request: Request, env: AuthEnv, now = new Date()): Promise<boolean> {
  const cookieValue = readCookie(request.headers.get('cookie') ?? '', sessionCookieName);
  if (!cookieValue) {
    return false;
  }

  const [timestamp, signature] = cookieValue.split('.');
  if (!timestamp || !signature) {
    return false;
  }

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt)) {
    return false;
  }

  const ageMs = now.getTime() - issuedAt;
  if (ageMs < -60_000 || ageMs > getSessionTtlSeconds(env) * 1000) {
    return false;
  }

  const expected = await signSessionValue(timestamp, env);
  return constantTimeEqual(signature, expected);
}

export async function requireAuthorizedRequest(request: Request, env: AuthEnv): Promise<Response | null> {
  if (await isAuthorizedRequest(request, env)) {
    return null;
  }

  return json({ message: '请先输入访问口令' }, { status: 401 });
}

async function signSessionValue(value: string, env: AuthEnv): Promise<string> {
  const secret = env.SESSION_SECRET?.trim() || env.SITE_PASSWORD_SHA256?.trim();
  if (!secret) {
    return '';
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function readCookie(header: string, name: string): string | null {
  return (
    header
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}

function getSessionTtlSeconds(env: AuthEnv): number {
  const value = Number(env.SITE_SESSION_TTL_SECONDS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : defaultSessionTtlSeconds;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
