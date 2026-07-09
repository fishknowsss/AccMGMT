import { describe, expect, it } from 'vitest';
import { createRepository } from '../functions/_lib/repository';

type ProjectRow = {
  name: string;
  sort_order: number;
};

function createFakeDb(projects: ProjectRow[]): D1Database {
  const rows = { projects: [...projects] };
  return {
    prepare(sql: string) {
      let bound: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          bound = values;
          return this;
        },
        async first() {
          return null;
        },
        async all() {
          if (sql.includes('FROM projects')) {
            return {
              results: [...rows.projects].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
            };
          }
          return { results: [] };
        },
        async run() {
          if (sql.includes('INSERT OR IGNORE INTO projects')) {
            const name = String(bound[0]);
            if (!rows.projects.some((project) => project.name === name)) {
              rows.projects.push({ name, sort_order: rows.projects.length + 1 });
            }
            return { meta: { changes: 1 } };
          }

          if (sql.includes('UPDATE projects SET sort_order')) {
            const row = rows.projects.find((project) => project.name === String(bound[1]));
            if (!row) return { meta: { changes: 0 } };
            row.sort_order = Number(bound[0]);
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 1 } };
        },
      };
    },
  } as unknown as D1Database;
}

describe('D1 project reordering', () => {
  it('updates project sort_order using the supplied name order', async () => {
    const repo = createRepository(
      createFakeDb([
        { name: '品牌短片', sort_order: 1 },
        { name: '素材补帧', sort_order: 2 },
        { name: '直播片头', sort_order: 3 },
      ]),
    );

    const projects = await repo.reorderProjects(['素材补帧', '直播片头', '品牌短片']);

    expect(projects).toEqual(['素材补帧', '直播片头', '品牌短片']);
  });
});
