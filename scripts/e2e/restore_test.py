# Teste real de backup e restauração (modo navegador, sem banco):
# exporta, apaga tudo, restaura e compara item por item. Também testa
# "juntar", arquivo inválido e "desfazer importação".
# Uso: python3 scripts/e2e/restore_test.py caminho/do/backup.json
import asyncio, json, sys, tempfile, os
from playwright.async_api import async_playwright

APP = 'file://' + os.path.abspath('dist/index.html')
src = json.load(open(sys.argv[1]))
seed = src.get('data', src)
LISTS = ['chapters','missions','topics','sessions','notes','events','simulados','decks','cards','errnotes','macetes','letters','vouchers']

def norm(d):
    return {k: sorted(d.get(k, []), key=lambda x: x['id']) for k in LISTS}

async def main():
    ok = True
    def check(cond, msg):
        nonlocal ok
        print(('✓ ' if cond else '✗ ') + msg)
        ok = ok and cond
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. app com os dados reais
        ctx = await b.new_context(accept_downloads=True)
        pg = await ctx.new_page()
        await pg.add_init_script(f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('yasr1-data', {json.dumps(json.dumps(seed))}); localStorage.setItem('yasr1-cfg-tab','geral'); sessionStorage.setItem('seeded','1'); }}")
        await pg.goto(APP + '#config'); await pg.wait_for_timeout(1200)
        async with pg.expect_download() as dl:
            await pg.get_by_role('button', name='Backup dos dados').click()
        path = os.path.join(tempfile.mkdtemp(), 'backup.json')
        await (await dl.value).save_as(path)
        exported = json.load(open(path))
        check(exported['app'] == 'yas-r1' and exported['version'] >= 2, 'backup exportado no formato do Yas R1')
        check(norm(exported['data']) == norm(seed), 'backup exportado tem exatamente os mesmos itens dos dados originais')
        await ctx.close()

        # 2. navegador vazio → restaurar → comparar
        ctx = await b.new_context()
        pg = await ctx.new_page()
        await pg.add_init_script("localStorage.setItem('yasr1-cfg-tab','geral')")
        await pg.goto(APP + '#config'); await pg.wait_for_timeout(1000)
        before = json.loads(await pg.evaluate("localStorage.getItem('yasr1-data') || '{}'"))
        check(len(before.get('missions', [])) == 0, 'navegador novo começa sem dados')
        await pg.set_input_files('#import-file', path); await pg.wait_for_timeout(500)
        check(await pg.get_by_text('Backup conferido').count() == 1, 'arquivo conferido antes de restaurar')
        await pg.get_by_role('button', name='Substituir tudo').click()
        await pg.get_by_role('button', name='Sim, substituir').click(); await pg.wait_for_timeout(1200)
        after = json.loads(await pg.evaluate("localStorage.getItem('yasr1-data')"))
        check(norm(after) == norm(seed), 'restauração trouxe de volta todos os itens, idênticos')
        check(after['settings'].get('celebrationPhrases') == seed['settings'].get('celebrationPhrases'), 'frases personalizadas preservadas')
        check(after['settings'].get('mimos') == seed['settings'].get('mimos'), 'vales de mimos preservados')

        # 3. desfazer importação
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.get_by_role('button', name='Desfazer').click()
        await pg.get_by_role('button', name='Voltar').click(); await pg.wait_for_timeout(1000)
        undone = json.loads(await pg.evaluate("localStorage.getItem('yasr1-data')"))
        check(len(undone.get('missions', [])) == 0, '“Desfazer importação” voltou ao estado anterior')

        # 4. juntar: registro novo continua, backup entra sem apagar
        extra = {'id': 'teste-extra', 'date': '2026-10-17', 'topicId': '', 'missionId': None, 'activityId': None, 'type': 'leitura', 'minutes': 25, 'questions': None, 'correct': None, 'errorTopics': [], 'notes': 'registro que não está no backup', 'createdAt': '2026-10-17T12:00:00Z'}
        await pg.evaluate(f"(() => {{ const d = JSON.parse(localStorage.getItem('yasr1-data')); d.sessions = [{json.dumps(extra)}]; localStorage.setItem('yasr1-data', JSON.stringify(d)); }})()")
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.set_input_files('#import-file', path); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='Juntar (não apaga nada)').click(); await pg.wait_for_timeout(1200)
        merged = json.loads(await pg.evaluate("localStorage.getItem('yasr1-data')"))
        ids = {s['id'] for s in merged['sessions']}
        check('teste-extra' in ids and all(s['id'] in ids for s in seed['sessions']), '“Juntar” manteve o registro novo e acrescentou os do backup')
        check(len(merged['missions']) == len(seed['missions']), '“Juntar” não duplicou missões')

        # 5. arquivo inválido
        bad = os.path.join(tempfile.mkdtemp(), 'ruim.json'); open(bad, 'w').write('{"app":"outro","data":{}}')
        await pg.set_input_files('#import-file', bad); await pg.wait_for_timeout(400)
        check(await pg.get_by_text('Esse arquivo não pode ser restaurado').count() == 1, 'arquivo inválido é recusado antes de mexer em qualquer coisa')
        await ctx.close(); await b.close()
    print('\nRESULTADO:', 'tudo certo' if ok else 'há falhas')
    sys.exit(0 if ok else 1)

asyncio.run(main())
