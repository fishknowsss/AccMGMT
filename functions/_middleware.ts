import { requireAuthorizedRequest } from './_lib/auth';
import type { Env } from './_lib/env';

export const onRequest: PagesFunction<Env> = async (context) => {
  const pathname = new URL(context.request.url).pathname;
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/session')) {
    return context.next();
  }

  const unauthorized = await requireAuthorizedRequest(context.request, context.env);
  if (unauthorized) {
    return unauthorized;
  }

  return context.next();
};
