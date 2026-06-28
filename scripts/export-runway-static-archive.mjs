import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const archiveDate = '2026-06-27';
const defaultDbPath = `backups/runway-archive/${archiveDate}/verify.sqlite`;
const defaultOutputDir = `archives/runway-${archiveDate}`;
const dbPath = resolve(process.argv[2] ?? defaultDbPath);
const outputDir = resolve(process.argv[3] ?? defaultOutputDir);
const sqlBackupPath = `backups/runway-archive/${archiveDate}/accmgmt-runway-before-pixverse.sql`;
const generatedAt = new Date().toISOString();

const accounts = queryRows(`
  SELECT id, email, label, renewal_date, is_active, sort_order, created_at
  FROM accounts
  ORDER BY sort_order ASC, email ASC
`);
const bookings = queryRows(`
  SELECT id, account_id, user_name, group_name, project_name, start_at, end_at, released_at, created_at
  FROM bookings
  ORDER BY start_at DESC
`);
const users = queryRows(`
  SELECT id, name, email, group_id, is_active
  FROM users
  ORDER BY name ASC
`);
const groups = queryRows(`
  SELECT id, name, concurrent_limit, sort_order, is_active
  FROM groups
  ORDER BY sort_order ASC, name ASC
`);
const projects = queryRows(`
  SELECT name
  FROM projects
  ORDER BY name ASC
`);

const accountById = new Map(accounts.map((account) => [account.id, account]));
const bookingRows = bookings.map((booking) => ({
  ...booking,
  account_label: accountById.get(booking.account_id)?.label ?? booking.account_id,
  account_email: accountById.get(booking.account_id)?.email ?? '',
  status: booking.released_at ? '已结束' : '已确认',
}));

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'index.html'), buildHtml(), 'utf8');
writeFileSync(resolve(outputDir, 'restore-notes.md'), buildRestoreNotes(), 'utf8');

console.log(`Archive written to ${outputDir}`);

function queryRows(sql) {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' }).trim();
  return output ? JSON.parse(output) : [];
}

function buildHtml() {
  const accountRows = accounts.map((account) => [
    account.label,
    sanitizeText(account.email),
    account.renewal_date ?? '',
    account.is_active ? '启用' : '停用',
    formatDateTime(account.created_at),
  ]);
  const bookingTableRows = bookingRows.map((booking) => [
    booking.account_label,
    sanitizeText(booking.account_email),
    sanitizeText(booking.user_name),
    sanitizeText(booking.group_name),
    sanitizeText(booking.project_name),
    formatDateTime(booking.start_at),
    formatDateTime(booking.end_at),
    booking.status,
  ]);
  const userRows = users.map((user) => [sanitizeText(user.name), sanitizeText(user.email), user.group_id, user.is_active ? '启用' : '停用']);
  const groupRows = groups.map((group) => [sanitizeText(group.name), String(group.concurrent_limit), group.is_active ? '启用' : '停用']);
  const projectRows = projects.map((project) => [sanitizeText(project.name)]);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Runway 历史归档 ${escapeHtml(archiveDate)}</title>
  <style>
    :root {
      color: #202329;
      background: #f6f7f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
    }
    body {
      margin: 0;
      padding: 28px;
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    p {
      margin: 8px 0 0;
      color: #4f5968;
      font-size: 14px;
    }
    .meta {
      text-align: right;
      color: #667085;
      font-size: 13px;
      line-height: 1.7;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }
    .metric,
    section {
      border: 1px solid #dde3ea;
      background: #fff;
      border-radius: 12px;
    }
    .metric {
      padding: 14px;
    }
    .metric span {
      display: block;
      color: #667085;
      font-size: 13px;
    }
    .metric strong {
      display: block;
      margin-top: 8px;
      font-size: 24px;
    }
    section {
      overflow: hidden;
      margin-top: 14px;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid #eef2f6;
      background: #fcfdfe;
    }
    .table-wrap {
      overflow: auto;
      max-height: 520px;
    }
    table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #eef2f6;
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f7f9fb;
      color: #667085;
      font-weight: 600;
    }
    td {
      color: #344154;
      word-break: break-word;
    }
    @media (max-width: 760px) {
      body {
        padding: 16px;
      }
      header {
        display: block;
      }
      .meta {
        margin-top: 12px;
        text-align: left;
      }
      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Runway 历史归档</h1>
        <p>查看历史账号和预约。恢复时使用同目录 SQL 备份。</p>
      </div>
      <div class="meta">
        <div>归档日期：${escapeHtml(archiveDate)}</div>
        <div>生成时间：${escapeHtml(formatDateTime(generatedAt))}</div>
        <div>敏感片段已隐藏</div>
      </div>
    </header>

    <div class="metrics">
      ${metric('账号', accounts.length)}
      ${metric('预约', bookings.length)}
      ${metric('成员', users.length)}
      ${metric('小组', groups.length)}
      ${metric('项目', projects.length)}
    </div>

    ${tableSection('账号', ['编号', '账号邮箱', '续费日期', '状态', '创建时间'], accountRows)}
    ${tableSection('预约', ['账号', '账号邮箱', '使用人', '小组', '项目', '开始', '结束', '状态'], bookingTableRows)}
    ${tableSection('成员', ['姓名', '邮箱', '小组 ID', '状态'], userRows)}
    ${tableSection('小组', ['小组', '并发上限', '状态'], groupRows)}
    ${tableSection('项目', ['项目'], projectRows)}
  </main>
</body>
</html>
`;
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function tableSection(title, headers, rows) {
  return `<section>
    <div class="section-head">
      <h2>${escapeHtml(title)}</h2>
      <span>${escapeHtml(String(rows.length))} 条</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? '')}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  </section>`;
}

function buildRestoreNotes() {
  return `# Runway 历史数据恢复说明

归档日期：${archiveDate}

SQL 备份：

\`\`\`txt
${sqlBackupPath}
\`\`\`

恢复前先确认目标数据库。不要在未确认的情况下覆盖当前 Pixverse 数据。

\`\`\`bash
npx wrangler d1 execute accmgmt --remote --file ${sqlBackupPath}
\`\`\`

静态归档页面默认隐藏了明显的密码片段；SQL 备份保留原始数据用于恢复。
`;
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[（(]?\s*(密码|口令|password|pass|pwd)\s*[:：]?\s*[^）)\s,，;；]+[）)]?/gi, '（敏感信息已隐藏）');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
