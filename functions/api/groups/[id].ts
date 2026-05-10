import { json, readJson } from '../../_lib/http';
import { createRepository } from '../../_lib/repository';
import type { Env } from '../../_lib/env';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await readJson(request);
  const input = normalizeGroupInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  const group = await createRepository(env.DB).updateGroup(String(params.id), input.value);
  if (!group) {
    return json({ message: '小组不存在' }, { status: 404 });
  }

  return json({ group });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await createRepository(env.DB).deleteGroup(String(params.id));
  return json({});
};

function normalizeGroupInput(
  body: unknown,
): { ok: true; value: { name: string; isActive: boolean } } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: '请填写小组信息' };
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

  if (!name) return { ok: false, reason: '请填写小组名称' };

  return { ok: true, value: { name, isActive } };
}
