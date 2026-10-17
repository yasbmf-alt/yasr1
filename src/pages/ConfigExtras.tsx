import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { ConfirmButton, Field, useUI, LazyInput, numOrNull } from '../components/ui';
import { Icon } from '../components/Icon';
import { assetUrl } from '../assets/registry';
import { uploadAudio, uploadImage, assetsCapability } from '../components/upload';
import { mimoTypes, rollMimo } from '../logic/rewards';
import { play, SOUND_SLOTS, type SoundName } from '../logic/sound';
import { setAmbientVolume } from '../logic/ambient';
import { uid } from '../logic/dates';
import { Cartas } from './room/Cartas';
import type { MimoType, RewardImage } from '../types';

// ── Recompensas: imagens do pop-up e vales de mimos ──────────

export function Recompensas() {
  const { data, saveSettings, saveVoucher } = useStore();
  const ui = useUI();
  const imgs = data.settings.rewardImages ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canUpload, setCanUpload] = useState<boolean | null>(null);
  React.useEffect(() => {
    void assetsCapability().then((a) => setCanUpload(!!a));
  }, []);

  const onFiles = async (files: FileList) => {
    setBusy(true);
    let list = [...imgs];
    for (const f of Array.from(files)) {
      if (!/\.(png|jpe?g)$/i.test(f.name) && !/image\/(png|jpeg)/.test(f.type)) {
        ui.toast(`${f.name}: use PNG ou JPG.`, 'erro');
        continue;
      }
      const r = await uploadImage(f);
      if ('error' in r) {
        ui.toast(r.error, 'erro');
        continue;
      }
      const target = replaceRef.current;
      if (target) list = list.map((x) => (x.id === target ? { ...x, assetId: r.id } : x));
      else list.push({ id: uid(), assetId: r.id, active: true, addedAt: new Date().toISOString() });
    }
    replaceRef.current = null;
    saveSettings({ rewardImages: list });
    setBusy(false);
  };
  const set = (id: string, p: Partial<RewardImage>) => saveSettings({ rewardImages: imgs.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  return (
    <div className="cfg-stack">
      <section className="card">
        <div className="dd-head">
          <div>
            <h2 className="h2">Imagens de conclusão</h2>
            <p className="muted small">Aparecem sozinhas, sem texto nem moldura, quando você fecha um capítulo ou duas missões em menos de 3 dias. O app sorteia entre as marcadas.</p>
          </div>
          <button className="btn btn-primary" disabled={busy || canUpload === false} onClick={() => { replaceRef.current = null; fileRef.current?.click(); }}>
            <Icon name="upload" size={17} /> {busy ? 'Enviando…' : 'Enviar imagens'}
          </button>
        </div>
        {canUpload === false && <p className="banner banner-local">O envio de imagens funciona com o Yas R1 aberto no Claude, na sua conta.</p>}
        {imgs.length === 0 ? (
          <p className="chart-empty">Nenhuma imagem ainda. Enquanto isso, as conclusões mostram a celebração padrão.</p>
        ) : (
          <div className="gallery">
            {imgs.map((im) => (
              <div key={im.id} className={`gal ${im.active ? '' : 'is-off'}`}>
                <button className="gal-img" onClick={() => ui.enqueue({ kind: 'image', assetId: im.assetId })} title="Ver como aparece">
                  <img src={assetUrl(im.assetId)} alt="" loading="lazy" />
                </button>
                <div className="gal-actions">
                  <label className="gal-check">
                    <input type="checkbox" checked={im.active} onChange={(e) => set(im.id, { active: e.target.checked })} /> no sorteio
                  </label>
                  <button className="icon-btn icon-btn-sm" title="Substituir" aria-label="Substituir" onClick={() => { replaceRef.current = im.id; fileRef.current?.click(); }}><Icon name="upload" size={14} /></button>
                  <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={14} />} question="Remover?" confirmLabel="Remover" onConfirm={() => saveSettings({ rewardImages: imgs.filter((x) => x.id !== im.id) })} />
                </div>
              </div>
            ))}
          </div>
        )}
        <input ref={fileRef} id="reward-files" type="file" accept="image/png,image/jpeg" multiple hidden onChange={(e) => { const f = e.target.files; if (f?.length) void onFiles(f); e.target.value = ''; }} />
      </section>

      <MimosCfg onTest={() => {
        const v = rollMimo(data, 'teste', { force: true });
        if (v) {
          saveVoucher(v);
          ui.enqueue({ kind: 'voucher', voucherId: v.id });
        }
      }} />
    </div>
  );
}

