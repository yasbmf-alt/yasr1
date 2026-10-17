# Teste da versão hospedada contra um "Supabase de mentira" (interceptado no
# navegador): login, migração do backup, leitura depois de recarregar,
# gravação sem internet (caixa de saída) e conferência com o banco.
# Não substitui o teste no Supabase de verdade, mas exercita o código do app.
# Uso: VITE_SUPABASE_URL=https://fake.supabase.test VITE_SUPABASE_ANON_KEY=x npm run build:web
#      python3 scripts/e2e/cloud_test.py caminho/do/backup.json
import asyncio, json, sys, os, base64, time, threading, http.server, socketserver, functools, urllib.parse
from playwright.async_api import async_playwright

UID = '11111111-1111-1111-1111-111111111111'
store = {}  # (col,id) -> data

def jwt():
    seg = lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return f"{seg({'alg':'HS256','typ':'JWT'})}.{seg({'sub':UID,'role':'authenticated','exp':int(time.time())+3600,'aud':'authenticated','email':'yas@teste.com'})}.assinatura"

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory='dist-web')
    httpd = socketserver.TCPServer(('127.0.0.1', 4173), handler, bind_and_activate=False)
    httpd.allow_reuse_address = True; httpd.server_bind(); httpd.server_activate()
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

async def fake(route, request):
    url = urllib.parse.urlparse(request.url)
    q = urllib.parse.parse_qs(url.query)
    cors = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range'}
    if request.method == 'OPTIONS':
        return await route.fulfill(status=200, headers=cors)
    if url.path == '/auth/v1/token':
        body = {'access_token': jwt(), 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'refresh_token': 'r1',
                'user': {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'yas@teste.com', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-10-17T00:00:00Z'}}
        return await route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps(body))
    if url.path == '/auth/v1/user':
        return await route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'id': UID, 'aud': 'authenticated', 'email': 'yas@teste.com', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-10-17T00:00:00Z'}))
    if url.path == '/rest/v1/yas_docs':
        if request.method in ('GET', 'HEAD'):
            rows = [{'col': c, 'id': i, 'data': d} for (c, i), d in sorted(store.items())]
            if 'col' in q: rows = [r for r in rows if r['col'] == q['col'][0].replace('eq.', '')]
            off = int(q.get('offset', ['0'])[0]); lim = int(q.get('limit', ['100000'])[0])
            page = rows[off:off + lim]
            h = dict(cors, **{'content-range': f'{off}-{off + len(page) - 1}/{len(rows)}' if page else f'*/{len(rows)}'})
            return await route.fulfill(status=200, headers=h, content_type='application/json', body='' if request.method == 'HEAD' else json.dumps(page))
        if request.method == 'POST':
            for r in json.loads(request.post_data):
                assert r['user_id'] == UID
                store[(r['col'], r['id'])] = r['data']
            return await route.fulfill(status=201, headers=cors, body='')
        if request.method == 'DELETE':
            store.pop((q['col'][0].replace('eq.', ''), q['id'][0].replace('eq.', '')), None)
            return await route.fulfill(status=204, headers=cors, body='')
    return await route.fulfill(status=404, headers=cors, body='{}')

async def main():
    seed = json.load(open(sys.argv[1]))
    seed = seed.get('data', seed)
    ok = True
    def check(c, m):
        nonlocal ok
        print(('✓ ' if c else '✗ ') + m); ok = ok and c
    httpd = serve()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        await ctx.route('https://fake.supabase.test/**', fake)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://127.0.0.1:4173/'); await pg.wait_for_timeout(1500)
        check(await pg.get_by_role('heading', name='Entrar no Yas R1').count() == 1, 'site abre na tela de login')
        await pg.fill('#login-email', 'yas@teste.com'); await pg.fill('#login-pass', 'senha-de-teste')
        await pg.get_by_role('button', name='Entrar', exact=True).click(); await pg.wait_for_timeout(2500)
        check(await pg.locator('.sidebar, nav').count() > 0, 'login leva para o app')
        # migração: restaurar o backup do Claude
        await pg.evaluate("localStorage.setItem('yasr1-cfg-tab','geral')")
        await pg.goto('http://127.0.0.1:4173/#config'); await pg.wait_for_timeout(1500)
        await pg.set_input_files('#import-file', sys.argv[1]); await pg.wait_for_timeout(600)
        await pg.get_by_role('button', name='Substituir tudo').click()
        await pg.get_by_role('button', name='Sim, substituir').click(); await pg.wait_for_timeout(3000)
        counts = {}
        for (c, _i) in store: counts[c] = counts.get(c, 0) + 1
        want = {k: len(seed.get(k, [])) for k in ['chapters', 'missions', 'topics', 'sessions', 'notes'] if seed.get(k)}
        check(all(counts.get(k) == v for k, v in want.items()), f'backup migrado para o banco: {counts}')
        check(store.get(('missions', 'm1-1')) == {k: v for k, v in next(m for m in seed['missions'] if m['id'] == 'm1-1').items() if k != 'id'} | {'id': 'm1-1'}, 'conteúdo de uma missão chegou idêntico ao banco')
        # recarregar sem cópia local: dados vêm do banco
        await pg.evaluate(f"localStorage.removeItem('yasr1-cache-{UID}')")
        await pg.goto('http://127.0.0.1:4173/#trilha'); await pg.wait_for_timeout(2500)
        tabs = await pg.locator('.ch-tab, [role=tab]').count()
        check(tabs >= 6, f'depois de recarregar, os capítulos vêm do banco ({tabs} abas)')
        # sem internet: grava na caixa de saída e envia depois
        before = len(store)
        await ctx.set_offline(True)
        await pg.get_by_role('button', name='Post-it').first.click(); await pg.wait_for_timeout(800)
        outbox = json.loads(await pg.evaluate(f"localStorage.getItem('yasr1-outbox-{UID}') || '{{}}'"))
        check(len(outbox) >= 1 and len(store) == before, 'sem internet, o post-it fica guardado na caixa de saída do aparelho')
        await ctx.set_offline(False); await pg.evaluate("window.dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(2500)
        outbox = json.loads(await pg.evaluate(f"localStorage.getItem('yasr1-outbox-{UID}') || '{{}}'"))
        check(len(store) == before + 1 and not outbox, 'quando a internet volta, o post-it é enviado ao banco')
        # conferir
        await pg.goto('http://127.0.0.1:4173/#config'); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button', name='Conferir meus dados').click(); await pg.wait_for_timeout(2500)
        check(await pg.get_by_text('Tudo o que está no app está também no banco').count() == 1, '“Conferir meus dados” confirma app = banco')
        check(not errs, f'sem erros de página {errs[:2]}')
        await b.close()
    httpd.shutdown()
    print('\nRESULTADO:', 'tudo certo' if ok else 'há falhas'); sys.exit(0 if ok else 1)

asyncio.run(main())
