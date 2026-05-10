import { json, readJson } from '../_lib/http';
import { createRepository } from '../_lib/repository';
import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const snapshot = await createRepository(env.DB).listSnapshot();
  return json(snapshot);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const input = normalizeAccountInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  try {
    const account = await createRepository(env.DB).createAccount(input.value);
    return json({ account }, { status: 201 });
  } catch (error) {
    if (isUniqueError(error)) {
      return json({ message: '这个邮箱已经存在' }, { status: 409 });
    }
    throw error;
  }
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

function isUniqueError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('unique');
}
