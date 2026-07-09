import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationFiles = [
  '0001_init.sql',
  '0002_account_label_sort_order.sql',
  '0003_seed_runway_accounts.sql',
  '0004_set_renewal_dates_to_june_1.sql',
  '0005_add_users_groups.sql',
  '0006_add_group_concurrent_limit.sql',
  '0007_add_projects.sql',
  '0008_add_account_password.sql',
  '0009_add_project_sort_order.sql',
  '0010_add_account_notes.sql',
];

describe('database migrations', () => {
  it('apply cleanly to a fresh SQLite database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'accmgmt-migrations-'));
    const dbPath = join(dir, 'fresh.sqlite');

    try {
      for (const file of migrationFiles) {
        const sql = readFileSync(join(process.cwd(), 'migrations', file), 'utf8');
        execFileSync('sqlite3', [dbPath], { input: sql });
      }

      const columns = execFileSync('sqlite3', [dbPath, "PRAGMA table_info('groups');"], { encoding: 'utf8' });
      expect(columns.match(/\|concurrent_limit\|/g)).toHaveLength(1);

      const accountColumns = execFileSync('sqlite3', [dbPath, "PRAGMA table_info('accounts');"], { encoding: 'utf8' });
      expect(accountColumns).toContain('|password|TEXT|');
      expect(accountColumns).toContain('|notes|TEXT|');

      const projectColumns = execFileSync('sqlite3', [dbPath, "PRAGMA table_info('projects');"], { encoding: 'utf8' });
      expect(projectColumns).toContain('|sort_order|INTEGER|');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
