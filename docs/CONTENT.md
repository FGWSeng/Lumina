# 内容管理与扩展规范

这份文档面向「往题库里加题」的场景。页面代码不需要改动，只动 `content/`。

## 一、目录约定

```
content/
├── subjects.json                 # 唯一的科目注册表
├── math/
│   └── competition/              # 题库目录（group）
│       ├── 2009.json             # 一套卷 = 一个年份文件
│       └── 2025.json
├── english/
│   └── reading/                  # 例：英语阅读
│       └── 2026.json
├── politics/
│   └── theory/
│       └── 2026.json
└── major/
    └── 408/                      # 例：计算机专业课
        └── 2026.json
```

规则：

1. **一套卷一个文件**，文件名固定为 `YYYY.json`（四位年份）。
2. 目录名用小写英文短横线：`competition`、`long-sentence`、`data-structure`。
3. 图片放在 `public/images/<科目>/`，文件名用内容哈希或英文短名，避免中文与空格。
4. `public/data/` 是构建产物，**不要手改**，每次 `npm run build:data` 会清空重建。

## 二、科目注册表 `content/subjects.json`

```json
{
  "id": "english",
  "name": "英语",
  "en": "English",
  "desc": "好词好句、长难句阅读、翻译与写作。",
  "icon": "book",
  "order": 2,
  "status": "ready",
  "groups": [
    {
      "id": "reading",
      "name": "阅读",
      "desc": "长难句拆解与精读",
      "categories": [
        {
          "id": "long-sentence",
          "name": "长难句",
          "desc": "结构拆解与翻译",
          "dir": "english/reading"
        }
      ]
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `id` | 科目唯一标识，小写英文，用于 URL 与题目 ID |
| `name` | 显示名称 |
| `en` | 英文名，用于英文眉标 |
| `desc` | 首页卡片描述，一句话 |
| `icon` | `sigma` / `book` / `landmark` / `layers` |
| `order` | 首页排序，小的在前 |
| `status` | `ready` 开放；`coming` 占位 |
| `groups[].id` | 题库标识，如 `competition` |
| `categories[].id` | 分类标识，如 `prelim` |
| `categories[].dir` | 内容目录，相对 `content/` |

新增科目 = 在 `subjects` 数组里加一项，把 `status` 改为 `ready`，补上 `dir` 与内容文件即可。**不需要改任何页面代码。**

## 三、题目文件 `content/<dir>/<year>.json`

```json
{
  "year": 2009,
  "stage": "prelim",
  "stageName": "初赛",
  "paper": "首届（2009）初赛 非数学专业类",
  "edition": 1,
  "source": "第1届（2009）初赛",
  "questions": [
    {
      "seq": 1,
      "number": "填空 1",
      "type": "fill",
      "title": "二重积分",
      "tags": ["二重积分", "换元", "雅可比"],
      "difficulty": 3,
      "stemHtml": "已知 $f(x)=e^{x^2}$，求 $\\varphi(x)$。",
      "steps": [
        { "title": "第一步：先认清结构", "html": "<p>...</p><div class=\"fm\">$$...$$</div>" }
      ],
      "moral": {
        "title": "学霸心法总结",
        "lead": "看到这类题，按这个顺序出牌：",
        "items": ["先判断...", "再..." ]
      },
      "answerHtml": "$\\dfrac{16}{15}$"
    }
  ]
}
```

### 字段规范

| 字段 | 必填 | 说明 |
|------|------|------|
| `seq` | 是 | 卷内序号，从 1 开始，决定题目 ID 与顺序 |
| `number` | 是 | 显示题号，如 `填空 1`、`第 3 题` |
| `type` | 是 | `fill` 填空 / `choice` 选择 / `solution` 解答 |
| `title` | 是 | 一句话考点标题，列表主标题 |
| `tags` | 建议 | 2–6 个考点标签，用于筛选与检索 |
| `difficulty` | 建议 | 1–5，列表显示为难度条 |
| `stemHtml` | 是 | 题干，可直接写 HTML，公式用 `$...$` / `$$...$$` |
| `steps[]` | 是 | 分步解析，`title` 为步骤名，`html` 为正文 |
| `moral` | 否 | 学霸心法，`lead` 一句总起，`items` 为有序要点 |
| `answerHtml` | 是 | 最终答案 |

### 写作约定

- 公式用 **LaTeX**，行内 `$...$`，独立 `$$...$$`，构建时统一预渲染。
- 源文件里写成 `&gt;` / `&lt;` 的不等号会被自动解码，不需要手工改成 `>`。
- 自定义宏（如 `\avg`）已在构建脚本里注册；新宏需在 `scripts/build-data.mjs` 的 `macros` 中补充。
- 填空位写 `＿＿＿＿`（全角下划线），构建后自动变成可识别的填空线。
- 段落用 `<p>`，公式块用 `<div class="fm">$$...$$</div>`，不要手写 KaTeX HTML。
- 步骤标题统一「第一步：…」「第二步：…」，最多 6 步。
- 心法 `items` 3–5 条，每条一句话，可迁移到同类题。

## 四、题目 ID 与命名

构建时自动生成：

```
{subject}-{group}-{category}-{year}-{seq:02d}
```

示例：

| 题目 | ID |
|------|-----|
| 数学竞赛初赛 2009 第 1 题 | `math-competition-prelim-2009-01` |
| 英语阅读 2026 第 12 题 | `english-reading-long-sentence-2026-12` |
| 政治理论 2026 第 3 题 | `politics-theory-choice-2026-03` |

改 `seq` 会改变 ID，已收藏的记录会失联，**定稿后不要改序号**。

## 五、新增科目的完整步骤

以「英语 → 阅读 → 长难句」为例：

1. 在 `content/subjects.json` 找到 `english`，把 `status` 改为 `ready`，确认 `categories[0].dir` 为 `english/reading`。
2. 新建 `content/english/reading/2026.json`，按上面的结构写题。
3. 图片放 `public/images/english/`。
4. 运行：

```bash
npm run check       # 校验字段与 id
npm run build:data  # 重新生成索引与分片
npm run dev         # 本地看效果
```

5. 首页会自动出现「英语」卡片，导航自动多一项，科目页自动出现分类树与年份。

## 六、新增一套卷 / 一年真题

1. 在对应 `dir` 下新建 `YYYY.json`（同一年多套卷时用 `YYYY-2.json`，需同步调整 `build-data.mjs` 的文件名规则）。
2. 写 `questions` 数组，`seq` 从 1 开始。
3. `npm run build:data` 后，年份筛选与左侧树会自动多出这一年。

## 七、标签与难度建议

- 标签优先用**考点名**，不要用题型名（题型已有独立字段）。
- 同一考点在不同届里保持同一写法，例如统一用「隐函数求导」，不要混用「隐函数求导法」。
- 难度参考：1–2 基础填空，3 常规解答，4 综合多步，5 压轴/竞赛难。
- 标签超过 6 个时只保留最能区分的前 6 个。

## 八、从 PDF / HTML 导入

当前数学竞赛使用 `scripts/import-html.mjs`，依赖源 HTML 的固定结构：

```
<article class="q">
  <div class="qhead"><span class="qno">…</span><span class="src">…</span></div>
  <div class="stem">…</div>
  <section class="step"><h3>…</h3>…</section>
  <div class="moral">…</div>
  <div class="ans">…</div>
</article>
```

如果新科目的源文件结构不同，复制一份 `import-html.mjs` 改解析规则即可，输出仍落到 `content/<dir>/<year>.json`，后续构建流程不变。
