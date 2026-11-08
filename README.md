# 题库 · 点点积累

一个可扩展的多科目题库网站。纯静态、无后端，构建时预渲染公式，部署在 Cloudflare Pages。

## 特性

- **单题 / 列表双模式**：默认一页一题，完整题干、答案与解析原地展开、吸底翻题；列表模式用于按目录浏览
- **多科目结构**：科目 → 题库 → 分类 → 题目，新增科目只改配置
- **构建期公式渲染**：KaTeX 在构建时生成 HTML，浏览器端零公式计算
- **索引与详情分离**：`library.json` 只存轻量索引，单题按 id 分片加载
- **检索与筛选**：关键词、年份、题型、考点标签组合筛选
- **阅读体验**：答案/解析折叠、分步拆解、学霸心法、← → 翻题
- **本地状态**：收藏与掌握度存 localStorage，不上传服务器
- **响应式**：桌面左侧目录常驻，移动端目录抽屉、按钮 2/3/1 行、展开自动滚动

## 快速开始

```bash
npm install
npm run import     # 从真题 HTML 导入内容（仅首次/更新源文件时）
npm run dev        # 本地开发
npm run build      # 生成数据 + 构建静态产物到 dist/
npm run preview    # 预览构建产物
npm run check      # 校验内容源
```

## 目录结构

```
question-bank/
├── content/                     # 内容源（唯一需要编辑的地方）
│   ├── subjects.json            # 科目 / 题库 / 分类注册表
│   └── math/competition/        # 数学竞赛初赛
│       ├── 2009.json
│       └── ...
├── scripts/
│   ├── import-html.mjs          # 源 HTML → 内容 JSON
│   ├── build-data.mjs           # 内容 JSON → 索引 + 分片 + 预渲染
│   └── check-data.mjs           # 内容校验
├── public/
│   ├── _redirects               # SPA 回退（Cloudflare Pages）
│   ├── _headers                 # 缓存策略
│   └── data/                    # 构建产物（自动生成，勿手改）
│       ├── library.json
│       └── questions/<id>.json
├── src/
│   ├── components/              # Layout / 题目列表项 / 难度 / 标签
│   ├── lib/                     # 数据加载、筛选、localStorage 状态
│   ├── pages/                   # 首页 / 科目页 / 详情页 / 说明
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── docs/
│   ├── CONTENT.md               # 内容管理与扩展规范
│   └── DEPLOY.md                # Cloudflare Pages 部署流程
└── vite.config.js
```

## 数据模型

四级结构：

```
科目 Subject（数学 / 英语 / 政治 / 专业课）
└── 题库 Group（数学竞赛 / 考研数学 / 四六级 …）
    └── 分类 Category（初赛 / 阅读 / 选择题 …）
        └── 题目 Question（年份 + 题号）
```

题目 ID 规范：

```
{subject}-{group}-{category}-{year}-{seq}
math-competition-prelim-2009-01
```

索引只保留列表与搜索需要的字段（题号、年份、标签、难度、题干摘要），详情分片保存预渲染后的题干、步骤、心法、答案。

## 内容来源

当前数学竞赛初赛 17 届（2009–2025）共 172 题，由 `scripts/import-html.mjs` 从真题详解 HTML 导入。英语、政治、专业课已在配置中占位，按 `docs/CONTENT.md` 接入即可。

## 部署

见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 许可

内容仅供个人学习使用。
