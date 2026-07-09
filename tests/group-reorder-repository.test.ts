import { describe, expect, it } from 'vitest';
import { createRepository } from '../functions/_lib/repository';

type GroupRow = {
  id: string;
  name: string;
  concurrent_limit: number;
  sort_order: number;
  is_active: number;
};

function createFakeDb(groups: GroupRow[]): D1Database {
  const rows = {
    groups: [...groups],
  };

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
          if (sql.includes('FROM groups')) {
            return {
              results: [...rows.groups].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
            };
          }

          return { results: [] };
        },
        async run() {
          if (sql.includes('UPDATE groups SET sort_order')) {
            const row = rows.groups.find((group) => group.id === String(bound[1]));
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

describe('D1 group reordering', () => {
  it('updates group sort_order using the supplied id order', async () => {
    const repo = createRepository(
      createFakeDb([
        { id: 'group-a', name: 'A组', concurrent_limit: 2, sort_order: 1, is_active: 1 },
        { id: 'group-b', name: 'B组', concurrent_limit: 2, sort_order: 2, is_active: 1 },
        { id: 'group-c', name: 'C组', concurrent_limit: 2, sort_order: 3, is_active: 1 },
      ]),
    );

    const groups = await repo.reorderGroups(['group-c', 'group-a', 'group-b']);

    expect(groups.map((group) => group.id)).toEqual(['group-c', 'group-a', 'group-b']);
    expect(groups.map((group) => group.sortOrder)).toEqual([1, 2, 3]);
  });
});
