# Gera os ícones do app (site próprio) a partir do mascote provisório.
# Uso: python3 scripts/make-icons.py  → public/icon-192.png, icon-512.png, icon-512-maskable.png
import asyncio
from playwright.async_api import async_playwright

SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="{s}" height="{s}">
<rect width="120" height="120" fill="{bg}"/>
<g transform="translate({o} {o}) scale({k})">
<circle cx="60" cy="60" r="56" fill="#F8C9F1"/>
<path d="M36 30 v22 a24 24 0 0 0 48 0 v-22" fill="none" stroke="#2E4A7F" stroke-width="6" stroke-linecap="round"/>
<circle cx="36" cy="28" r="5" fill="#2E4A7F"/><circle cx="84" cy="28" r="5" fill="#2E4A7F"/>
<path d="M60 76 v14 a10 10 0 0 0 20 0" fill="none" stroke="#2E4A7F" stroke-width="6" stroke-linecap="round"/>
<circle cx="80" cy="92" r="9" fill="#F38CB8"/><circle cx="80" cy="92" r="4" fill="#fff"/>
<path d="M60 62 c-8-6-14-10-14-16 a6 6 0 0 1 14-3 a6 6 0 0 1 14 3 c0 6-6 10-14 16z" fill="#F38CB8"/>
</g></svg>'''

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, size, bg, k in [('icon-192.png', 192, '#FBF6F9', 1), ('icon-512.png', 512, '#FBF6F9', 1), ('icon-512-maskable.png', 512, '#F8C9F1', 0.72)]:
            o = 60 - 60 * k
            pg = await b.new_page(viewport={'width': size, 'height': size})
            await pg.set_content(f'<html><body style="margin:0">{SVG.format(s=size, bg=bg, o=o, k=k)}</body></html>')
            await pg.screenshot(path=f'public/{name}', omit_background=False)
            await pg.close()
        await b.close()
asyncio.run(main())
