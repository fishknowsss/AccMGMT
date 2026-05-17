import { json, readJson } from '../_lib/http';
import { createRepository } from '../_lib/repository';
import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const groups = await createRepository(env.DB).listGroups();
  return json({ groups });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const input = normalizeGroupInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  const group = await createRepository(env.DB).createGroup(input.value);
  return json({ group }, { status: 201 });
};

function normalizeGroupInput(
  body: unknown,
): { ok: true; value: { name: string; concurrentLimit: number; isActive: boolean } } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: '请填写小组信息' };
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const concurrentLimit = normalizeConcurrentLimit(data.concurrentLimit);
  const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

  if (!name) return { ok: false, reason: '请填写小组名称' };

  return { ok: true, value: { name, concurrentLimit, isActive } };
}

function normalizeConcurrentLimit(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return 2;
  }

  return Math.max(1, Math.floor(numberValue));
}
