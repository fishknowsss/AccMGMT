# AccMGMT

AccMGMT 是工作室内部的 Runway 账号预约与占用看板，用来集中查看账号空闲状态、当前占用、未来预约、成员小组和项目占用情况。

项目采用 React + TypeScript + Vite 构建前端，Cloudflare Pages Functions 提供 API，Cloudflare D1 保存账号、预约、成员、小组和项目数据。当前 Cloudflare 项目与 D1 数据库仍沿用历史名称 `accmgmt-pixverse`，产品定位以 Runway 账号看板为准。

## 功能范围

- Runway 账号状态看板：查看空闲、使用中、下一预约和续费提醒。
- 搜索与筛选：按账号、状态、小组和续费周期筛选资源。
- 立即使用：为当前成员创建从现在开始的占用记录。
- 预约账号：为未来时间段创建预约，并阻止同一账号时间重叠。
- 结束使用：普通成员可结束自己的占用，管理员可结束任意占用。
- 成员小组：维护成员、小组和小组并发上限。
- 项目管理：维护项目名称，并支持项目排序。
- 账号设置：维护账号邮箱、编号、续费日期和启停状态。
- 使用记录：基于预约数据派生已结束和已取消记录。

## 技术栈

- Runtime: React 19, TypeScript, Vite
- Styling: Tailwind CSS 4, 少量全局 CSS
- Icons: lucide-react
- Backend: Cloudflare Pages Functions
- Database: Cloudflare D1
- Tests: Vitest, TypeScript compiler checks

## 架构概览

```txt
src/
  components/account-board/    看板、表格、筛选、预约弹窗和设置面板
  components/ui/               通用按钮、表单、弹窗等基础组件
  hooks/useAccountsViewModel.ts 页面状态、云端同步和操作入口
  lib/runway-board.ts          状态计算、冲突检测、筛选和格式化
  lib/runway-api.ts            前端访问 Pages Functions 的 API 客户端
functions/
  api/                         Cloudflare Pages Functions API
  _lib/                        D1 repository、鉴权、HTTP 工具
migrations/                    D1 schema migrations
tests/                         领域规则、API、迁移和结构约束测试
```

核心边界：

- `AccountBoardPage` 负责页面编排和主视图切换。
- `OperationsStrip`、`AccountFilters`、`AccountTable` 负责看板展示。
- `UseNowDialog`、`BookingDialog` 负责占用和预约表单。
- `useAccountsViewModel` 负责数据同步、筛选状态和操作状态。
- `runway-board.ts` 保持为纯业务规则模块。
- `functions/_lib/repository.ts` 封装 D1 读写。

## 数据规则

- 账号当前状态不落库，运行时根据预约时间实时计算。
- 当前时间落在预约 `startTime` 与 `endTime` 之间时，账号显示为使用中。
- 没有覆盖当前时间的预约时，账号显示为空闲。
- 下一预约取当前时间之后最近的一条预约。
- 同一账号不允许时间重叠，冲突条件为 `new_start < existing_end AND new_end > existing_start`。
- 结束时间过去后自动视为空闲，不需要手动释放。
- 小组并发上限用于限制同一小组在同一时间段可同时占用的账号数。

## 本地开发

安装依赖：

```bash
npm install
```

启动 Vite 开发服务器：

```bash
npm run dev
```

使用 Cloudflare Pages 本地环境预览：

```bash
cp .dev.vars.example .dev.vars
npm run cf:migrate:local
npm run build
npm run cf:dev
```

一键本地预览：

```bash
npm run local
```

`npm run local` 会构建项目、启动 Pages 本地预览，并打开浏览器。

## 环境变量

本地文件：

- `.dev.vars`：Cloudflare Pages 本地开发变量，不提交。
- `.env`：本地辅助脚本变量，不提交。

Cloudflare Pages Secrets：

- `SITE_PASSWORD_SHA256`：站点门禁口令的 SHA-256 值。
- `SESSION_SECRET`：会话签名密钥。

GitHub Actions Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

公开仓库不应包含真实账号数据、导入 SQL、D1 备份、`.env`、`.dev.vars`、Cloudflare token 或任何运行时密钥。

## 数据库迁移

本地迁移：

```bash
npm run cf:migrate:local
```

远程迁移：

```bash
npm run cf:migrate
```

新增 schema 时，在 `migrations/` 中追加迁移文件，不直接改线上数据库结构。迁移后需要运行完整验证：

```bash
npm test
npm run lint
npm run build
```

## 部署

当前 `wrangler.toml` 和 npm scripts 指向：

- Cloudflare Pages project: `accmgmt-pixverse`
- D1 binding: `DB`
- D1 database: `accmgmt-pixverse`

手动部署：

```bash
npm test
npm run lint
npm run build
npm run cf:migrate
npm run cf:deploy
```

GitHub Actions 会在推送到 `main` 后运行测试和构建；配置 Cloudflare secrets 后可继续执行 D1 迁移与 Pages 部署。

## 验证

每次修改后运行：

```bash
npm test
npm run lint
npm run build
```

提交前同时检查：

- UI 中没有实现说明、调试说明或隐藏入口说明。
- 没有新增多平台、额度、复杂日历或账号详情页。
- 普通成员仍可查看、搜索、使用、预约和结束自己的占用。
- 编辑模式只影响账号信息维护。
- `backups/`、`archives/`、`.env`、`.dev.vars` 没有进入提交。

## 仓库约定

- 主分支：`main`
- 包管理：npm
- Node.js：建议使用 24.x，与 GitHub Actions 配置保持一致
- 构建产物：`dist/`，不提交
- 本地 Cloudflare 状态：`.wrangler/`，不提交
- 数据备份：`backups/`、`archives/`，不提交

## 常用命令

```bash
npm run dev              # Vite dev server
npm run local            # 本地 Pages 预览
npm test                 # Vitest
npm run lint             # TypeScript noEmit check
npm run build            # TypeScript build + Vite build
npm run cf:migrate:local # Apply local D1 migrations
npm run cf:migrate       # Apply remote D1 migrations
npm run cf:deploy        # Deploy to Cloudflare Pages
```
