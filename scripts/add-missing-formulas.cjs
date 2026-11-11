const fs = require('fs')
const path = 'content/formulas/math-competition.json'
const d = JSON.parse(fs.readFileSync(path, 'utf8'))

function add(chNo, groupIdx, item) {
  const ch = d.chapters.find((c) => c.seq === chNo)
  const g = ch.groups[groupIdx]
  const seq = g.formulas.length + 1
  g.formulas.push({
    seq,
    id: `f-${ch.seq}-${g.seq}-${seq}`,
    name: item.name,
    expr: item.expr,
    tags: item.tags || [],
    tip: item.tip || '',
    deriveHtml: item.derive || '',
    memoryHtml: item.memory || '',
    whenHtml: item.when || '',
    jjNo: '',
  })
  console.log(`+ 第${chNo}章 ${g.title} → ${item.name}`)
}

// 1.1 等比数列求和
add(1, 0, {
  name: '等比数列求和（有限与无穷）',
  expr:
    '$$\\sum_{k=0}^{n}q^k=\\frac{1-q^{\\,n+1}}{1-q}\\ (q\\ne1),\\qquad \\sum_{k=0}^{\\infty}q^k=\\frac{1}{1-q}\\ (|q|<1)$$',
  tags: [],
  tip: '竞赛里常反过来用：把 $\\dfrac{1-q^{n+1}}{1-q}$ 拆成两项，或把循环小数、几何级数一眼化成 $\\dfrac{1}{1-q}$。',
  derive:
    '<p>错位相减：$S_n=1+q+\\cdots+q^n$，两边乘 $q$ 后相减得 $(1-q)S_n=1-q^{n+1}$。令 $n\\to\\infty$，当 $|q|<1$ 时 $q^{n+1}\\to0$，得到无穷和。</p>',
  memory: '<p>有限和记「首项 × (1 − q 的项数次方) / (1 − q)」；无穷和只在 $|q|<1$ 时存在，等于 $\\dfrac{1}{1-q}$。</p>',
  when: '<p><strong>条件</strong>：$q\\ne1$（有限和）；$|q|<1$（无穷和）。$|q|\\ge1$ 时级数发散。</p>',
})

// 1.2 正余弦定理
add(1, 1, {
  name: '正弦定理与余弦定理',
  expr:
    '$$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}=2R,\\qquad a^{2}=b^{2}+c^{2}-2bc\\cos A$$',
  tags: [],
  tip: '几何应用题里，把「角度关系」翻译成「边长关系」靠余弦定理，把「边长比」翻译成「角的正弦比」靠正弦定理。',
  derive:
    '<p>正弦定理：作外接圆，同弧所对圆周角相等，配合直径所对直角可得 $a=2R\\sin A$。余弦定理：把 $\\vec a=\\vec b-\\vec c$ 两边平方即得。</p>',
  memory: '<p>正弦定理「边比等于对角正弦比，等于 2R」；余弦定理「第三边平方 = 两边平方和 − 2 倍两边乘夹角余弦」。</p>',
  when: '<p><strong>适用</strong>：任意三角形。已知两角一边用正弦定理；已知两边及夹角、或三边求角用余弦定理。</p>',
})

// 1.4 排序不等式与 Chebyshev
add(1, 3, {
  name: '排序不等式与 Chebyshev',
  expr:
    '$$\\sum_{k=1}^{n}a_kb_k\\ \\ge\\ \\sum_{k=1}^{n}a_kb_{\\sigma(k)}\\ \\ge\\ \\sum_{k=1}^{n}a_kb_{n+1-k}\\quad(a_1\\le\\cdots\\le a_n,\\ b_1\\le\\cdots\\le b_n)$$' +
    '$$\\frac1n\\sum_{k=1}^{n}a_kb_k\\ \\ge\\ \\Big(\\frac1n\\sum_{k=1}^{n}a_k\\Big)\\Big(\\frac1n\\sum_{k=1}^{n}b_k\\Big)\\quad(\\text{同序})$$',
  tags: [],
  tip: '看到「和 × 和」与「乘积和」比较，先想 Chebyshev；看到「重新排列后最大/最小」，用排序不等式，同序最大、逆序最小。',
  derive:
    '<p>排序不等式：任意交换两项会改变总和，同序相乘每项都最大。Chebyshev 由排序不等式把 $n$ 个同序配对相加后取平均得到。</p>',
  memory: '<p>「同序最大、逆序最小、乱序居中」；Chebyshev 就是「平均的乘积 ≤ 乘积的平均」（同序时）。</p>',
  when: '<p><strong>条件</strong>：两组数都单调同向（同序）。一组递增一组递减时不等号反向。</p>',
})

