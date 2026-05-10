import { createRepository } from '../../_lib/repository';
import type { Env } from '../../_lib/env';
import { json } from '../../_lib/http';

export async function onRequestPatch(context: { request: Request; env: Env }) {
  const repo = createRepository(context.env.DB);

  const urlParts = new URL(context.request.url).pathname.split('/');
  const encodedName = urlParts[urlParts.length - 1];
  const oldName = decodeURIComponent(encodedName);

  const body = (await context.request.json()) as { name?: unknown };
  const newName = typeof body.name === 'string' ? body.name.trim() : '';
  if (!newName) {
    return json({ error: '新项目名不能为空' }, { status: 400 });
  }
  if (newName === oldName) {
    return json({ affected: 0 });
  }

  const affected = await repo.renameProject(oldName, newName);
  return json({ affected, oldName, newName });
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
  const repo = createRepository(context.env.DB);

  const urlParts = new URL(context.request.url).pathname.split('/');
  const encodedName = urlParts[urlParts.length - 1];
  const name = decodeURIComponent(encodedName);

  const affected = await repo.deleteProject(name);
  return json({ affected, name });
}
