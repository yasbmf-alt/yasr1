import React, { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon';
import { useStore } from '../data/store';
import { REASONS, areaOf, type BigArea, type ErrorGroup, type ErrorReason, type MistakeItem, type Topic } from '../types';
import { uid } from '../logic/dates';
import { isMistake, newItem, normName } from '../logic/simErrors';

/**
 * Erros de uma grande área do simulado: temas e subtópicos, quantos erros em
 * cada um e, se quiser, o motivo, a questão e a lacuna de cada erro.
 * Tudo opcional; nunca deixa categorizar mais erros do que a área teve.
 */
export function AreaErrors({ area, groups, wrong, onChange }: {
  area: BigArea;
  groups: ErrorGroup[]; // só os desta área
  wrong: number | null; // erros da área (total − acertos)
  onChange: (g: ErrorGroup[]) => void;
}) {
  const fid = useId();
  const { data } = useStore();
  const mistakes = groups.filter(isMistake);
  const review = groups.filter((g) => !isMistake(g));
  const done = mistakes.reduce((n, g) => n + g.count, 0);
  const rest = wrong != null ? wrong - done : null;
  const full = rest != null && rest <= 0;
  const set = (id: string, p: Partial<ErrorGroup>) => onChange(groups.map((g) => (g.id === id ? { ...g, ...p } : g)));
  const setCount = (g: ErrorGroup, n: number) => {
    const max = rest != null ? g.count + Math.max(0, rest) : Infinity;
    const count = Math.max(1, Math.min(n, max, 999));
    const items = [...(g.items ?? [])];
    while (items.length < count) items.push(newItem());
    set(g.id, { count, items: items.slice(0, count) });
  };
  const add = (kind: 'erro' | 'revisar') =>
    onChange([...groups, { id: uid(), area, kind, subtema: null, reasons: [], count: kind === 'erro' ? 1 : 0, note: '', subject: '', subtopic: '', topicId: null, items: kind === 'erro' ? [newItem()] : [] }]);
  const topicInput = (g: ErrorGroup, i: number) => (
    <TopicCombo
      id={`${fid}-t${i}`}
      area={area}
      topics={data.topics}
      value={g.topicId ? data.topics.find((t) => t.id === g.topicId)?.name ?? g.subject ?? '' : g.subject ?? ''}
      linked={!!g.topicId}
      onPick={(t) => set(g.id, { topicId: t.id, subject: t.name })}
      onText={(v) => {
        const t = data.topics.find((x) => normName(x.name) === normName(v));
        set(g.id, { topicId: t?.id ?? null, subject: v });
      }}
    />
  );

  return (
    <div className="ae">
      <div className="ae-count">
        {wrong == null ? (
          <span className="muted small">Preencha acertos e total da área para conferir quantos erros faltam.</span>
        ) : wrong === 0 ? (
          <span className="muted small">Nenhum erro nesta área.</span>
        ) : (
          <>
            <span className={`eg-count ${rest === 0 ? 'is-ok' : ''}`}>{done} de {wrong} erros categorizados</span>
            {rest != null && rest > 0 && <span className="muted small">{rest} sem categoria</span>}
            {rest != null && rest < 0 && <span className="form-error small">Mais erros categorizados do que a área teve.</span>}
          </>
        )}
      </div>

      {mistakes.map((g, i) => (
        <MistakeGroup
          key={g.id}
          g={g}
          topic={topicInput(g, i)}
          fid={`${fid}-${i}`}
          canAdd={!full}
          onSub={(v) => set(g.id, { subtopic: v })}
          onCount={(n) => setCount(g, n)}
          onItem={(id, p) => set(g.id, { items: (g.items ?? []).map((it) => (it.id === id ? { ...it, ...p } : it)) })}
          onRemove={() => onChange(groups.filter((x) => x.id !== g.id))}
        />
      ))}

      {review.length > 0 && <span className="ae-sub">Acertei, mas quero revisar</span>}
      {review.map((g, i) => (
        <div key={g.id} className="ae-row ae-review">
          <div className="ae-line">
            {topicInput(g, 100 + i)}
            <input id={`${fid}-rs${i}`} value={g.subtopic ?? ''} onChange={(e) => set(g.id, { subtopic: e.target.value })} placeholder="Subtópico (opcional)" aria-label="Subtópico" />
            <button type="button" className="icon-btn icon-btn-sm" onClick={() => onChange(groups.filter((x) => x.id !== g.id))} aria-label="Remover"><Icon name="close" size={14} /></button>
          </div>
          <input id={`${fid}-rn${i}`} className="eg-note" value={g.note} onChange={(e) => set(g.id, { note: e.target.value })} placeholder="Por que revisar? (opcional)" />
        </div>
      ))}

      <div className="eg-foot">
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => add('erro')} disabled={full} title={full ? 'Todos os erros desta área já estão categorizados' : undefined}>
          <Icon name="plus" size={14} /> Tema com erro
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => add('revisar')}>
          <Icon name="plus" size={14} /> Acertei, mas quero revisar
        </button>
      </div>
    </div>
  );
}

