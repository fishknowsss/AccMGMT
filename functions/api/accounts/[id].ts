import { json, readJson } from '../../_lib/http';
import { createRepository } from '../../_lib/repository';
import type { Env } from '../../_lib/env';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await readJson(request);
  const input = normalizeAccountInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  const account = await createRepository(env.DB).updateAccount(String(params.id), input.value);
  if (!account) {
    return json({ message: '账号不存在' }, { status: 404 });
  }

  return json({ account });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const deleted = await createRepository(env.DB).deleteAccount(String(params.id));
  if (!deleted) {
    return json({ message: '账号不存在' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
};

function normalizeAccountInput(
  body: unknown,
): { ok: true; value: { email: string; label: string; renewalDate: string | null; isActive: boolean; sortOrder: number } } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: '请填写账号信息' };
  }

  const data = body as Record<string, unknown>;
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const label = typeof data.label === 'string' ? data.label.trim() : '';
  const renewalDate = typeof data.renewalDate === 'string' && data.renewalDate.trim() ? data.renewalDate.trim() : null;
  const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
  const sortOrder = typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder) ? data.sortOrder : 0;

  if (!email) {
    return { ok: false, reason: '请填写账号邮箱' };
  }

  if (!label) {
    return { ok: false, reason: '请填写账号编号' };
  }

  return { ok: true, value: { email, label, renewalDate, isActive, sortOrder } };
}
