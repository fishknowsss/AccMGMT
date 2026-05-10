import { json, readJson } from '../_lib/http';
import { createRepository } from '../_lib/repository';
import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const users = await createRepository(env.DB).listUsers();
  return json({ users });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const input = normalizeUserInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  const user = await createRepository(env.DB).createUser(input.value);
  return json({ user }, { status: 201 });
};

function normalizeUserInput(
  body: unknown,
): { ok: true; value: { name: string; email: string | null; groupId: string; isActive: boolean } } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: '请填写成员信息' };
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null;
  const groupId = typeof data.groupId === 'string' ? data.groupId.trim() : '';
  const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

  if (!name) return { ok: false, reason: '请填写成员姓名' };
  if (!groupId) return { ok: false, reason: '请选择小组' };

  return { ok: true, value: { name, email, groupId, isActive } };
}
