import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { useUI, Field } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset, GROUPS, SLOTS } from '../assets/registry';
import { isDemoOn, setDemo, useCapability } from '../data/repo';
import type { DataSnapshot } from '../types';
import { DEFAULT_PHRASES, DEFAULT_SETTINGS } from '../types';
import { today } from '../logic/dates';
import { play, setSoundVolume } from '../logic/sound';
import { Recompensas, CartasCfg, SonsProprios } from './ConfigExtras';

type CfgTab = 'geral' | 'recompensas' | 'cartas' | 'sons' | 'ilustracoes';
const CFG_TABS: { id: CfgTab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
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
  const { replaceAll } = useStore();
  const ui = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<DataSnapshot | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const demo = isDemoOn();

  const exportBackup = async () => {
    const json = JSON.stringify({ app: 'yas-r1', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    const dl = await useCapability<any>('downloads');
    if (!dl) return setFallbackText(json);
    try {
      await dl.save({ filename: `yas-r1-backup-${today()}.json`, data: json });
      ui.toast('Backup salvo.');
    } catch (e: any) {
      if (e?.code === 'declined') return;
      setFallbackText(json);
    }
  };

  const onFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      const d = parsed?.data ?? parsed;
      if (!Array.isArray(d?.chapters) || !Array.isArray(d?.missions) || !Array.isArray(d?.topics) || !Array.isArray(d?.sessions))
        throw new Error('formato');
      setIncoming({
        ...d,
        notes: d.notes ?? [], events: d.events ?? [], simulados: d.simulados ?? [], decks: d.decks ?? [], cards: d.cards ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}), id: 'settings' },
      });
    } catch {
      ui.toast('Esse arquivo não parece um backup do Yas R1.', 'erro');
    }
  };

  return (
    <section className="card">
      <h2 className="h2">Dados</h2>
      <p className="muted">
        {mode === 'db' && 'Salvos no banco do app e sincronizados entre computador e celular.'}
        {mode === 'local' && 'Salvos só neste navegador nesta janela.'}
        {mode === 'demo' && 'Você está vendo dados fictícios de demonstração.'}
      </p>
      <div className="btn-row wrap">
        <button className="btn btn-secondary" onClick={exportBackup} disabled={mode === 'demo'}>
          <Icon name="download" size={18} /> Exportar backup
        </button>
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={mode === 'demo'}>
          <Icon name="upload" size={18} /> Importar backup
        </button>
        <input ref={fileRef} id="import-file" type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      {incoming && (
        <div className="confirm-box">
          <span>
            Backup com {incoming.chapters.length} capítulos, {incoming.missions.length} missões, {incoming.topics.length} temas, {incoming.sessions.length} registros, {incoming.events.length} eventos, {incoming.simulados.length} simulados e {incoming.cards.length} flashcards. Importar substitui tudo o que está no app agora.
          </span>
          <div className="register-actions">
            <button className="btn btn-quiet" onClick={() => setIncoming(null)}>Cancelar</button>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await replaceAll(incoming);
                  ui.toast('Backup importado.');
                } catch {
                  ui.toast('A importação parou no meio. Tente de novo.', 'erro');
                }
                setBusy(false);
                setIncoming(null);
              }}
            >
              {busy ? 'Importando…' : 'Substituir tudo'}
            </button>
          </div>
        </div>
      )}
      {fallbackText && (
        <div className="fallback">
          <p className="muted">Não deu para baixar o arquivo aqui. Copie o texto abaixo e salve como .json:</p>
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
  const [assets, setAssets] = useState<any>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [group, setGroup] = useState(GROUPS[0].id);
  const inputRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);

  useEffect(() => {
    void useCapability('assets').then(setAssets);
  }, []);

  const upload = async (file: File) => {
    const slot = target.current;
    if (!slot || !assets) return;
    setBusy(slot);
    try {
      const type = file.type || (file.name.endsWith('.svg') ? 'image/svg+xml' : file.name.endsWith('.webp') ? 'image/webp' : 'image/png');
      const r = await assets.upload(file, { type });
      saveSettings({ assetMap: { ...data.settings.assetMap, [slot]: r.id } });
      ui.toast('Arte aplicada.');
    } catch (e: any) {
      const msg =
        e?.code === 'too_large' ? 'Arquivo grande demais (até 20 MB; SVG até 2 MB).'
          : e?.code === 'unsupported_type' ? 'Use PNG, JPG, WebP, GIF ou SVG.'
            : e?.code === 'quota_or_state' ? 'O espaço de imagens do app acabou.'
              : 'Não consegui enviar essa imagem.';
      ui.toast(msg, 'erro');
    }
    setBusy(null);
  };

  const g = GROUPS.find((x) => x.id === group)!;
  const slots = SLOTS.filter((x) => x.group === group);
  const customCount = Object.keys(data.settings.assetMap).length;

  return (
    <section className="card illus">
      <div className="table-head">
        <div>
          <h2 className="h2">Ilustrações</h2>
          <p className="muted">
            Cada peça do app é um espaço substituível. Envie sua arte e ela aparece no lugar do provisório, sem mexer no resto. {customCount > 0 && `${customCount} arte(s) sua(s) em uso.`}
          </p>
        </div>
      </div>
      {assets === null && (
        <p className="banner banner-local">O envio de imagens funciona quando o Yas R1 está aberto no Claude, na sua conta.</p>
      )}
      <div className="seg seg-wrap" role="tablist">
        {GROUPS.map((x) => (
          <button key={x.id} role="tab" aria-selected={group === x.id} className={group === x.id ? 'is-on' : ''} onClick={() => setGroup(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <p className="idea"><strong>Ideia de arte:</strong> {g.idea}</p>
      <div className="slots">
        {slots.map((sl) => {
          const custom = !!data.settings.assetMap[sl.key];
          return (
            <div key={sl.key} className={`slot ${custom ? 'is-custom' : ''}`}>
              <div className="slot-prev"><Asset slot={sl.key} /></div>
              <div className="slot-info">
                <strong>{sl.label}</strong>
                <span className="muted mono">{sl.key}</span>
                <span className="muted">{sl.size}</span>
              </div>
              <div className="slot-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={!assets || busy === sl.key}
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
                      const m = { ...data.settings.assetMap };
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
        })}
      </div>
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
