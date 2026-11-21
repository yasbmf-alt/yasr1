# Arte do mapa-múndi: ilhas em pixel (uma por bioma + Ilha Final), oceano e barquinho.
import math, os, random
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'quest', 'scene', 'mapa')
INK = (29, 37, 65, 255)
def hexc(h, a=255): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)

def island(name, grass, grass2, feat, seed=1, W=88, H=64):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load(); rnd = random.Random(seed)
    cx, cy = W // 2, H // 2 + 8
    def ell(rx, ry, c, dy=0, jag=0):
        for y in range(H):
            for x in range(W):
                j = jag * math.sin(x * 0.7 + seed) if jag else 0
                if ((x - cx) / rx) ** 2 + ((y - cy - dy) / ry) ** 2 <= 1 + j * 0.04: px[x, y] = c
    ell(40, 18, hexc('#7fd3e8', 200), 2)           # água rasa
    ell(36, 15, hexc('#1d2541'), 0, 1)              # contorno
    ell(35, 14, hexc('#f4d9a4'), 0, 1)              # areia
    ell(35, 6, hexc('#d9b77a'), 9)                  # sombra da areia
    ell(28, 10, hexc('#1d2541'), -4, 1)
    ell(27, 9, hexc(grass), -4, 1)                  # grama
    ell(22, 4, hexc(grass2), -1)
    for _ in range(26):                             # espuma
        a = rnd.random() * 2 * math.pi; x = int(cx + 39 * math.cos(a)); y = int(cy + 2 + 17 * math.sin(a))
        if 0 <= x < W - 1 and 0 <= y < H: px[x, y] = (255, 255, 255, 255); px[x + 1, y] = (255, 255, 255, 255)
    feat(px, cx, cy - 6, rnd)
    im.save(os.path.join(OUT, f'ilha-{name}.png'), optimize=True)

def rect(px, x, y, w, h, c):
    for yy in range(y, y + h):
        for xx in range(x, x + w): px[xx, yy] = hexc(c) if isinstance(c, str) else c

def pines(px, cx, cy, rnd):
    for dx, h in ((-14, 14), (-4, 18), (8, 13), (16, 10)):
        x = cx + dx; base = cy + 2
        rect(px, x, base - 3, 1, 4, '#5b3a2e')
        for i in range(h):
            half = max(0, (h - i) // 3)
            for xx in range(x - half, x + half + 1): px[xx, base - 3 - i] = hexc('#2f6f4e' if xx >= x else '#3f8f63')
        px[x, base - 3 - h] = INK

def hospital(px, cx, cy, rnd):
    rect(px, cx - 13, cy - 14, 26, 16, '#1d2541'); rect(px, cx - 12, cy - 13, 24, 14, '#fffaf0')
    rect(px, cx - 12, cy - 13, 24, 2, '#e0525e')
    for yy in (cy - 9, cy - 5):
        for xx in range(cx - 10, cx + 10, 4): rect(px, xx, yy, 2, 2, '#9fc0ef')
    rect(px, cx - 2, cy - 3, 4, 5, '#6e3f73')
    rect(px, cx - 1, cy - 22, 3, 7, '#e0525e'); rect(px, cx - 3, cy - 20, 7, 3, '#e0525e')

def crystals(px, cx, cy, rnd):
    for dx, h, c, c2 in ((-12, 12, '#c9b2f5', '#8f6fd6'), (-2, 18, '#f8c9f1', '#c76bd8'), (9, 10, '#c9b2f5', '#8f6fd6')):
        x = cx + dx; base = cy + 2
        for i in range(h):
            half = max(0, (h - i) // 4 + (1 if i < h - 2 else 0))
            for xx in range(x - half, x + half + 1): px[xx, base - i] = hexc(c if xx <= x else c2)
        px[x, base - h] = (255, 255, 255, 255)

def lanterns(px, cx, cy, rnd):
    # árvore redonda + lamparina acesa
    for y in range(cy - 16, cy):
        for x in range(cx - 18, cx - 2):
            if (x - (cx - 10)) ** 2 + (y - (cy - 8)) ** 2 <= 50: px[x, y] = hexc('#9aa64a' if x < cx - 9 else '#7d8a3a')
    rect(px, cx - 11, cy - 1, 2, 4, '#6b4a3a')
    rect(px, cx + 8, cy - 14, 1, 16, '#5b3a2e'); rect(px, cx + 5, cy - 18, 7, 5, '#1d2541'); rect(px, cx + 6, cy - 17, 5, 3, '#ffe08a')
    for a in range(0, 360, 30):
        x = int(cx + 8 + 7 * math.cos(math.radians(a))); y = int(cy - 15 + 6 * math.sin(math.radians(a)))
        if a % 60 == 0: px[x, y] = hexc('#fff3b0')

def big_hospital(px, cx, cy, rnd):
    hospital(px, cx - 8, cy, rnd); hospital(px, cx + 12, cy + 2, rnd)

for name, g, g2, feat, seed in [
    ('resp', '#7fcb5d', '#a5e07a', pines, 1), ('emerg', '#8fd17a', '#b6e39d', hospital, 2),
    ('mente', '#7d5bd6', '#9f7cf0', crystals, 3), ('cuidado', '#e9c46a', '#f4d27a', lanterns, 4),
]:
    island(name, g, g2, feat, seed)
island('final', '#8fd17a', '#b6e39d', big_hospital, 5, W=112, H=76)

# oceano (tile 48x48 que emenda) com marolas
oc = Image.new('RGBA', (48, 48), hexc('#3f7fd6')); p = oc.load(); rnd = random.Random(7)
for y in range(48):
    for x in range(48):
        if (x * 7 + y * 13) % 97 == 0: p[x, y] = hexc('#4a8ce0')
for _ in range(7):
    x, y = rnd.randrange(48), rnd.randrange(48)
    for k in range(5): p[(x + k) % 48, y] = hexc('#7fb3ee')
    p[(x + 1) % 48, (y - 1) % 48] = hexc('#a9cdf5'); p[(x + 2) % 48, (y - 1) % 48] = hexc('#a9cdf5')
oc.save(os.path.join(OUT, 'oceano.png'), optimize=True)

# barquinho (a Yasmin vai em cima)
b = Image.new('RGBA', (32, 22), (0, 0, 0, 0)); q = b.load()
for y in range(14, 20):
    span = 14 - (y - 14) * 2
    for x in range(16 - span, 16 + span): q[x, y] = hexc('#8a4b12' if y > 15 else '#c9803f')
for x in range(2, 30): q[x, 14] = INK
rect(q, 15, 1, 1, 13, '#5b3a2e')
for y in range(2, 12):
    for x in range(16, 16 + (y - 1)): q[x, y] = hexc('#fffaf0' if (x + y) % 5 else '#f8c9f1')
q[15, 0] = hexc('#e0525e'); q[16, 0] = hexc('#e0525e'); q[17, 1] = hexc('#e0525e')
b.save(os.path.join(OUT, 'barco.png'), optimize=True)
print('ok')
