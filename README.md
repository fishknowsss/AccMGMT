# AccMGMT

工作室内部的 Pixverse 账号占用看板。网站保存账号邮箱、账号密码、续费日期、使用人、小组、项目和占用时间；账号密码只在通过站点门禁后提供复制。

## 功能

- 查看账号的空闲、使用中、已预约状态
- 立即使用账号
- 预约未来时段
- 同一账号同一时间只能被一个人占用
- 到结束时间后自动显示为空闲
- 提前释放当前占用
- 维护账号邮箱和续费日期
- 复制账号密码

## 本地运行

安装依赖：

```bash
npm install
```

一键打开本地预览：

```bash
npm run local
```

预览地址会自动打开：

```txt
http://localhost:8788
```

如果想手动分步运行，也可以这样：

```bash
cp .env.example .dev.vars
npm run cf:migrate:local
npm run build
npx wrangler pages dev dist --d1 DB=accmgmt-pixverse --compatibility-date=2026-05-09
```

## Cloudflare 部署

当前项目已按 Cloudflare Pages + D1 接入云端数据。

- 生产地址：`https://accmgmt-pixverse.pages.dev/`
- 自定义域名：`https://acc.fishknowsss.com/`
- 数据库：Cloudflare D1 `accmgmt-pixverse`
- D1 database id：`88775c30-6f67-45e8-b8bc-9492240b7279`
- 线上数据表：`accounts`、`bookings`、`users`、`groups`、`projects`
- Pages Secrets：`SITE_PASSWORD_SHA256`、`SESSION_SECRET`

1. 登录 Cloudflare。
2. 创建 D1 数据库，名称用 `accmgmt-pixverse`。
3. 把数据库 ID 填到 `wrangler.toml` 的 `database_id`。
4. 应用远程迁移：

```bash
npm run cf:migrate
```

5. 部署：

```bash
npm run cf:deploy
```

6. 在 Pages 项目的 Custom domains 里绑定你的域名。

首次部署前需要写入站点门禁 Secret：

```bash
npx wrangler pages secret put SITE_PASSWORD_SHA256 --project-name accmgmt-pixverse
npx wrangler pages secret put SESSION_SECRET --project-name accmgmt-pixverse
```

### 绑定子域名

如果主域名 DNS 已托管到 Cloudflare：

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 打开 `accmgmt-pixverse` 项目。
4. 进入 `Custom domains`。
5. 点击 `Set up a domain`。
6. 输入要使用的子域名，例如 `acc.example.com`。
7. 按 Cloudflare 提示确认，DNS 记录会自动创建。

如果主域名 DNS 不在 Cloudflare，需要在 DNS 服务商处添加 CNAME：

```txt
Type: CNAME
Name: acc
Target: accmgmt-pixverse.pages.dev
```

仍然需要先在 Pages 的 `Custom domains` 里添加这个子域名。

## 日常上线流程

修改前端、文案、样式或普通业务逻辑后，按下面顺序验证并部署：

```bash
npm test
npm run lint
npm run build
npm run cf:deploy
```

部署成功后，Cloudflare Pages 会更新：

- `https://accmgmt-pixverse.pages.dev/`
- 已绑定的自定义域名，例如 `https://acc.fishknowsss.com/`

## 历史数据归档

Runway 旧数据迁移前先导出 D1 备份，再生成本地静态归档：

```bash
npx wrangler d1 export accmgmt --remote --output backups/runway-archive/2026-06-27/accmgmt-runway-before-pixverse.sql --table accounts --table bookings --table users --table groups --table projects --skip-confirmation
sqlite3 backups/runway-archive/2026-06-27/verify.sqlite < backups/runway-archive/2026-06-27/accmgmt-runway-before-pixverse.sql
node scripts/export-runway-static-archive.mjs
```

归档目录 `backups/` 和 `archives/` 只保留在本机，不提交到仓库。

Pixverse 账号和旧成员小组的临时导入 SQL 放在本机忽略目录：

```txt
backups/pixverse-import/2026-06-28/import-pixverse-accounts-and-old-members.sql
```

它包含账号密码，只用于本机恢复或重新导入，不提交到仓库。

如果修改了数据库结构，先新增 `migrations/` 下的迁移文件，再执行：

```bash
npm test
npm run lint
npm run build
npm run cf:migrate
npm run cf:deploy
```

只新增、编辑账号或预约使用，不需要重新部署；这些数据会直接写入线上 D1 数据库。

## 验证

```bash
npm test
npm run lint
npm run build
```
