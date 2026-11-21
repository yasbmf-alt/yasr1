# Gera os cenários em pixel (camadas para parallax) dos 4 biomas do Yas Quest.
# Cada camada tem 192 x 108 "pixels" e emenda na horizontal (pode repetir sem costura).
import math, os, random
from PIL import Image
W, H = 192, 108
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'quest', 'scene', 'biomas')
INK = '#1d2541'

class Img:
    def __init__(self): self.px = {}
    def put(self, x, y, c):
        if 0 <= y < H: self.px[(x % W, y)] = c
    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w): self.put(xx, yy, c)
    def png(self, path):
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for (x, y), c in self.px.items():
            im.putpixel((x, y), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
        im.save(path, optimize=True)
    def svg(self):
        # junta pixels iguais em tiras horizontais para o arquivo ficar pequeno
        rows = {}
        for (x, y), c in self.px.items(): rows.setdefault(y, {})[x] = c
        out = []
        for y in sorted(rows):
            r = rows[y]; xs = sorted(r); i = 0
            while i < len(xs):
                x0 = xs[i]; c = r[x0]; j = i
                while j + 1 < len(xs) and xs[j + 1] == xs[j] + 1 and r[xs[j + 1]] == c: j += 1
                out.append(f'<rect x="{x0}" y="{y}" width="{xs[j] - x0 + 1}" height="1" fill="{c}"/>')
                i = j + 1
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W * 2}" height="{H * 2}" shape-rendering="crispEdges">{"".join(out)}</svg>\n'

def wave(x, parts, base):
    return base + sum(a * math.sin(2 * math.pi * k * x / W + p) for a, k, p in parts)

def sky(bands, top=None, extra=None):
    im = Img(); n = len(bands); bh = H / n
    for y in range(H):
        f = y / bh; i = min(n - 1, int(f)); frac = f - i
        for x in range(W):
            c = bands[i]
            # pontilhado entre as faixas (cara de 16 bits)
            if i + 1 < n and frac > 0.72 and (x + y) % 2 == 0: c = bands[i + 1]
            if i + 1 < n and frac > 0.88: c = bands[i + 1] if (x + y) % 2 == 0 or frac > 0.95 else c
            im.put(x, y, c)
    if extra: extra(im)
    return im

def disc(im, cx, cy, r, c, glow=None):
    for y in range(cy - r - 3, cy + r + 4):
        for x in range(cx - r - 3, cx + r + 4):
            d = math.hypot(x - cx, y - cy)
            if d <= r: im.put(x, y, c)
            elif glow and d <= r + 2.5 and (x + y) % 2 == 0: im.put(x, y, glow)

def stars(im, n, cols, seed=3, ymax=70):
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.randrange(W), rnd.randrange(ymax); c = rnd.choice(cols)
        im.put(x, y, c)
        if rnd.random() < .15: im.put(x + 1, y, c); im.put(x - 1, y, c); im.put(x, y + 1, c); im.put(x, y - 1, c)