// 2.2 洛必达法则
add(2, 1, {
  name: '洛必达法则（三种未定式与前提）',
  expr:
    '$$\\lim_{x\\to a}\\frac{f(x)}{g(x)}=\\lim_{x\\to a}\\frac{f\'(x)}{g\'(x)}\\quad\\Big(\\frac00\\ \\text{或}\\ \\frac{\\infty}{\\infty}\\Big),\\qquad \\lim f\\,g=\\lim\\frac{f}{1/g}\\ (0\\cdot\\infty)$$',
  tags: [],
  tip: '竞赛里洛必达多用于「验证答案」，正式解答更爱用等价无穷小与泰勒；一旦分子分母出现振荡（如 $\\sin\\frac1x$），洛必达直接失效。',
  derive:
    '<p>$0/0$ 型由 Cauchy 中值定理：$\\dfrac{f(x)-f(a)}{g(x)-g(a)}=\\dfrac{f\'(\\xi)}{g\'(\\xi)}$，令 $x\\to a$ 即得。$\\infty/\\infty$ 型另作变换后用同样思路。</p>',
  memory: '<p>「上下都趋 0 或都趋 ∞，才能上下分别求导」；乘积型先化成分式，幂指型先取对数。</p>',
  when: '<p><strong>三个前提</strong>：① 是 $\\frac00$ 或 $\\frac\\infty\\infty$；② 去心邻域内可导且 $g\'(x)\\ne0$；③ 导数之比的极限存在（或为 $\\pm\\infty$）。缺一不可，且右端不存在时不能反推左端不存在。</p>',
})

// 2.4 Stirling
add(2, 3, {
  name: 'Stirling 公式（阶乘的阶）',
  expr:
    '$$n!\\ \\sim\\ \\sqrt{2\\pi n}\\,\\Big(\\frac{n}{\\mathrm e}\\Big)^{n},\\qquad \\ln n!=n\\ln n-n+O(\\ln n)$$',
  tags: [],
  tip: '凡是出现 $\\sqrt[n]{n!}$、$\\dfrac{n!}{n^n}$、$\\ln(n!)$ 的极限，先用 Stirling 把阶乘换成幂，再取对数定阶。',
  derive:
    '<p>由 $\\ln n!=\\sum_{k=1}^{n}\\ln k$ 与积分 $\\int_1^n\\ln x\\,\\mathrm dx$ 比较（Euler–Maclaurin 展开到一阶），得到 $\\ln n!=n\\ln n-n+\\frac12\\ln(2\\pi n)+o(1)$，取指数即得。</p>',
  memory: '<p>记「$n!\\approx\\sqrt{2\\pi n}\\,(n/\\mathrm e)^n$」；只要阶就记「$\\ln n!\\sim n\\ln n$」。</p>',
  when: '<p><strong>用途</strong>：$n\\to\\infty$ 时估计阶乘的量级；$\\sqrt[n]{n!}\\sim\\dfrac{n}{\\mathrm e}$。不是等式，只保证比值趋于 1。</p>',
})

fs.writeFileSync(path, JSON.stringify(d, null, 2) + '\n', 'utf8')
const total = d.chapters.reduce((n, c) => n + c.groups.reduce((m, g) => m + g.formulas.length, 0), 0)
console.log('总公式数:', total)
