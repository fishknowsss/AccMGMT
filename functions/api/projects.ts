import { createRepository } from '../_lib/repository';
import type { Env } from '../_lib/env';
import { json, readJson } from '../_lib/http';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const name = normalizeProjectName(body);
  if (!name) {
    return json({ message: '请填写项目名' }, { status: 400 });
  }

  try {
    const project = await createRepository(env.DB).createProject(name);
    return json({ project }, { status: 201 });
  } catch (error) {
    if (isUniqueError(error)) {
      return json({ message: '项目名已存在' }, { status: 409 });
    }
    throw error;
  }
};

function normalizeProjectName(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }

  const name = (body as Record<string, unknown>).name;
  return typeof name === 'string' ? name.trim() : '';
}

function isUniqueError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('unique');
}