def ridge(parts, base, c, c2=None, cap=None, capd=0):
    im = Img()
    for x in range(W):
        top = int(wave(x, parts, base))
        for y in range(top, H): im.put(x, y, c)
        if c2:  # sombra no lado direito das encostas
            slope = wave(x + 1, parts, base) - wave(x, parts, base)
            if slope > 0.15:
                for y in range(top, min(H, top + 14)): im.put(x, y, c2)
        if cap and top < capd:
            for y in range(top, min(H, top + max(1, (capd - top) // 2))): im.put(x, y, cap)
    return im

def clouds(cols, seed=5, n=5, ymax=46):
    im = Img(); rnd = random.Random(seed)
    for _ in range(n):
        cx, cy = rnd.randrange(W), rnd.randrange(6, ymax); w = rnd.randrange(14, 30)
        for k in range(3):
            bw = w - k * 6; bx = cx + k * 3 - w // 2
            im.rect(bx, cy - k * 2, bw, 3, cols[0])
        im.rect(cx - w // 2 + 2, cy + 3, w - 4, 1, cols[1])
    return im

# ── objetos do plano do meio ──
def pine(im, x, base, h, dark, light, trunk):
    im.rect(x - 1, base - 4, 3, 5, trunk)
    for i in range(h):
        y = base - 4 - i; half = max(1, int((h - i) * 0.42)) if i % 4 != 3 else max(1, int((h - i) * 0.3))
        for xx in range(x - half, x + half + 1): im.put(xx, y, light if xx < x else dark)
    im.put(x, base - 4 - h, light)

def round_tree(im, x, base, r, leaf, leaf2, trunk):
    im.rect(x - 1, base - r - 2, 3, r + 2, trunk)
    cy = base - r - 4
    for y in range(cy - r, cy + r + 1):
        for xx in range(x - r - 1, x + r + 2):
            if (xx - x) ** 2 / 1.2 + (y - cy) ** 2 <= r * r: im.put(xx, y, leaf2 if (xx - x) + (y - cy) > r * .4 else leaf)

def building(im, x, base, w, h, wall, win, lit, rnd, cross=False):
    im.rect(x, base - h, w, h, wall)
    im.rect(x, base - h, w, 1, INK)
    for yy in range(base - h + 3, base - 3, 4):
        for xx in range(x + 2, x + w - 2, 3):
            im.rect(xx, yy, 1, 2, lit if rnd.random() < .45 else win)
    if cross:
        cx, cy = x + w // 2, base - h - 5
        im.rect(cx - 3, cy - 1, 7, 3, '#ffffff'); im.rect(cx - 1, cy - 3, 3, 7, '#ffffff')
        im.rect(cx - 2, cy, 5, 1, '#e0525e'); im.rect(cx, cy - 2, 1, 5, '#e0525e')

def mushroom(im, x, base, h, cap, cap2, stem, dot):
    im.rect(x - 1, base - h, 3, h, stem)
    r = max(4, h // 2 + 2)
    for y in range(base - h - r // 2 - 1, base - h + 1):
        span = int(r * math.sqrt(max(0, 1 - ((y - (base - h)) / (r / 1.6 + 1)) ** 2)))
        for xx in range(x - span, x + span + 1): im.put(xx, y, cap2 if xx > x + span // 3 else cap)
    im.put(x - r // 2, base - h - 2, dot); im.put(x + 1, base - h - r // 3, dot); im.put(x + r // 2, base - h - 1, dot)

def lantern(im, x, base, pole, glow, light):
    im.rect(x, base - 16, 1, 16, pole); im.rect(x - 2, base - 19, 5, 4, light); im.rect(x - 1, base - 18, 3, 2, '#fff7d6')
    for dx in range(-5, 6):
        for dy in range(-5, 5):
            if 3.5 < math.hypot(dx, dy) < 5.5 and (dx + dy) % 2 == 0: im.put(x + dx, base - 17 + dy, glow)

def ground(top, grass, grass2, dirt, deco, seed=9, bump=None):
    im = Img(); rnd = random.Random(seed)
    for x in range(W):
        t = top + (int(1.2 * math.sin(2 * math.pi * 3 * x / W)) if bump else 0)
        for y in range(t, H): im.put(x, y, dirt if y > t + 6 else grass)
        im.put(x, t, grass2)
        if x % 3 == 0: im.put(x, t - 1, grass2)
        if rnd.random() < .08: im.put(x, t + rnd.randrange(8, H - t), grass2)
    for _ in range(18): deco(im, rnd.randrange(W), top, rnd)
    return im

# ── biomas ──
def resp():
    s = sky(['#6fbdf2', '#93cdf6', '#b6defa', '#d7ecfd', '#eef7ff'], extra=lambda im: disc(im, 150, 20, 7, '#fff7d6', '#fffbe8'))
    far = ridge([(7, 2, 0.4), (6, 3, 1.2), (4, 7, 2.0)], 50, '#9ec3ea', '#86b0de', cap='#ffffff', capd=42)
    mid = Img()
    rnd = random.Random(2)
    for i in range(18):
        x = i * W // 18 + rnd.randrange(-3, 4); h = rnd.randrange(14, 26)
        pine(mid, x, 84 + rnd.randrange(0, 4), h, '#2f6f4e', '#3f8f63', '#5b3a2e')
    for x in range(W):
        for y in range(84, H): mid.put(x, y, '#3f8f63')
    def deco(im, x, t, rnd):
        k = rnd.random()
        if k < .3: im.put(x, t - 1, '#f8c9f1'); im.put(x, t - 2, '#f38cb8')
        elif k < .5: im.put(x, t - 1, '#ffffff'); im.put(x, t - 2, '#fff3b0')
        elif k < .62: im.rect(x - 1, t - 3, 3, 1, '#e0525e'); im.put(x, t - 2, '#fffdf3'); im.put(x, t - 1, '#fffdf3'); im.put(x - 1, t - 3, '#ffffff')
        else: im.put(x, t - 1, '#5fae4a'); im.put(x + 1, t - 2, '#5fae4a')
    near = ground(90, '#7fcb5d', '#a5e07a', '#6b4a3a', deco, bump=True)
    return s, far, mid, near, clouds(['#ffffff', '#d7ecfd'])

def emerg():
    s = sky(['#7f5ac8', '#c56fa8', '#ff8f8b', '#ffb38a', '#ffd29a', '#ffe9b8'], extra=lambda im: disc(im, 120, 62, 12, '#ffe08a', '#fff3b0'))
    far = Img(); rnd = random.Random(4); x = 0
    while x < W:
        w = rnd.randrange(6, 14); h = rnd.randrange(16, 40)
        far.rect(x, 80 - h, w, h + 28, '#b06a93'); x += w
    for xx in range(W):
        for y in range(78, H): far.put(xx, y, '#b06a93')
    mid = Img(); rnd = random.Random(7); x = 0; k = 0
    while x < W - 6:
        w = rnd.randrange(12, 22); h = rnd.randrange(22, 44)
        if x + w > W: w = W - x
        building(mid, x, 90, w, h + (10 if k == 3 else 0), '#6e3f73' if k % 2 else '#5c3566', '#4b2a55', '#ffe08a', rnd, cross=(k == 3))
        x += w + rnd.randrange(1, 4); k += 1
    def deco(im, x, t, rnd):
        if rnd.random() < .35:
            im.rect(x, t - 12, 1, 12, '#2b2440'); im.rect(x - 1, t - 13, 3, 1, '#2b2440'); im.put(x, t - 14, '#ffe08a'); im.put(x - 1, t - 12, '#fff3b0')
        else: im.put(x, t - 1, '#8fd17a'); im.put(x + 1, t - 1, '#6fae5a'); im.put(x, t - 2, '#6fae5a')
    near = ground(92, '#5c4a6b', '#7a6690', '#3f3350', deco)
    for x in range(0, W, 8): near.rect(x, 99, 4, 1, '#d9cfe8')
    return s, far, mid, near, clouds(['#ffd9e4', '#ffb38a'], seed=11, n=4)

def mente():
    def ex(im):
        stars(im, 70, ['#ffffff', '#fff3b0', '#f8c9f1'], seed=8)
        disc(im, 40, 22, 8, '#fff3b0', '#c9b2f5'); disc(im, 44, 19, 7, '#2a1a5e')
    s = sky(['#140f33', '#1f1550', '#2c1d6b', '#3d2788', '#5a3aa8'], extra=ex)
    far = Img()
    rnd = random.Random(12)
    for i in range(14):
        cx = i * W // 14 + rnd.randrange(-4, 5); h = rnd.randrange(18, 36); base = 82
        for y in range(base - h, base + 30):
            half = int((y - (base - h)) * 0.55)
            for xx in range(cx - half, cx + half + 1): far.put(xx, y, '#6a48b8' if xx < cx else '#523a99')
        far.put(cx, base - h, '#c9b2f5')
    mid = Img(); rnd = random.Random(13)
    for i in range(9):
        x = i * W // 9 + rnd.randrange(-5, 6); h = rnd.randrange(10, 22)
        mushroom(mid, x, 90, h, '#d27ae6', '#a855c2', '#efe3ff', '#fff3b0')
    def deco(im, x, t, rnd):
        k = rnd.random()
        if k < .4: im.put(x, t - 1, '#9f7cf0'); im.put(x, t - 2, '#c9b2f5')
        elif k < .6: im.put(x, t - 3, '#d9ee76'); im.put(x, t - 1, '#7d5bd6')
        else: im.put(x, t - 1, '#f8c9f1')
    near = ground(92, '#3a2a6b', '#6a4fc2', '#271c4d', deco, bump=True)
    return s, far, mid, near, clouds(['#5a3aa8', '#3d2788'], seed=14, n=4)

def cuidado():
    s = sky(['#e07a5f', '#f19a6b', '#f7b267', '#f9c784', '#fcd9a5', '#fdebc8'], extra=lambda im: disc(im, 60, 66, 11, '#fff3b0', '#ffe9b8'))
    far = ridge([(6, 1, 0.2), (4, 2, 1.7), (2, 5, 0.9)], 66, '#d0896a', '#bd7558')
    mid = Img(); rnd = random.Random(21)
    for i in range(10):
        x = i * W // 10 + rnd.randrange(-4, 5)
        if i % 3 == 1: lantern(mid, x, 88, '#5b3a2e', '#ffe08a', '#f6c46b')
        else: round_tree(mid, x, 88, rnd.randrange(5, 9), '#9aa64a', '#7d8a3a', '#6b4a3a')
    for x in range(W):
        for y in range(86, H): mid.put(x, y, '#c9a24c')
    def deco(im, x, t, rnd):
        k = rnd.random()
        if k < .6:
            for i in range(4): im.put(x, t - 1 - i, '#f4d27a' if i < 3 else '#fff3b0')
        else: im.put(x, t - 1, '#f8c9f1'); im.put(x, t - 2, '#ffffff')
    near = ground(92, '#e9c46a', '#f4d27a', '#b98a3e', deco)
    return s, far, mid, near, clouds(['#fff3e0', '#fcd9a5'], seed=22, n=4)

for name, fn in [('resp', resp), ('emerg', emerg), ('mente', mente), ('cuidado', cuidado)]:
    layers = fn()
    for lname, im in zip(['ceu', 'longe', 'meio', 'perto', 'nuvens'], layers):
        im.png(os.path.join(OUT, f'{name}-{lname}.png'))
print('ok')
