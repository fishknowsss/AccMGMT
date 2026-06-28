import { describe, expect, it } from 'vitest';
import {
  buildSessionCookie,
  isAuthorizedRequest,
  sha256Hex,
  verifySitePassword,
} from '../functions/_lib/auth';

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
});
