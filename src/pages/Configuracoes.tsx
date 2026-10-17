import { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { useUI, Field, ConfirmButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset, FOLDER, GROUPS, SLOTS, STATUS_LABEL, fileNameOf, statusOf, type AssetStatus } from '../assets/registry';
import { canUploadImages, uploadImage } from '../components/upload';
import { platformKind, saveDownload, supa } from '../platform/platform';
import { quietRewards } from '../components/useRewards';
import { LIST_LABEL, buildBackup, checkBackup, clearPreRestore, countsOf, keepPreRestore, mergeSnapshots, readPreRestore, remapAssets, restoreFiles, type Checked } from '../logic/backup';
import { isDemoOn, setDemo } from '../data/repo';
import type { DataSnapshot } from '../types';
import { DEFAULT_PHRASES } from '../types';
import { today } from '../logic/dates';
import { play, setSoundVolume } from '../logic/sound';
import { Recompensas, CartasCfg, SonsProprios } from './ConfigExtras';
import { EventosCfg } from './ConfigEventos';

type CfgTab = 'geral' | 'eventos' | 'recompensas' | 'cartas' | 'sons' | 'ilustracoes';
const CFG_TABS: { id: CfgTab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'recompensas', label: 'Recompensas' },
  { id: 'cartas', label: 'Cartinhas' },
  { id: 'sons', label: 'Sons próprios' },
  { id: 'ilustracoes', label: 'Ilustrações' },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function Configuracoes() {
  const { data, saveSettings, mode } = useStore();
  const s = data.settings;
  const volDraft = useRef<number | null>(null);
  const setVol = (v: number) => {
    volDraft.current = v;
    setSoundVolume(v);
  };
  const commitVol = () => {
    if (volDraft.current != null && volDraft.current !== s.soundVolume) {
      saveSettings({ soundVolume: volDraft.current });
      play('pop');
    }
    volDraft.current = null;
  };
  const [tab, setTab] = useState<CfgTab>(() => {
    try {
      return (localStorage.getItem('yasr1-cfg-tab') as CfgTab) || 'geral';
    } catch {
      return 'geral';
    }
  });
  const pick = (t: CfgTab) => {
    setTab(t);
    try {
      localStorage.setItem('yasr1-cfg-tab', t);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h1">Configurações</h1>
        </div>
      </header>
      <div className="seg seg-tabs seg-wrap" role="tablist" aria-label="Configurações">
        {CFG_TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => pick(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'eventos' && <EventosCfg />}
      {tab === 'recompensas' && <Recompensas />}
      {tab === 'cartas' && <CartasCfg />}
      {tab === 'sons' && <SonsProprios />}
      {tab === 'ilustracoes' && <Illustrations />}
      {tab === 'geral' && (
      <div className="cfg-grid">
        <section className="card">
          <h2 className="h2">Sons</h2>
          <div className="cfg-row">
            <div>
              <strong>Sons do app</strong>
              <p className="muted">Conclusões, portas do armário, livros, post-its e plantas crescendo.</p>
            </div>
            <button
              className={`switch ${s.sound ? 'on' : ''}`}
              role="switch"
              aria-checked={s.sound}
              aria-label="Sons do app"
              onClick={() => {
                saveSettings({ sound: !s.sound });
                if (!s.sound) setTimeout(() => play('check'), 50);
              }}
            >
              <span />
            </button>
          </div>
          <div className={`cfg-row ${s.sound ? '' : 'is-off'}`}>
            <label className="vol" htmlFor="vol">
              <strong>Volume</strong>
              <input
                id="vol"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.soundVolume ?? 0.7}
                disabled={!s.sound}
                onChange={(e) => setVol(Number(e.target.value))}
                onMouseUp={() => commitVol()}
                onTouchEnd={() => commitVol()}
                onKeyUp={() => commitVol()}
              />
            </label>
            <div className="sound-tests">
              {([['check', 'Conclusão'], ['door', 'Armário'], ['page', 'Livro'], ['grow', 'Planta'], ['chapter', 'Capítulo']] as const).map(([k, l]) => (
                <button key={k} className="btn btn-quiet btn-sm" disabled={!s.sound} onClick={() => play(k)}>{l}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="h2">Animações</h2>
          <div className="cfg-row">
            <div>
              <strong>Movimento</strong>
              <p className="muted">Trilha, armário, jardim e celebrações.</p>
            </div>
            <div className="seg">
              {(['system', 'off', 'on'] as const).map((v) => (
                <button key={v} className={s.reducedMotion === v ? 'is-on' : ''} onClick={() => saveSettings({ reducedMotion: v })}>
                  {v === 'system' ? 'Do sistema' : v === 'off' ? 'Completo' : 'Reduzido'}
                </button>
              ))}
            </div>
          </div>
          <div className="cfg-row">
            <div>
              <strong>Efeitos ambientes</strong>
              <p className="muted">Nuvens passando, pétalas, borboletas e plantas balançando.</p>
            </div>
            <button className={`switch ${s.ambient !== false ? 'on' : ''}`} role="switch" aria-checked={s.ambient !== false} aria-label="Efeitos ambientes" onClick={() => saveSettings({ ambient: s.ambient === false })}>
              <span />
            </button>
          </div>
        </section>

        <PhrasesSection />
        <DataSection mode={mode} data={data} />
      </div>
      )}
    </div>
  );
}

function DataSection({ mode, data }: { mode: string; data: DataSnapshot }) {
  const { replaceAll, saveSettings, saving, snapshot } = useStore();
  const ui = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [verify, setVerify] = useState<{ local: Record<string, number>; server: Record<string, number> | null; at: string } | null>(null);
  const [pre, setPre] = useState(() => readPreRestore());
  const [email, setEmail] = useState<string | null>(null);
  const demo = isDemoOn();
  const kind = platformKind();

  useEffect(() => {
    if (kind === 'supabase') void supa()?.then((m) => m.accountEmail()).then(setEmail);
  }, [kind]);

  const exportBackup = async (withFiles: boolean) => {
    setBusy(withFiles ? 'Juntando imagens e sons…' : 'Preparando…');
    const { json, missing } = await buildBackup(snapshot(), withFiles, (d, t) => setBusy(`Juntando arquivos… ${d}/${t}`));
    const text = JSON.stringify(json, null, 2);
    setBusy(null);
    const r = await saveDownload(`yas-r1-backup${withFiles ? '-completo' : ''}-${today()}.json`, text);
    if (r === 'ok') {
      saveSettings({ lastBackupAt: new Date().toISOString() });
      ui.toast(missing.length ? `Backup salvo. ${missing.length} arquivo(s) não puderam ser incluídos.` : 'Backup salvo.');
    } else if (r === 'failed') setFallbackText(text);
  };

  const onFile = async (f: File) => {
    try {
      setChecked(checkBackup(JSON.parse(await f.text())));
    } catch {
      setChecked({ ok: false, problems: ['Não consegui ler esse arquivo como JSON.'], warnings: [] });
    }
  };

  const apply = async (how: 'juntar' | 'substituir') => {
    if (!checked?.data) return;
    const current = snapshot();
    quietRewards();
    keepPreRestore(current);
    setPre(readPreRestore());
    let incoming = checked.data;
    try {
      if (checked.files && Object.keys(checked.files).length) {
        setBusy('Restaurando imagens e sons…');
        const { map, failed } = await restoreFiles(checked.files, (d, t) => setBusy(`Restaurando arquivos… ${d}/${t}`));
        incoming = remapAssets(incoming, map);
        if (failed) ui.toast(`${failed} arquivo(s) não puderam ser restaurados; o resto segue normal.`, 'erro');
      }
      setBusy('Gravando…');
      await replaceAll(how === 'juntar' ? mergeSnapshots(current, incoming) : incoming);
      ui.toast(how === 'juntar' ? 'Backup juntado aos seus dados.' : 'Backup restaurado.');
      setChecked(null);
    } catch {
      ui.toast('A restauração não terminou. Seus dados anteriores estão guardados; use “Desfazer importação”.', 'erro');
    }
    setBusy(null);
  };

  const undo = async () => {
    const p = readPreRestore();
    if (!p) return;
    setBusy('Desfazendo…');
    quietRewards();
    try {
      await replaceAll(p.data);
      clearPreRestore();
      setPre(null);
      ui.toast('Pronto: os dados voltaram a ser como antes da importação.');
    } catch {
      ui.toast('Não consegui desfazer agora. Tente de novo.', 'erro');
    }
    setBusy(null);
  };

  const runVerify = async () => {
    setBusy('Conferindo…');
    const local = countsOf(snapshot());
    let server: Record<string, number> | null = null;
    if (kind === 'supabase') {
      const m = await supa()!;
      const raw = await m.serverCounts(['chapters', 'missions', 'topics', 'sessions', 'notes', 'events', 'simulados', 'decks', 'cards', 'errnotes', 'macetes', 'letters', 'vouchers']);
      server = raw;
    }
    setVerify({ local, server, at: new Date().toISOString() });
    setBusy(null);
  };

  const cur = countsOf(data);
  const last = data.settings.lastBackupAt;

  return (
    <section className="card">
      <h2 className="h2">Dados e backup</h2>
      <p className="muted">
        {mode === 'db' && 'Salvos no banco do app (Claude) e sincronizados entre computador e celular.'}
        {mode === 'cloud' && 'Salvos no seu banco Supabase, ligados à sua conta, e sincronizados entre aparelhos. Sem internet, o app guarda as mudanças e envia depois.'}
        {mode === 'local' && 'Salvos só neste navegador. Exporte um backup com frequência.'}
        {mode === 'demo' && 'Você está vendo dados fictícios de demonstração.'}
      </p>
      {kind === 'supabase' && email && (
        <div className="cfg-row">
          <div>
            <strong>Conta</strong>
            <p className="muted">{email}</p>
          </div>
          <button className="btn btn-quiet btn-sm" onClick={() => void supa()?.then((m) => m.signOut())}>Sair</button>
        </div>
      )}
      <p className="muted small">{last ? `Último backup baixado: ${new Date(last).toLocaleDateString('pt-BR')}.` : 'Você ainda não baixou nenhum backup por aqui.'}</p>
      <div className="btn-row wrap">
        <button className="btn btn-secondary" onClick={() => void exportBackup(false)} disabled={mode === 'demo' || !!busy}>
          <Icon name="download" size={18} /> Backup dos dados
        </button>
        <button className="btn btn-secondary" onClick={() => void exportBackup(true)} disabled={mode === 'demo' || !!busy}>
          <Icon name="download" size={18} /> Backup completo (com imagens e sons)
        </button>
        <button className="btn btn-quiet" onClick={() => fileRef.current?.click()} disabled={mode === 'demo' || !!busy}>
          <Icon name="upload" size={18} /> Restaurar um backup
        </button>
        <button className="btn btn-quiet" onClick={() => void runVerify()} disabled={!!busy}>
          <Icon name="cloudCheck" size={18} /> Conferir meus dados
        </button>
        <input ref={fileRef} id="import-file" type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onFile(f); }} />
      </div>
      {busy && <p className="busy-line" role="status"><span className="save-spin" aria-hidden="true" /> {busy}</p>}

      {checked && (
        <div className={`confirm-box restore-box ${checked.ok ? '' : 'is-bad'}`}>
          {!checked.ok ? (
            <>
              <strong>Esse arquivo não pode ser restaurado:</strong>
              <ul>{checked.problems.map((p) => <li key={p}>{p}</li>)}</ul>
              <div className="register-actions"><button className="btn btn-quiet" onClick={() => setChecked(null)}>Fechar</button></div>
            </>
          ) : (
            <>
              <strong>Backup conferido{checked.exportedAt ? ` · feito em ${new Date(checked.exportedAt).toLocaleString('pt-BR')}` : ''}</strong>
              <table className="table restore-table">
                <thead><tr><th>O quê</th><th className="num">No backup</th><th className="num">No app agora</th></tr></thead>
                <tbody>
                  {(Object.keys(LIST_LABEL) as (keyof typeof LIST_LABEL)[]).filter((k) => (checked.counts?.[k] ?? 0) + (cur[k] ?? 0) > 0).map((k) => (
                    <tr key={k}><td>{LIST_LABEL[k]}</td><td className="num">{checked.counts?.[k] ?? 0}</td><td className="num">{cur[k] ?? 0}</td></tr>
                  ))}
                  {checked.files && <tr><td>Imagens e sons</td><td className="num">{Object.keys(checked.files).length}</td><td className="num">—</td></tr>}
                </tbody>
              </table>
              {checked.warnings.length > 0 && <ul className="restore-warn">{checked.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
              <p className="muted small">Antes de qualquer opção, o app guarda uma cópia do que você tem agora, para poder desfazer.</p>
              <div className="register-actions wrap">
                <button className="btn btn-quiet" onClick={() => setChecked(null)}>Cancelar</button>
                <button className="btn btn-secondary" disabled={!!busy} onClick={() => void apply('juntar')}>Juntar (não apaga nada)</button>
                <ConfirmButton className="btn btn-danger" label="Substituir tudo" question="Trocar todos os dados atuais pelos do backup?" confirmLabel="Sim, substituir" onConfirm={() => void apply('substituir')} />
              </div>
            </>
          )}
        </div>
      )}

      {pre && !checked && (
        <div className="cfg-row">
          <div>
            <strong>Desfazer importação</strong>
            <p className="muted">Volta aos dados de {new Date(pre.at).toLocaleString('pt-BR')}, de antes da última restauração.</p>
          </div>
          <ConfirmButton className="btn btn-quiet btn-sm" label="Desfazer" question="Voltar aos dados de antes?" confirmLabel="Voltar" onConfirm={() => void undo()} />
        </div>
      )}

      {verify && (
        <div className="verify-box">
          <strong>Conferência de {new Date(verify.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
          <table className="table restore-table">
            <thead><tr><th>O quê</th><th className="num">No app</th>{verify.server && <th className="num">No banco</th>}</tr></thead>
            <tbody>
              {(Object.keys(LIST_LABEL) as (keyof typeof LIST_LABEL)[]).filter((k) => verify.local[k] || verify.server?.[k]).map((k) => (
                <tr key={k} className={verify.server && verify.server[k] !== verify.local[k] ? 'is-diff' : ''}>
                  <td>{LIST_LABEL[k]}</td><td className="num">{verify.local[k]}</td>{verify.server && <td className="num">{verify.server[k]}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            {saving ? 'Ainda há alterações a caminho do banco. Confira de novo em alguns segundos.'
              : verify.server == null && kind === 'supabase' ? 'Não consegui falar com o banco agora (sem internet?). Os números acima são os deste aparelho.'
                : verify.server ? (Object.keys(verify.local).every((k) => (verify.server![k] ?? 0) === verify.local[k]) ? '✓ Tudo o que está no app está também no banco.' : 'Há diferença entre o app e o banco: provavelmente alterações ainda sendo enviadas. Confira de novo daqui a pouco.')
                  : mode === 'db' ? '✓ Estes números vêm direto do banco do app.' : 'Estes são os dados guardados neste navegador.'}
          </p>
        </div>
      )}

      <div className="cfg-row">
        <div>
          <strong>Lembrete de backup</strong>
          <p className="muted">Um aviso discreto quando fizer 7 dias do último backup baixado.</p>
        </div>
        <button className={`switch ${data.settings.backupReminder !== false ? 'on' : ''}`} role="switch" aria-checked={data.settings.backupReminder !== false} aria-label="Lembrete de backup" onClick={() => saveSettings({ backupReminder: data.settings.backupReminder === false })}>
          <span />
        </button>
      </div>

      {fallbackText && (
        <div className="fallback">
          <p className="muted">Não consegui baixar o arquivo daqui. Copie o texto abaixo e salve como <span className="mono">yas-r1-backup.json</span>.</p>
          <textarea id="backup-text" readOnly rows={5} value={fallbackText} onFocus={(e) => e.target.select()} />
          <div className="btn-row">
            <button className="btn btn-sm btn-secondary" onClick={() => navigator.clipboard?.writeText(fallbackText).then(() => ui.toast('Copiado.')).catch(() => ui.toast('Selecione o texto e copie.'))}>Copiar</button>
            <button className="btn btn-sm btn-quiet" onClick={() => setFallbackText(null)}>Fechar</button>
          </div>
        </div>
      )}
      <div className="cfg-row">
        <div>
          <strong>Dados de demonstração</strong>
          <p className="muted">Mostra o app preenchido com exemplos fictícios, sem tocar nos seus dados.</p>
        </div>
        <button
          className={`switch ${demo ? 'on' : ''}`}
          role="switch"
          aria-checked={demo}
          aria-label="Dados de demonstração"
          onClick={() => {
            setDemo(!demo);
            location.reload();
          }}
        >
          <span />
        </button>
      </div>
    </section>
  );
}

function Illustrations() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  const [group, setGroup] = useState<string>(GROUPS[0].id);
  const [view, setView] = useState<'grupos' | 'lista'>('grupos');
  const [statusF, setStatusF] = useState<AssetStatus | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  const [canUpload, setCanUpload] = useState<boolean | null>(null);

  useEffect(() => {
    void canUploadImages().then(setCanUpload);
  }, []);

  const upload = async (file: File) => {
    const slot = target.current;
    if (!slot) return;
    setBusy(slot);
    const r = await uploadImage(file);
    setBusy(null);
    if ('error' in r) return ui.toast(r.error, 'erro');
    saveSettings({ assetMap: { ...data.settings.assetMap, [slot]: r.id } });
    ui.toast('Arte aplicada.');
  };

  const map = data.settings.assetMap;
  const g = GROUPS.find((x) => x.id === group)!;
  const slots = SLOTS.filter((x) => x.group === group);
  const counts = SLOTS.reduce((a, sl) => ({ ...a, [statusOf(sl, map)]: (a[statusOf(sl, map)] ?? 0) + 1 }), {} as Record<AssetStatus, number>);

  const csv = () => {
    const rows = [['arquivo', 'finalidade', 'tamanho recomendado', 'ambiente', 'estado', 'chave']];
    for (const sl of SLOTS) rows.push([fileNameOf(sl), sl.label, sl.size, FOLDER[sl.group]?.where ?? sl.group, STATUS_LABEL[statusOf(sl, map)], sl.key]);
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  };
  const downloadList = async () => {
    const text = '\uFEFF' + csv();
    const r = await saveDownload('yas-r1-lista-de-assets.csv', text, 'text/csv');
    if (r === 'failed') ui.toast('Não consegui baixar a lista agora.', 'erro');
  };

  const slotCard = (sl: (typeof SLOTS)[number]) => {
    const st = statusOf(sl, map);
    const custom = st === 'enviado';
    return (
      <div key={sl.key} className={`slot ${custom ? 'is-custom' : ''}`}>
        <div className="slot-prev"><Asset slot={sl.key} /></div>
        <div className="slot-info">
          <strong>{sl.label}</strong>
          <span className={`asset-status st-${st}`}>{STATUS_LABEL[st]}</span>
          <span className="muted mono">{fileNameOf(sl)}</span>
          <span className="muted">{sl.size}</span>
        </div>
        <div className="slot-actions">
          <button
            className="btn btn-sm btn-secondary"
            disabled={canUpload === false || busy === sl.key}
            onClick={() => {
              target.current = sl.key;
              inputRef.current?.click();
            }}
          >
            {busy === sl.key ? 'Enviando…' : custom ? 'Trocar' : 'Enviar arte'}
          </button>
          {custom && (
            <button
              className="btn btn-sm btn-quiet"
              onClick={() => {
                const m = { ...map };
                delete m[sl.key];
                saveSettings({ assetMap: m });
              }}
            >
              Usar provisório
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="card illus">
      <div className="table-head">
        <div>
          <h2 className="h2">Ilustrações</h2>
          <p className="muted">
            Cada peça do app é um espaço substituível, com nome de arquivo fixo. Envie sua arte (PNG transparente ou SVG) e ela entra no lugar do provisório, com a mesma proporção e alinhamento.
          </p>
          <p className="asset-counts">
            <span className="asset-status st-enviado">{counts.enviado ?? 0} suas</span>
            <span className="asset-status st-provisorio">{counts.provisorio ?? 0} provisórias</span>
            {(counts.criar ?? 0) > 0 && <span className="asset-status st-criar">{counts.criar} a criar</span>}
          </p>
        </div>
        <div className="btn-row wrap">
          <div className="seg" role="tablist" aria-label="Visualização">
            <button role="tab" aria-selected={view === 'grupos'} className={view === 'grupos' ? 'is-on' : ''} onClick={() => setView('grupos')}>Por ambiente</button>
            <button role="tab" aria-selected={view === 'lista'} className={view === 'lista' ? 'is-on' : ''} onClick={() => setView('lista')}>Lista completa</button>
          </div>
          <button className="btn btn-quiet btn-sm" onClick={downloadList}><Icon name="download" size={16} /> Baixar lista (planilha)</button>
        </div>
      </div>
      {canUpload === false && (
        <p className="banner banner-local">O envio de imagens não está disponível nesta janela.</p>
      )}
      {view === 'grupos' ? (
        <>
          <div className="seg seg-wrap" role="tablist">
            {GROUPS.map((x) => (
              <button key={x.id} role="tab" aria-selected={group === x.id} className={group === x.id ? 'is-on' : ''} onClick={() => setGroup(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
          <p className="idea"><strong>Ideia de arte:</strong> {g.idea} <span className="muted">Pasta sugerida: <span className="mono">{FOLDER[g.id]?.folder}/</span></span></p>
          <div className="slots">{slots.map(slotCard)}</div>
        </>
      ) : (
        <>
          <div className="reg-filters">
            <select id="asset-status-f" value={statusF} onChange={(e) => setStatusF(e.target.value as AssetStatus | '')} aria-label="Estado">
              <option value="">Todos os estados</option>
              <option value="enviado">Arte sua (existente)</option>
              <option value="provisorio">Provisório · precisa substituir</option>
              <option value="criar">Precisa criar</option>
            </select>
          </div>
          <div className="table-scroll">
            <table className="table asset-table">
              <thead>
                <tr><th>Prévia</th><th>Arquivo</th><th>Finalidade</th><th>Tamanho</th><th>Ambiente</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {SLOTS.filter((sl) => !statusF || statusOf(sl, map) === statusF).map((sl) => (
                  <tr key={sl.key}>
                    <td><span className="asset-mini"><Asset slot={sl.key} /></span></td>
                    <td className="mono">{fileNameOf(sl)}</td>
                    <td>{sl.label}</td>
                    <td className="muted">{sl.size}</td>
                    <td>{FOLDER[sl.group]?.where ?? sl.group}</td>
                    <td><span className={`asset-status st-${statusOf(sl, map)}`}>{STATUS_LABEL[statusOf(sl, map)]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        id="asset-file"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f);
        }}
      />
    </section>
  );
}

function PhrasesSection() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const current = (data.settings.celebrationPhrases ?? DEFAULT_PHRASES).join('\n');
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);
  const commit = () => {
    const list = text.split('\n').map((x) => x.trim()).filter(Boolean);
    if (list.join('\n') !== current) saveSettings({ celebrationPhrases: list });
  };
  return (
    <section className="card">
      <h2 className="h2">Personalização</h2>
      <Field label="Frases das celebrações" hint="Uma por linha. Aparecem no balão quando você conclui missões e capítulos.">
        <textarea id="phrases" rows={5} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} />
      </Field>
      <div className="btn-row wrap">
        <button className="btn btn-quiet btn-sm" onClick={() => { commit(); ui.celebrate({ kind: 'mission', title: 'Prévia da celebração', extras: ['Assim aparece quando você fecha uma missão'] }); }}>
          Ver prévia
        </button>
        <span className="muted small">A imagem da celebração você troca em Ilustrações, logo abaixo.</span>
      </div>
    </section>
  );
}
