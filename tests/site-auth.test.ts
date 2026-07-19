import { describe, expect, it } from 'vitest';
import {
  buildSessionCookie,
  isAuthorizedRequest,
  sha256Hex,
  verifySitePassword,
} from '../functions/_lib/auth';
import { onRequestGet } from '../functions/api/session';

describe('site auth', () => {
  it('verifies the site password through a SHA-256 hash from the environment', async () => {
    const hash = await sha256Hex('open-sesame');

    await expect(verifySitePassword('open-sesame', { SITE_PASSWORD_SHA256: hash })).resolves.toBe(true);
    await expect(verifySitePassword('wrong', { SITE_PASSWORD_SHA256: hash })).resolves.toBe(false);
  });

  it('accepts a signed session cookie and rejects unsigned requests', async () => {
    const env = {
      SITE_PASSWORD_SHA256: await sha256Hex('open-sesame'),
      SESSION_SECRET: 'test-session-secret',
    };
    const cookie = await buildSessionCookie(env, new Date('2026-06-28T00:00:00.000Z'));

    const request = new Request('https://acc.example.com/api/accounts', {
      headers: { cookie },
    });
    const unsignedRequest = new Request('https://acc.example.com/api/accounts');

    await expect(isAuthorizedRequest(request, env, new Date('2026-06-28T00:05:00.000Z'))).resolves.toBe(true);
    await expect(isAuthorizedRequest(unsignedRequest, env, new Date('2026-06-28T00:05:00.000Z'))).resolves.toBe(false);
  });

  it('keeps the default browser authorization for 400 days', async () => {
    const env = {
      SITE_PASSWORD_SHA256: await sha256Hex('open-sesame'),
      SESSION_SECRET: 'test-session-secret',
    };
    const issuedAt = new Date('2026-06-28T00:00:00.000Z');
    const cookie = await buildSessionCookie(env, issuedAt);
    const request = new Request('https://acc.example.com/api/accounts', {
      headers: { cookie },
    });

    expect(cookie).toContain('Max-Age=34560000');
    expect(cookie).toContain('Expires=Mon, 02 Aug 2027 00:00:00 GMT');
    await expect(isAuthorizedRequest(request, env, new Date('2027-08-01T23:59:59.000Z'))).resolves.toBe(true);
    await expect(isAuthorizedRequest(request, env, new Date('2027-08-02T00:00:01.000Z'))).resolves.toBe(false);
  });

  it('renews a valid browser authorization when the app opens', async () => {
    const env = {
      SITE_PASSWORD_SHA256: await sha256Hex('open-sesame'),
      SESSION_SECRET: 'test-session-secret',
    };
    const cookie = await buildSessionCookie(env, new Date());
    const request = new Request('https://acc.example.com/api/session', {
      headers: { cookie },
    });
    const handler = onRequestGet as unknown as (context: { request: Request; env: typeof env }) => Promise<Response>;

    const response = await handler({ request, env });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=34560000');
  });
});
