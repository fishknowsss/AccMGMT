# AccMGMT

工作室内部的 Runway 账号占用看板。网站只保存账号邮箱、续费日期、使用人、小组、项目和占用时间，不保存密码。

## 功能

- 查看 40 个账号的空闲、使用中、已预约状态
- 立即使用账号
- 预约未来时段
- 同一账号同一时间只能被一个人占用
- 到结束时间后自动显示为空闲
- 提前释放当前占用
- 维护账号邮箱和续费日期
- 账号信息编辑需要内部操作口令

## 本地运行

安装依赖：

```bash
npm install
```

一键打开本地预览：

```bash
npm run local
```

第一次运行时会自动创建 `.dev.vars`，默认本地账号编辑口令是：

```txt
123456
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
npx wrangler pages dev dist --d1 DB=accmgmt --compatibility-date=2026-05-09
```

## Cloudflare 部署

当前项目已按 Cloudflare Pages + D1 接入云端数据。

- 生产地址：`https://accmgmt.pages.dev/`
- 数据库：Cloudflare D1 `accmgmt`
- D1 database id：`f9430df1-a23e-4ba8-9f8b-55cb97d2b9ae`
- 线上数据表：`accounts`、`bookings`
- 账号信息编辑口令通过 Pages 环境变量 `OPERATOR_PIN` 配置

1. 登录 Cloudflare。
2. 创建 D1 数据库，名称用 `accmgmt`。
3. 把数据库 ID 填到 `wrangler.toml` 的 `database_id`。
4. 在 Cloudflare Pages 项目里添加环境变量 `OPERATOR_PIN`。
5. 应用远程迁移：

```bash
npm run cf:migrate
```

6. 部署：

```bash
npm run cf:deploy
```

7. 在 Pages 项目的 Custom domains 里绑定你的域名。

### 绑定子域名

如果主域名 DNS 已托管到 Cloudflare：

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 打开 `accmgmt` 项目。
4. 进入 `Custom domains`。
5. 点击 `Set up a domain`。
6. 输入要使用的子域名，例如 `runway.example.com`。
7. 按 Cloudflare 提示确认，DNS 记录会自动创建。

如果主域名 DNS 不在 Cloudflare，需要在 DNS 服务商处添加 CNAME：

```txt
Type: CNAME
Name: runway
Target: accmgmt.pages.dev
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

- `https://accmgmt.pages.dev/`
- 已绑定的自定义域名，例如 `https://runway.fishknowsss.com/`

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