function MistakeGroup({ g, topic, fid, canAdd, onSub, onCount, onItem, onRemove }: {
  g: ErrorGroup; topic: React.ReactNode; fid: string; canAdd: boolean;
  onSub: (v: string) => void; onCount: (n: number) => void; onItem: (id: string, p: Partial<MistakeItem>) => void; onRemove: () => void;
}) {
  const items = g.items ?? [];
  const detailed = items.some((it) => it.reason || it.gap || it.question);
  const [open, setOpen] = useState(detailed);
  return (
    <div className="ae-row">
      <div className="ae-line">
        {topic}
        <input id={`${fid}-sub`} value={g.subtopic ?? ''} onChange={(e) => onSub(e.target.value)} placeholder="Subtópico (opcional)" aria-label="Subtópico" />
        <div className="stepper" aria-label="Quantidade de erros">
          <button type="button" onClick={() => onCount(g.count - 1)} aria-label="Menos">−</button>
          <input id={`${fid}-n`} inputMode="numeric" value={g.count} onChange={(e) => onCount(Number(e.target.value.replace(/\D/g, '')) || 1)} aria-label="Erros neste tema" />
          <button type="button" onClick={() => onCount(g.count + 1)} disabled={!canAdd} aria-label="Mais">+</button>
        </div>
        <button type="button" className="icon-btn icon-btn-sm" onClick={onRemove} aria-label="Remover tema"><Icon name="close" size={14} /></button>
      </div>
      <button type="button" className="ae-detail-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name={open ? 'chevronD' : 'chevronR'} size={13} />
        {g.count === 1 ? 'Detalhar o erro' : `Detalhar os ${g.count} erros`} <span className="muted">(motivo, questão, o que faltou saber)</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="ae-items" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {items.map((it, k) => (
              <div key={it.id} className="ae-item">
                <div className="ae-item-head">
                  <span className="ae-item-n">Erro {k + 1}</span>
                  <input id={`${fid}-q${k}`} className="ae-q" value={it.question ?? ''} onChange={(e) => onItem(it.id, { question: e.target.value })} placeholder="Questão nº" aria-label={`Número da questão do erro ${k + 1}`} />
                  <div className="eg-chips" role="radiogroup" aria-label={`Motivo do erro ${k + 1}`}>
                    {REASONS.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        role="radio"
                        aria-checked={it.reason === r.id}
                        className={`chip-mini chip-reason r-${r.id} ${it.reason === r.id ? 'is-on' : ''}`}
                        onClick={() => onItem(it.id, { reason: it.reason === r.id ? null : (r.id as ErrorReason) })}
                        title={r.long}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input id={`${fid}-g${k}`} className="eg-note" value={it.gap ?? ''} onChange={(e) => onItem(it.id, { gap: e.target.value })} placeholder="O que eu precisava saber para acertar?" aria-label={`O que eu precisava saber para acertar o erro ${k + 1}?`} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Campo de tema: digita e filtra os temas da Biblioteca (os desta área
 * primeiro). Se o tema ainda não existe, a última opção é criá-lo — ele vai
 * para a Biblioteca quando o simulado é salvo.
 */
function TopicCombo({ id, area, topics, value, linked, onPick, onText }: {
  id: string; area: BigArea; topics: Topic[]; value: string; linked: boolean;
  onPick: (t: Topic) => void; onText: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const q = normName(value);
  const list = topics
    .filter((t) => !q || normName(t.name).includes(q))
    .sort((a, b) => Number(b.area === area) - Number(a.area === area)
      || Number(normName(b.name).startsWith(q)) - Number(normName(a.name).startsWith(q))
      || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 8);
  const exact = topics.some((t) => normName(t.name) === q);
  const canCreate = !!value.trim() && !exact;
  const n = list.length + (canCreate ? 1 : 0);
  const choose = (k: number) => {
    if (k < list.length) onPick(list[k]);
    else if (canCreate) onText(value.trim());
    setOpen(false);
  };
  return (
    <div className="tcombo" ref={box} onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input
        id={id}
        value={value}
        onChange={(e) => { onText(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !n) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % n); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + n) % n); }
          else if (e.key === 'Enter') { e.preventDefault(); choose(hi); }
          else if (e.key === 'Escape') {
            // fecha só a lista, não a janela do simulado
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder="Digite o tema, ex.: Bronquiolite"
        aria-label="Tema"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {value.trim() && !linked && !open && <span className="tcombo-new" title="Será criado na Biblioteca ao salvar o simulado">novo</span>}
      {open && n > 0 && (
        <div className="tcombo-list" role="listbox">
          {list.map((t, k) => (
            <button type="button" key={t.id} role="option" aria-selected={k === hi} className={`tcombo-opt ${k === hi ? 'is-hi' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(k)}>
              <span>{t.name}</span>
              {t.area !== area && <span className="tcombo-area">{areaOf(t.area).short}</span>}
            </button>
          ))}
          {canCreate && (
            <button type="button" role="option" aria-selected={hi === list.length} className={`tcombo-opt tcombo-create ${hi === list.length ? 'is-hi' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(list.length)}>
              <Icon name="plus" size={14} /> Criar tema “{value.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