function MimosCfg({ onTest }: { onTest: () => void }) {
  const { data, saveSettings } = useStore();
  const list = mimoTypes(data);
  const [adding, setAdding] = useState(false);
  const save = (l: MimoType[]) => saveSettings({ mimos: l });
  const set = (id: string, p: Partial<MimoType>) => save(list.map((m) => (m.id === id ? { ...m, ...p } : m)));
  return (
    <section className="card">
      <div className="dd-head">
        <div>
          <h2 className="h2">Vales de mimos</h2>
          <p className="muted small">Presentinhos para você mesma, sorteados raramente ao fechar capítulos e ao ganhar conquistas. Sem prazo, sem obrigação.</p>
        </div>
        <button className="btn btn-quiet btn-sm" onClick={onTest}>Ver um vale de exemplo</button>
      </div>
      <div className="register-grid">
        <Field label="Intervalo mínimo entre vales (dias)">
          <LazyInput id="mimo-days" value={String(data.settings.mimoMinDays ?? 14)} onCommit={(v) => saveSettings({ mimoMinDays: numOrNull(v) ?? 14 })} />
        </Field>
        <Field label="Chance de aparecer em cada oportunidade">
          <select id="mimo-chance" value={String(data.settings.mimoChance ?? 0.3)} onChange={(e) => saveSettings({ mimoChance: Number(e.target.value) })}>
            <option value="0.15">Bem rara (15%)</option>
            <option value="0.3">Rara (30%)</option>
            <option value="0.5">De vez em quando (50%)</option>
          </select>
        </Field>
      </div>
      <ul className="mimo-types">
        {list.map((m) => (
          <li key={m.id} className={m.active ? '' : 'is-off'}>
            <LazyInput id={`me-${m.id}`} className="mt-emoji" value={m.emoji} ariaLabel="Emoji" onCommit={(v) => set(m.id, { emoji: v.trim() || m.emoji })} />
            <LazyInput id={`mn-${m.id}`} className="mt-name" value={m.name} ariaLabel="Nome" onCommit={(v) => set(m.id, { name: v.trim() || m.name })} />
            <LazyInput id={`mm-${m.id}`} className="mt-msg" value={m.message} ariaLabel="Mensagem" onCommit={(v) => set(m.id, { message: v.trim() })} />
            <button className={`switch ${m.active ? 'on' : ''}`} role="switch" aria-checked={m.active} aria-label={`Ativar ${m.name}`} onClick={() => set(m.id, { active: !m.active })}><span /></button>
            <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={14} />} question="Remover?" confirmLabel="Sim" onConfirm={() => save(list.filter((x) => x.id !== m.id))} />
          </li>
        ))}
      </ul>
      {adding ? (
        <NewMimo onAdd={(m) => { save([...list, m]); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Novo tipo de mimo</button>
      )}
    </section>
  );
}

function NewMimo({ onAdd, onCancel }: { onAdd: (m: MimoType) => void; onCancel: () => void }) {
  const [m, setM] = useState<MimoType>({ id: uid(), emoji: '🎁', name: 'Vale ', message: '', active: true });
  return (
    <form className="mimo-new" onSubmit={(e) => { e.preventDefault(); if (m.name.trim()) onAdd({ ...m, name: m.name.trim(), message: m.message.trim() }); }}>
      <input id="nm-emoji" className="mt-emoji" value={m.emoji} onChange={(e) => setM({ ...m, emoji: e.target.value })} aria-label="Emoji" />
      <input id="nm-name" className="mt-name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} aria-label="Nome" autoFocus />
      <input id="nm-msg" className="mt-msg" value={m.message} onChange={(e) => setM({ ...m, message: e.target.value })} placeholder="Mensagem do vale" aria-label="Mensagem" />
      <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
      <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>Cancelar</button>
    </form>
  );
}

// ── Cartinhas ────────────────────────────────────────────────

export function CartasCfg() {
  const { data, saveSettings } = useStore();
  return (
    <div className="cfg-stack">
      <section className="card">
        <Field label="Intervalo mínimo das cartas surpresa (dias)" hint="A carta surpresa chega pelo menos esse número de dias depois de lacrada, e longe das outras surpresas.">
          <LazyInput id="letter-min" value={String(data.settings.letterMinDays ?? 20)} onCommit={(v) => saveSettings({ letterMinDays: Math.max(1, numOrNull(v) ?? 20) })} />
        </Field>
      </section>
      <Cartas />
    </div>
  );
}

// ── Sons próprios ────────────────────────────────────────────

export function SonsProprios() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const map = data.settings.soundAssets ?? {};
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<SoundName | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [amb, setAmb] = useState(data.settings.ambientVolume ?? 0.5);
  return (
    <div className="cfg-stack">
      <section className="card">
        <h2 className="h2">Volume dos sons ambientes</h2>
        <p className="muted small">Chuva, biblioteca, natureza e lareira do Cantinho. Separado do volume dos efeitos (em Geral).</p>
        <input id="amb-vol-cfg" type="range" min={0} max={1} step={0.05} value={amb} onChange={(e) => { setAmb(Number(e.target.value)); setAmbientVolume(Number(e.target.value)); }} onMouseUp={() => saveSettings({ ambientVolume: amb })} onTouchEnd={() => saveSettings({ ambientVolume: amb })} className="range" />
      </section>
      <section className="card">
        <h2 className="h2">Trocar efeitos por gravações</h2>
        <p className="muted small">Os sons de porta, gaveta, livro e papel são feitos por um modelo físico de madeira e papel. Se quiser uma gravação real, envie o arquivo (MP3, M4A, WAV ou WebM) e ele passa a tocar no lugar.</p>
        <ul className="snd-list">
          {SOUND_SLOTS.map((sl) => (
            <li key={sl.id}>
              <span className="snd-name">{sl.label}</span>
              <span className={`tiny-tag ${map[sl.id] ? 'tag-own' : ''}`}>{map[sl.id] ? 'gravação sua' : 'padrão'}</span>
              <button className="btn btn-quiet btn-sm" onClick={() => play(sl.id)}>▶ Ouvir</button>
              <button className="btn btn-secondary btn-sm" disabled={busy === sl.id} onClick={() => { target.current = sl.id; fileRef.current?.click(); }}>{busy === sl.id ? 'Enviando…' : map[sl.id] ? 'Trocar' : 'Enviar'}</button>
              {map[sl.id] && <button className="btn btn-quiet btn-sm" onClick={() => { const m = { ...map }; delete m[sl.id]; saveSettings({ soundAssets: m }); }}>Usar padrão</button>}
            </li>
          ))}
        </ul>
        <input
          ref={fileRef}
          id="snd-file"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            const k = target.current;
            if (!f || !k) return;
            setBusy(k);
            const r = await uploadAudio(f);
            setBusy(null);
            if ('id' in r) {
              saveSettings({ soundAssets: { ...map, [k]: r.id } });
              ui.toast('Som trocado. Clique em Ouvir para testar.');
            } else ui.toast(r.error, 'erro');
          }}
        />
      </section>
    </div>
  );
}

export { AnimatePresence, motion };
