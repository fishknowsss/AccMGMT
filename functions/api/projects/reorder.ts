import { createRepository } from '../../_lib/repository';
import type { Env } from '../../_lib/env';
import { json, readJson } from '../../_lib/http';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const input = normalizeReorderInput(body);
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  const projects = await createRepository(env.DB).reorderProjects(input.value.projects);
  return json({ projects });
};

function normalizeReorderInput(body: unknown): { ok: true; value: { projects: string[] } } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: '请选择项目' };
  }

  const projects = (body as Record<string, unknown>).projects;
  if (!Array.isArray(projects)) {
    return { ok: false, reason: '请选择项目' };
  }

  const normalized = projects.map((project) => (typeof project === 'string' ? project.trim() : '')).filter(Boolean);
  if (normalized.length !== projects.length || normalized.length === 0) {
    return { ok: false, reason: '请选择项目' };
  }

  return { ok: true, value: { projects: normalized } };
}
