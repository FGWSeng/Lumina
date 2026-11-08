"""把精讲版的推导/记忆/何时用合并进公式大全内容源
用法: python scripts/merge-jingjiang.py
"""
import re, json, difflib

JJ = r"E:/考研/数学/数学竞赛/真题详解/html/竞赛非数A-公式推导与心法-精讲版.html"
SRC = r"E:/Project/Lumina/content/formulas/math-competition.json"

html = open(JJ, encoding="utf-8").read()

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).replace("&nbsp;", " ").strip()

h2s = []
for m in re.finditer(r'<h2 id="([^"]+)"[^>]*>([\s\S]*?)</h2>', html):
    h2s.append((m.start(), m.end(), m.group(1), strip_tags(m.group(2))))

chapters = []
for i, (s, e, cid, title) in enumerate(h2s):
    end = h2s[i + 1][0] if i + 1 < len(h2s) else len(html)
    body = html[e:end]
    intro = re.search(r'<section class="chapintro">([\s\S]*?)</section>', body)
    items = []
    for hm in re.finditer(r'<h3 id="([^"]+)"[^>]*>([\s\S]*?)</h3>([\s\S]*?)(?=<h3 id=|$)', body):
        inner = hm.group(2)
        after = hm.group(3)
        no = re.search(r'<span class="no">([\s\S]*?)</span>', inner)
        name = strip_tags(re.sub(r'<span class="no">[\s\S]*?</span>', "", inner))
        fm = re.search(r'<p class="fm">([\s\S]*?)</p>', after)
        dv = re.search(r'<p class="dv">([\s\S]*?)</p>', after)
        mm = re.search(r'<p class="mm">([\s\S]*?)</p>', after)
        uu = re.search(r'<p class="uu">([\s\S]*?)</p>', after)
        items.append({
            "no": no.group(1).strip() if no else "",
            "name": name,
            "fm": fm.group(1).strip() if fm else "",
            "derive": re.sub(r'<span class="lb">[\s\S]*?</span>', "", dv.group(1)).strip() if dv else "",
            "memory": re.sub(r'<span class="lb">[\s\S]*?</span>', "", mm.group(1)).strip() if mm else "",
            "when": re.sub(r'<span class="lb">[\s\S]*?</span>', "", uu.group(1)).strip() if uu else "",
        })
    chapters.append({"title": title, "intro": intro.group(1).strip() if intro else "", "items": items})

def norm(s):
    s = re.sub(r"\$[^$]*\$", "", s or "")
    s = re.sub(r"（[^）]*）|\([^)]*\)", "", s)
    s = re.sub(r"[：:，,。；;、\-—·\s\"'“”‘’]", "", s)
    return s

def ratio(a, b):
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()

src = json.load(open(SRC, encoding="utf-8"))
report = []
matched = 0
unmatched_j = 0
unmatched_s = 0

for ci, ch in enumerate(src["chapters"]):
    jj = chapters[ci] if ci < len(chapters) else {"items": [], "intro": ""}
    J = jj["items"]
    s_formulas = [f for g in ch["groups"] for f in g["formulas"]]
    s_names = [f["name"] for f in s_formulas]

    pairs = []
    if len(J) == len(s_names):
        pairs = list(range(len(J)))
        for k in range(len(J)):
            report.append((ci + 1, J[k]["name"], s_names[k], ratio(J[k]["name"], s_names[k]), "seq"))
    else:
        i = j = 0
        pairs = [None] * len(s_names)
        while i < len(J) and j < len(s_names):
            r = ratio(J[i]["name"], s_names[j])
            if r >= 0.55:
                pairs[j] = i
                report.append((ci + 1, J[i]["name"], s_names[j], r, "match"))
                i += 1
                j += 1
            else:
                rj = ratio(J[i]["name"], s_names[j + 1]) if j + 1 < len(s_names) else 0
                ri = ratio(J[i + 1]["name"], s_names[j]) if i + 1 < len(J) else 0
                if rj >= ri:
                    j += 1
                else:
                    i += 1
        report.append((ci + 1, f"<未匹配 {len(J)} 条精讲>", f"<{len(s_names)} 条汇总>", 0, "gap"))

    for k, f in enumerate(s_formulas):
        idx = pairs[k] if k < len(pairs) else None
        if idx is not None and idx < len(J):
            item = J[idx]
            if item["derive"]:
                f["deriveHtml"] = item["derive"]
                f["memoryHtml"] = item["memory"]
                f["whenHtml"] = item["when"]
                f["jjNo"] = item["no"]
                matched += 1
            else:
                unmatched_s += 1
        else:
            unmatched_s += 1

    # 章导语（如果有）
    if jj.get("intro"):
        ch["jjIntro"] = jj["intro"]

    unmatched_j += max(0, len(J) - sum(1 for p in pairs if p is not None))

json.dump(src, open(SRC, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print(f"精讲条数: {sum(len(c['items']) for c in chapters)} / 汇总条数: {sum(len(g['formulas']) for c in src['chapters'] for g in c['groups'])}")
print(f"匹配成功: {matched} / 未匹配汇总: {unmatched_s} / 未匹配精讲: {unmatched_j}")
print("\n低相似度（<0.7）匹配：")
for ci, a, b, r, kind in report:
    if kind == "match" and r < 0.7:
        print(f"  ch{ci} {r:.2f} | {a[:24]} || {b[:24]}")
print("\n缺口语义（gap）：")
for ci, a, b, r, kind in report:
    if kind == "gap":
        print(f"  ch{ci} {a} {b}")
