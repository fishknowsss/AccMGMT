import { json, readJson } from '../../_lib/http';
import { createRepository } from '../../_lib/repository';
import type { Env } from '../../_lib/env';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const input = normalizeReorderInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  const groups = await createRepository(env.DB).reorderGroups(input.value.groupIds);
  return json({ groups });
};

function normalizeReorderInput(body: unknown): { ok: true; value: { groupIds: string[] } } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: '请选择小组' };
  }

  const groupIds = (body as Record<string, unknown>).groupIds;
  if (!Array.isArray(groupIds)) {
    return { ok: false, reason: '请选择小组' };
  }

  const normalized = groupIds.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean);
  if (normalized.length !== groupIds.length || normalized.length === 0) {
    return { ok: false, reason: '请选择小组' };
  }

  return { ok: true, value: { groupIds: normalized } };
}
