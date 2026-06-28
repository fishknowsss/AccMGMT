import { buildClearSessionCookie, buildSessionCookie, isAuthorizedRequest, verifySitePassword } from '../_lib/auth';
import type { Env } from '../_lib/env';
import { json, readJson } from '../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authenticated = await isAuthorizedRequest(request, env);
  return json({ authenticated }, { status: authenticated ? 200 : 401 });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const password = body && typeof body === 'object' && typeof (body as Record<string, unknown>).password === 'string'
    ? (body as Record<string, string>).password
    : '';

  if (!(await verifySitePassword(password, env))) {
    return json({ message: '口令不正确' }, { status: 401 });
  }

  const secure = new URL(request.url).protocol === 'https:';
  return json(
    { authenticated: true },
    {
      headers: {
        'set-cookie': await buildSessionCookie(env, new Date(), secure),
      },
    },
  );
};

export const onRequestDelete: PagesFunction<Env> = async () =>
  json(
    { authenticated: false },
    {
      headers: {
        'set-cookie': buildClearSessionCookie(),
      },
    },
  );
