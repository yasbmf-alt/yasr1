// Configurações → Eventos: lista completa, ativar/desativar, datas,
// mensagens, ambientes, som, prévia e restaurar o padrão.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI, Field, ConfirmButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset, SLOTS } from '../assets/registry';
import { uploadImage } from '../components/upload';
import { play, type SoundName } from '../logic/sound';
import { eventPreview } from '../components/EventDecor';
import {
  ALL_SCENES, DEFAULT_EVENTS, SOUNDS, THEMES, eventsOf, isActiveOn, windowOf,
  type EventScene, type SpecialEvent,
} from '../logic/events';
import { MESES_LONGOS, today } from '../logic/dates';

const pad2 = (n: number) => String(n).padStart(2, '0');

function MonthDay({ value, onChange, idBase, label }: { value: string; onChange: (v: string) => void; idBase: string; label: string }) {
  const [m, d] = value ? value.split('-').map(Number) : [1, 1];
  const daysIn = new Date(2024, m, 0).getDate();
  return (
    <span className="md-pick" role="group" aria-label={label}>
      <select id={`${idBase}-d`} value={d} onChange={(e) => onChange(`${pad2(m)}-${pad2(Number(e.target.value))}`)} aria-label={`${label}: dia`}>
        {Array.from({ length: daysIn }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
      <select id={`${idBase}-m`} value={m} onChange={(e) => {
        const nm = Number(e.target.value);
        onChange(`${pad2(nm)}-${pad2(Math.min(d, new Date(2024, nm, 0).getDate()))}`);
      }} aria-label={`${label}: mês`}>
        {MESES_LONGOS.map((n, i) => <option key={n} value={i + 1}>{n.toLowerCase()}</option>)}
      </select>
    </span>
  );
}

const fmtMD = (k: string) => {
  if (!k) return '';
  const [m, d] = k.split('-').map(Number);
  return `${d} de ${MESES_LONGOS[m - 1].toLowerCase()}`;
};

export function EventosCfg() {
  const { data, saveSettings, mode } = useStore();
  const ui = useUI();
  const s = data.settings;
  const list = eventsOf(s);
  const [open, setOpen] = useState<string | null>(null);
  const t = today();

  const saveEvent = (e: SpecialEvent) => {
    const others = (s.events ?? []).filter((x) => x.id !== e.id);
    saveSettings({ events: [...others, e] });
  };

  const restore = () => {
    // volta datas, ambientes, sons e estilos ao padrão; mantém títulos e mensagens escritos por você
    const kept = list.map((e) => {
      const d = DEFAULT_EVENTS.find((x) => x.id === e.id);
      return d ? { ...d, title: e.title, message: e.message } : e;
    });
    saveSettings({ events: kept.filter((e) => DEFAULT_EVENTS.some((d) => d.id === e.id) && (e.message || e.title !== DEFAULT_EVENTS.find((d) => d.id === e.id)!.title)), eventsOff: false });
    ui.toast('Visual padrão restaurado. Suas mensagens foram mantidas.');
  };

  const preview = (id: string) => {
    eventPreview.set(id);
    ui.go('trilha');
    ui.toast('Prévia ligada. Passeie pelos ambientes; nada é salvo.', 'info');
  };

  return (
    <div className="cfg-grid">
      <section className="card">
        <h2 className="h2">Eventos especiais</h2>
        <p className="muted">Nas datas abaixo, os ambientes ganham uma decoração temporária. A celebração aparece uma vez por ano e você pode revê-la pelo selo ao lado da saudação.</p>
        <div className="cfg-row">
          <div>
            <strong>Decorações de eventos</strong>
            <p className="muted">Desligue para ver sempre o visual de todo dia.</p>
          </div>
          <button className={`switch ${!s.eventsOff ? 'on' : ''}`} role="switch" aria-checked={!s.eventsOff} aria-label="Decorações de eventos" onClick={() => saveSettings({ eventsOff: !s.eventsOff })}>
            <span />
          </button>
        </div>
        <div className="cfg-row">
          <div>
            <strong>Data da formatura</strong>
            <p className="muted">Usada no evento de formatura e na contagem do Réveillon. Deixe vazio enquanto não souber.</p>
          </div>
          <input id="grad-date" type="date" value={s.graduationDate ?? ''} onChange={(e) => saveSettings({ graduationDate: e.target.value || undefined })} />
        </div>
        <div className="btn-row wrap">
          <ConfirmButton
            className="btn btn-quiet btn-sm"
            label={<><Icon name="restore" size={16} /> Restaurar visual padrão</>}
            question="Voltar datas, ambientes e sons ao padrão? Suas mensagens ficam."
            confirmLabel="Restaurar"
            onConfirm={restore}
          />
          {mode === 'demo' && <span className="muted small">No modo demonstração nada é salvo.</span>}
        </div>
      </section>

      <section className="card ev-list-card">
        <h2 className="h2">Calendário</h2>
        <ul className="ev-list">
          {list.map((e) => {
            const w = windowOf(e, s);
            const active = isActiveOn(e, s, t);
            const isOpen = open === e.id;
            return (
              <li key={e.id} className={`ev-item ${e.enabled ? '' : 'is-off'} ${isOpen ? 'is-open' : ''}`}>
                <div className="ev-item-row">
                  <button className="ev-item-main" onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
                    <span className="ev-item-art"><Asset slot={THEMES[e.theme].props[0]} /></span>
                    <span className="ev-item-text">
                      <strong>{e.name}</strong>
                      <span className="muted small">
                        {e.dateFromSettings ? (w ? fmtMD(w.start) : 'data ainda não definida') : w ? (w.start === w.end ? fmtMD(w.start) : `${fmtMD(w.start)} a ${fmtMD(w.end)}`) : '—'}
                        {' · '}{e.kind === 'sazonal' ? 'tema da temporada' : 'destaque do dia'}
                      </span>
                    </span>
                    {active && <span className="tiny-tag tag-own">acontecendo</span>}
                  </button>
                  <button className={`switch ${e.enabled ? 'on' : ''}`} role="switch" aria-checked={e.enabled} aria-label={`Ativar ${e.name}`} onClick={() => saveEvent({ ...e, enabled: !e.enabled })}>
                    <span />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div className="ev-edit-wrap" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                      <EventEditor ev={e} onSave={saveEvent} onPreview={() => preview(e.id)} onCelebrate={() => ui.enqueue({ kind: 'event', eventId: e.id, preview: true })} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function EventEditor({ ev, onSave, onPreview, onCelebrate }: { ev: SpecialEvent; onSave: (e: SpecialEvent) => void; onPreview: () => void; onCelebrate: () => void }) {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [title, setTitle] = useState(ev.title);
  const [message, setMessage] = useState(ev.message);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  useEffect(() => {
    setTitle(ev.title);
    setMessage(ev.message);
  }, [ev.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const th = THEMES[ev.theme];
  const slots = [...new Set([...(th.garland ? [th.garland] : []), ...th.props])];
  const toggleScene = (sc: EventScene) => onSave({ ...ev, scenes: ev.scenes.includes(sc) ? ev.scenes.filter((x) => x !== sc) : [...ev.scenes, sc] });
  const commitText = () => {
    if (title !== ev.title || message !== ev.message) {
      onSave({ ...ev, title: title.trim() || ev.title, message });
      ui.toast('Mensagem salva.');
    }
  };

  return (
    <div className="ev-edit">
      {!ev.dateFromSettings && (
        <div className="ev-dates">
          <Field label={ev.kind === 'sazonal' ? 'Começa em' : 'Data'}>
            <MonthDay idBase={`ev-${ev.id}-s`} label="Início" value={ev.start} onChange={(v) => onSave({ ...ev, start: v, end: ev.kind === 'dia' ? v : ev.end })} />
          </Field>
          {ev.kind === 'sazonal' && (
            <Field label="Termina em">
              <MonthDay idBase={`ev-${ev.id}-e`} label="Fim" value={ev.end} onChange={(v) => onSave({ ...ev, end: v })} />
            </Field>
          )}
        </div>
      )}
      {ev.dateFromSettings && <p className="field-hint">A data vem do campo “Data da formatura”, logo acima.</p>}
      <Field label="Título">
        <input id={`ev-${ev.id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commitText} />
      </Field>
      <Field label={ev.style === 'carta' ? 'Cartinha (escrita por você)' : 'Mensagem (escrita por você)'} hint="Fica em branco até você escrever. O app não inventa textos.">
        <textarea id={`ev-${ev.id}-msg`} rows={ev.style === 'carta' ? 5 : 3} value={message} onChange={(e) => setMessage(e.target.value)} onBlur={commitText} placeholder="opcional" />
      </Field>
      <div className="ev-opts">
        <div className="chip-field">
          <span className="field-label">Formato da mensagem</span>
          <div className="chip-row" role="radiogroup" aria-label="Formato">
            {(['cartao', 'carta'] as const).map((st) => (
              <button key={st} type="button" role="radio" aria-checked={ev.style === st} className={`chip-toggle ${ev.style === st ? 'is-on' : ''}`} onClick={() => onSave({ ...ev, style: st })}>{st === 'cartao' ? 'Cartão' : 'Cartinha'}</button>
            ))}
          </div>
        </div>
        <div className="chip-field">
          <span className="field-label">Ambientes decorados</span>
          <div className="chip-row">
            {ALL_SCENES.map((sc) => (
              <button key={sc.id} type="button" role="checkbox" aria-checked={ev.scenes.includes(sc.id)} className={`chip-toggle ${ev.scenes.includes(sc.id) ? 'is-on' : ''}`} onClick={() => toggleScene(sc.id)}>{sc.label}</button>
            ))}
          </div>
        </div>
        <Field label="Som da celebração">
          <span className="ev-sound">
            <select id={`ev-${ev.id}-snd`} value={ev.sound} onChange={(e) => onSave({ ...ev, sound: e.target.value as SpecialEvent['sound'] })}>
              {SOUNDS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            {ev.sound !== 'nenhum' && <button type="button" className="btn btn-quiet btn-sm" onClick={() => play(ev.sound as SoundName)}>Ouvir</button>}
          </span>
        </Field>
      </div>
      <div className="chip-field">
        <span className="field-label">Ilustrações deste evento · toque para trocar pela sua arte</span>
        <div className="ev-assets">
          {slots.map((slot) => {
            const sl = SLOTS.find((x) => x.key === slot);
            const custom = !!data.settings.assetMap[slot];
            return (
              <div key={slot} className={`ev-asset ${custom ? 'is-custom' : ''}`}>
                <button
                  type="button"
                  className="ev-asset-btn"
                  disabled={busy === slot}
                  onClick={() => {
                    target.current = slot;
                    fileRef.current?.click();
                  }}
                  title={sl?.label}
                >
                  <Asset slot={slot} />
                  <span className="ev-asset-tag">{busy === slot ? 'enviando…' : custom ? 'sua arte' : 'provisório'}</span>
                </button>
                {custom && (
                  <button type="button" className="link small" onClick={() => {
                    const m = { ...data.settings.assetMap };
                    delete m[slot];
                    saveSettings({ assetMap: m });
                  }}>usar provisório</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="btn-row wrap">
        <button className="btn btn-secondary btn-sm" onClick={onPreview}><Icon name="eye" size={16} /> Pré-visualizar nos ambientes</button>
        <button className="btn btn-quiet btn-sm" onClick={() => { commitText(); onCelebrate(); }}><Icon name="sparkle" size={16} /> Ver celebração</button>
      </div>
      <input
        ref={fileRef}
        id={`ev-${ev.id}-file`}
        type="file"
        accept="image/png,image/webp,image/svg+xml,image/jpeg"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          const slot = target.current;
          if (!f || !slot) return;
          setBusy(slot);
          const r = await uploadImage(f);
          setBusy(null);
          if ('error' in r) return ui.toast(r.error, 'erro');
          saveSettings({ assetMap: { ...data.settings.assetMap, [slot]: r.id } });
          ui.toast('Arte aplicada.');
        }}
      />
    </div>
  );
}
