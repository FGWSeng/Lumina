from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (246, 245, 241)
BRAND = (23, 74, 119)
SOFT = (234, 241, 247)
GOLD = (166, 124, 16)
INK = (23, 32, 51)
MUTED = (107, 119, 135)
LINE = (214, 209, 196)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

d.rectangle([0, 0, 14, H], fill=BRAND)
d.ellipse([900, -160, 1360, 300], fill=SOFT)
d.ellipse([1040, 380, 1240, 580], fill=(251, 245, 228))

bold = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 74)
mid = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 31)
small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 23)
tag = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 21)

d.text((84, 88), "Q U E S T I O N   B A N K", font=tag, fill=GOLD)
d.text((80, 140), "题库 · 点点积累", font=bold, fill=BRAND)
d.text((84, 268), "数学竞赛 17 届 · 172 题", font=mid, fill=INK)
d.text((84, 318), "分类浏览 · 关键词检索 · 分步解析 · 学霸心法", font=mid, fill=MUTED)

d.line([84, 452, 1116, 452], fill=LINE, width=2)
d.text((84, 486), "先看题，再想考点；展开才是答案与解析。", font=small, fill=MUTED)
d.text((84, 530), "静态站点 · 手机与桌面自适应", font=small, fill=MUTED)

d.rounded_rectangle([960, 486, 1116, 546], radius=10, outline=BRAND, width=2)
d.text((988, 502), "172 题", font=tag, fill=BRAND)

img.save("public/og.png", optimize=True)
print("saved public/og.png", img.size)
