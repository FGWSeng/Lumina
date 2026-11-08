# Cloudflare Pages 部署流程

## 零、前置条件

| 项 | 说明 |
|----|------|
| Cloudflare 账号 | 免费注册，Pages 静态托管不限流量 |
| GitHub 账号 | 用于 Git 集成自动部署（也可跳过，用直传） |
| Node.js | 本地 20.19+ 或 22.12+（Vite 8 要求） |

---

## 一、方式 A：Git 集成（推荐，长期维护）

### 1. 推送仓库

```bash
cd E:/Project/question-bank
git init
git add .
git commit -m "init question bank"
git branch -M main
git remote add origin https://github.com/<你的用户名>/question-bank.git
git push -u origin main
```

`.gitignore` 已包含 `node_modules`、`dist`、`public/data`（数据由构建生成，不入库）。

### 2. 创建 Pages 项目

1. 登录 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权并选择 `question-bank` 仓库。
3. 构建配置：

| 配置项 | 值 |
|--------|-----|
| Framework preset | `None`（或 Vite） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/`（默认） |

4. 环境变量（**重要**）：

| 变量 | 值 | 原因 |
|------|-----|------|
| `NODE_VERSION` | `22` | Vite 8 需要 Node 20.19+/22.12+ |
| `NPM_FLAGS` | `--no-audit --no-fund` | 加快安装（可选） |

5. 点击 **Save and Deploy**，等待 1–3 分钟。

### 3. 得到地址

部署成功后会得到：

```
https://question-bank-xxx.pages.dev
```

这个地址可以直接发到微信/飞书/QQ，手机浏览器打开即用，**无需备案**。

---

## 二、方式 B：wrangler 直传（不想接 Git）

```bash
npm i -D wrangler
npm run build
npx wrangler pages deploy dist --project-name question-bank
```

首次会打开浏览器登录 Cloudflare；之后每次更新只要重新 `build` + `deploy`。

---

## 三、方式 C：拖拽上传（最快验证）

1. Dashboard → Workers & Pages → Create → Pages → **Upload assets**。
2. 把本地 `dist` 文件夹拖进去。
3. 得到临时 `*.pages.dev` 地址。

适合先看效果，不适合长期更新（每次要手动拖）。

---

## 四、项目里已经配好的两件事

### 1. SPA 回退 `public/_redirects`

```
/*    /index.html   200
```

没有它，直接访问 `/s/math` 或刷新详情页会 404。Vite 构建会把 `public/_redirects` 复制到 `dist/`。

### 2. 缓存策略 `public/_headers`

```
/assets/*            → 一年 immutable（文件名带 hash）
/data/questions/*    → 一年 immutable（单题分片，内容不变）
/data/library.json   → 5 分钟（索引会随新增题目变化）
```

新增题目后索引需要刷新，所以 `library.json` 不能设长缓存。

---

## 五、自定义域名（可选）

1. Pages 项目 → **Custom domains** → **Set up a custom domain**。
2. 输入域名，按提示在 DNS 添加 CNAME。
3. 域名需在 Cloudflare 托管，HTTPS 自动签发。

注意：

- 用 `*.pages.dev` 子域名**不需要备案**；
- 绑定自己的域名且服务器在境外，通常也无需备案，但国内访问速度取决于线路；
- 若之后要接飞书网页应用，飞书要求安全域名备案，那时再考虑国内托管。

---

## 六、日常更新流程

```bash
# 1. 改内容（新增题目 / 新增科目）
#    content/... 下编辑 JSON

# 2. 本地校验
npm run check

# 3. 本地预览
npm run dev

# 4. 提交
git add .
git commit -m "add english reading 2026"
git push
```

Git 集成会自动重新构建并部署，1–2 分钟后线上生效。

---

## 七、构建失败排查

| 现象 | 原因 | 处理 |
|------|------|------|
| `Vite requires Node 20.19+` | Node 版本低 | 设置 `NODE_VERSION=22` |
| `Cannot find module 'katex'` | 依赖未装 | 确认 `package.json` 有 katex，重新部署 |
| 页面 404（刷新子路由） | 缺 `_redirects` | 确认 `dist/_redirects` 存在 |
| 公式显示为源码 | KaTeX CSS 未加载 | 确认 `main.jsx` 引入 `katex/dist/katex.min.css` |
| 数据 404 | `public/data` 未生成 | 构建命令必须是 `npm run build`（含 `build:data`） |

---

## 八、体积与限制

| 项 | 当前 | Cloudflare Pages 免费额度 |
|----|------|--------------------------|
| 构建产物 | 约 17 MB（172 题详情） | 单次部署 20,000 文件 |
| 索引 | 714 KB（gzip 约 150 KB） | 无单文件压力 |
| 单题分片 | 平均 88 KB（gzip 后约 12 KB） | 25 MiB / 文件 |
| 构建次数 | 每次 push 一次 | 500 次/月 |

题目增长到几千题时，建议：

1. 把 `library.json` 按科目/分类拆分，首屏只加载当前科目；
2. 单题详情启用预压缩 `.json.gz` + 前端解压（参考大观园静态版）；
3. 图片统一 WebP + 内容哈希 + 懒加载。

---

## 九、分享给别人

### 1. 直接发链接

部署后得到的 `https://xxx.pages.dev` 就是公开地址：

- 微信 / 飞书 / QQ 里直接发，手机点开即用；
- 不需要登录、不需要备案、不限制访问人数；
- 静态托管不限流量，别人刷题不产生费用。

### 2. 链接预览卡片（已配好）

`index.html` 已加入：

```html
<meta property="og:title" content="题库 · 点点积累" />
<meta property="og:description" content="数学竞赛 17 届 · 172 题 · 分类浏览、检索、分步解析与心法" />
<meta property="og:image" content="/og.png" />
```

封面图在 `public/og.png`（1200×630），会随构建复制到 `dist/`。

**部署后建议把 `og:image` 改成完整地址**，部分平台不解析相对路径：

```html
<meta property="og:image" content="https://你的项目.pages.dev/og.png" />
```

改完重新 push 即可生效。

### 3. 二维码（可选）

把线上链接生成二维码，方便手机扫描：

- 草料二维码 <https://cli.im>（在线，免费）
- 或 VS Code 插件 `QR Code Generator`

可以打印出来贴在书桌，或发到群里。

### 4. 自定义域名（可选）

1. Pages 项目 → **Custom domains** → **Set up a custom domain**；
2. 输入域名，按提示添加 CNAME；
3. 域名需在 Cloudflare 托管，HTTPS 自动签发。

用 `*.pages.dev` 子域名不需要备案；自定义域名只是更好记，不影响功能。

### 5. 访问控制（可选）

| 需求 | 做法 |
|------|------|
| 公开给所有人 | 默认，什么都不用配 |
| 只给指定的人 | Cloudflare Zero Trust → Access → 配置邮箱验证（免费版 50 用户） |
| 简单密码 | 用 Pages Functions 写一层 Basic Auth（需要少量代码） |
| 完全私密 | 不发布，只本地 `npm run dev` |

### 6. 分享前必须知道的一点

**收藏与掌握度存在每个访客自己的浏览器里**（localStorage），不会上传，也互不可见：

- 别人打开看到的是空白进度，不影响阅读题目；
- 换设备或清缓存后，自己的记录会丢；
- 如果以后要跨设备同步、看别人的正确率，就需要接后端（Supabase / Cloudflare D1）。

### 7. 分享前检查清单

- [ ] 手机浏览器打开正常，公式不溢出
- [ ] 单题模式能翻页，答案/解析能展开
- [ ] 链接发到微信/飞书有标题和封面
- [ ] 没有把私人笔记、密钥、未公开内容放进 `content/`
- [ ] 题目来源与版权说明符合预期（当前内容仅供个人学习）
