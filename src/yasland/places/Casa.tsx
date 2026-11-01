// Minha Casa: a cozinha. Geladeira (cardápio da semana na porta, estoque por
// dentro), livro de receitas, fogão (modo preparo), pia, bebedouro e a porta
// que leva ao quarto que já existe no app.
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { ImgScene, Place, PanelHead, Tiles, F, DateIn, daysUntil, fmtDate, num, over, weekStartOf } from '../ui';
import { useYl, ylId, nowIso } from '../store';
import { WaterPanel } from './Water';
import { FOOD_CATS, MEAL_SLOTS, type MealSlot, type YlRecipe, type YlStock } from '../types';
import { useUI, ConfirmButton } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { addDays, DIAS_CURTOS, fromKey, today } from '../../logic/dates';
import { play } from '../../logic/sound';
import { burst } from '../../logic/fx';
import { uploadImage } from '../../components/upload';
import { AssetImg } from '../../assets/registry';

type Spot = 'geladeira' | 'receitas' | 'fogao' | 'pia' | 'bebedouro';

export function Casa({ onBack }: PlaceProps) {
  const ui = useUI();
  const yl = useYl();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [cookId, setCookId] = useState<string | null>(null);
  const t = today();
  const water = yl.of('water').filter((w) => w.date === t).reduce((a, w) => a + w.ml, 0);
  const pick = (id: string) => setSpot((s) => (s === id ? null : (id as Spot)));
  const W = 915;
  const H = 633;
  const ws = weekStartOf(t);
  const plan = yl.of('meal').filter((m) => m.date >= ws && m.date < addDays(ws, 7)).sort((x, y) => x.date.localeCompare(y.date));
  const planLines = [...new Map(plan.map((m) => [m.date, m])).values()].slice(0, 3);
  const goal = yl.cfg.waterGoal || 2000;
  const scene = (
    <ImgScene
      img="s-casa" w={W} h={H} on={spot} onPick={(id) => (id === 'porta' ? ui.go('quarto') : pick(id))}
      areas={[
        { id: 'porta', label: 'Porta: ir para o meu quarto', box: [18, 130, 122, 335] },
        { id: 'geladeira', label: 'Geladeira', box: [150, 150, 155, 340] },
        { id: 'receitas', label: 'Livro de receitas', box: [336, 260, 98, 92] },
        { id: 'pia', label: 'Pia', box: [445, 262, 145, 92] },
        { id: 'fogao', label: 'Fogão', box: [600, 240, 160, 115] },
        { id: 'bebedouro', label: 'Bebedouro', box: [783, 245, 117, 250] },
      ]}
    >
      {/* bilhete do cardápio na porta da geladeira */}
      <motion.div className="yl-note" style={over(W, H, 176, 292, 100, 112)} initial={{ rotate: -8, scale: 0.6, opacity: 0 }} animate={{ rotate: -3, scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
        <b>Esta semana</b>
        {planLines.length ? planLines.map((m) => <span key={m.id}>{DIAS_CURTOS[fromKey(m.date).getDay()].slice(0, 3)} – {m.text || 'receita'}</span>) : <span className="muted">toque para planejar</span>}
      </motion.div>
      {/* balão de hidratação */}
      <motion.button className="yl-bubble-water" style={over(W, H, 640, 70)} onClick={() => pick('bebedouro')} initial={{ y: 10, opacity: 0 }} animate={{ y: [0, -4, 0], opacity: 1 }} transition={{ y: { repeat: Infinity, duration: 3, ease: 'easeInOut' }, opacity: { delay: 0.5 } }}>
        <span className="yl-bw-drop">💧</span>
        <span className="yl-bw-t"><b>Hidratação</b><small>{water.toLocaleString('pt-BR')} / {goal.toLocaleString('pt-BR')} mL</small></span>
        <span className="yl-bw-bar"><motion.i animate={{ width: `${Math.min(100, (water / goal) * 100)}%` }} /></span>
      </motion.button>
    </ImgScene>
  );
  const tiles = (
    <Tiles
      on={spot}
      onPick={pick}
      items={[
        { id: 'geladeira', label: 'Geladeira', icon: 'i-geladeira' },
        { id: 'receitas', label: 'Receitas', icon: 'i-receitas' },
        { id: 'fogao', label: 'Fogão', icon: 'i-fogao' },
        { id: 'pia', label: 'Pia', icon: 'i-lavatorio' },
        { id: 'bebedouro', label: 'Bebedouro', icon: 'i-bebedouro' },
      ]}
    />
  );

  const panel =
    spot === 'bebedouro' ? <WaterPanel onClose={() => setSpot(null)} />
    : spot === 'geladeira' ? <Fridge onClose={() => setSpot(null)} />
    : spot === 'receitas' ? <RecipeBook onClose={() => setSpot(null)} onCook={(id) => { setCookId(id); setSpot('fogao'); }} />
    : spot === 'fogao' ? <Stove initial={cookId} onClose={() => setSpot(null)} />
    : spot === 'pia' ? <Sink onClose={() => setSpot(null)} />
    : null;

  return <Place title="Minha Casa" emoji="🏠" onBack={onBack} scene={scene} tiles={tiles} spot={spot} panel={panel} hint="Toque nos objetos da cozinha. A porta leva ao seu quarto." />;
}

// ── Geladeira ─────────────────────────────────────────────────

const SHELVES: { label: string; cats: string[] }[] = [
  { label: 'Laticínios e ovos', cats: ['Laticínios', 'Carnes e ovos'] },
  { label: 'Hortifrúti', cats: ['Hortifrúti'] },
  { label: 'Bebidas', cats: ['Bebidas'] },
  { label: 'Outros', cats: [] },
];

export function expiryClass(expiry: string | null) {
  if (!expiry) return '';
  const d = daysUntil(expiry);
  return d < 0 ? 'is-expired' : d <= 2 ? 'is-soon' : d <= 5 ? 'is-near' : '';
}
export const expiryText = (expiry: string | null) => {
  if (!expiry) return '';
  const d = daysUntil(expiry);
  return d < 0 ? `venceu há ${-d}d` : d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : `vence em ${d}d`;
};

function Fridge({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [open, setOpen] = useState(false);
  // a porta abre logo depois de aparecer (como o armário da biblioteca)
  useEffect(() => {
    const id = setTimeout(() => { setOpen(true); play('drawer'); }, 280);
    return () => clearTimeout(id);
  }, []);
  const [weekOf, setWeekOf] = useState(weekStartOf(today()));
  const [day, setDay] = useState(today());
  const [adding, setAdding] = useState(false);
  const [item, setItem] = useState<YlStock | null>(null);
  const stock = yl.of('stock').filter((s) => s.status === 'ok');
  const shelfOf = (s: YlStock) => SHELVES.findIndex((x) => x.cats.includes(s.category)) === -1 ? 3 : SHELVES.findIndex((x) => x.cats.includes(s.category));
  const meals = yl.of('meal');
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekOf, i));
  const recipes = yl.of('recipe');

  const setMeal = (slot: MealSlot, text: string, recipeId: string | null = null) => {
    const cur = meals.find((m) => m.date === day && m.slot === slot);
    if (!text.trim() && !recipeId) return cur && yl.del(cur.id);
    yl.save({ id: cur?.id ?? ylId('meal'), kind: 'meal', createdAt: cur?.createdAt ?? nowIso(), date: day, slot, text: text.trim(), recipeId });
  };
  const moveMeal = (slot: MealSlot, to: string) => {
    const cur = meals.find((m) => m.date === day && m.slot === slot);
    if (!cur) return;
    const there = meals.find((m) => m.date === to && m.slot === slot);
    yl.save({ ...cur, date: to });
    if (there) yl.save({ ...there, date: day }); // troca de lugar
    play('page');
  };

  return (
    <div>
      <PanelHead title="🧊 Geladeira" sub="Na porta, o cardápio da semana. Dentro, o que você tem de verdade (vem do mercadinho)." onClose={onClose}>
        <button className="btn btn-quiet btn-sm" onClick={() => { setOpen(!open); play(open ? 'doorClose' : 'pop'); }}>{open ? 'Fechar a porta' : 'Abrir a porta'}</button>
      </PanelHead>
      <div className={`yl-fridge ${open ? 'is-open' : ''}`}>
        <div className="yl-fr-inside">
          {SHELVES.map((sh, i) => {
            const list = stock.filter((s) => shelfOf(s) === i).sort((a, b) => (a.expiry ?? '9').localeCompare(b.expiry ?? '9'));
            return (
              <div key={sh.label} className="yl-fr-shelf">
                <span className="yl-fr-label">{sh.label}</span>
                <div className="yl-fr-items">
                  {list.map((s, k) => (
                    <motion.button key={s.id} className={`yl-food ${expiryClass(s.expiry)}`} onClick={() => setItem(s)} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + k * 0.03 }} whileHover={{ y: -3 }} title={s.expiry ? expiryText(s.expiry) : 'sem validade'}>
                      <strong>{s.name}</strong>
                      <small>{s.qty} {s.unit}{s.expiry ? ` · ${expiryText(s.expiry)}` : ''}</small>
                    </motion.button>
                  ))}
                  {!list.length && <span className="yl-fr-empty">vazio</span>}
                </div>
              </div>
            );
          })}
          <button className="btn btn-secondary btn-sm yl-fr-add" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Guardar alimento</button>
        </div>
        <div className="yl-fr-door">
          <div className="yl-fr-front">
            <span className="yl-fr-handle" />
            <span className="yl-fr-magnet">🍓</span><span className="yl-fr-magnet m2">🥑</span>
          </div>
          <div className="yl-fr-back">
            <div className="yl-week-nav">
              <button className="icon-btn icon-btn-sm" onClick={() => setWeekOf(addDays(weekOf, -7))} aria-label="Semana anterior"><Icon name="chevronL" size={14} /></button>
              <strong>Cardápio · semana de {fmtDate(weekOf)}</strong>
              <button className="icon-btn icon-btn-sm" onClick={() => setWeekOf(addDays(weekOf, 7))} aria-label="Próxima semana"><Icon name="chevronR" size={14} /></button>
            </div>
            <div className="yl-days">
              {days.map((d) => (
                <button key={d} className={`yl-day ${d === day ? 'is-on' : ''} ${d === today() ? 'is-today' : ''}`} onClick={() => setDay(d)}>
                  <span>{DIAS_CURTOS[fromKey(d).getDay()]}</span>
                  <b>{fromKey(d).getDate()}</b>
                  <i>{MEAL_SLOTS.map((s) => <em key={s.id} className={meals.some((m) => m.date === d && m.slot === s.id) ? 'on' : ''} />)}</i>
                </button>
              ))}
            </div>
            <div className="yl-meals">
              {MEAL_SLOTS.map((s) => {
                const m = meals.find((x) => x.date === day && x.slot === s.id);
                return (
                  <div key={`${day}-${s.id}`} className="yl-meal">
                    <span className="yl-meal-s">{s.label}</span>
                    <input
                      list="yl-recipes"
                      defaultValue={m?.text ?? ''}
                      placeholder="o que vai comer?"
                      aria-label={`${s.label} de ${fmtDate(day)}`}
                      onBlur={(e) => {
                        const r = recipes.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
                        if ((m?.text ?? '') !== e.target.value.trim()) setMeal(s.id, e.target.value, r?.id ?? null);
                      }}
                    />
                    {m && (
                      <select aria-label="Mover para" value="" onChange={(e) => e.target.value && moveMeal(s.id, e.target.value)}>
                        <option value="">mover…</option>
                        {days.filter((d) => d !== day).map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
              <datalist id="yl-recipes">{recipes.map((r) => <option key={r.id} value={r.name} />)}</datalist>
            </div>
          </div>
        </div>
      </div>
      {adding && <StockForm onDone={() => setAdding(false)} />}
      {item && <StockItem s={item} onDone={() => setItem(null)} />}
    </div>
  );
}

export function StockForm({ onDone, initial }: { onDone: () => void; initial?: YlStock }) {
  const yl = useYl();
  const [s, setS] = useState({ name: initial?.name ?? '', qty: String(initial?.qty ?? 1), unit: initial?.unit ?? 'un', category: initial?.category ?? 'Hortifrúti', expiry: initial?.expiry ?? '' });
  return (
    <form
      className="yl-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!s.name.trim()) return;
        yl.save({ id: initial?.id ?? ylId('stock'), kind: 'stock', createdAt: initial?.createdAt ?? nowIso(), name: s.name.trim(), qty: num(s.qty) ?? 1, unit: s.unit, category: s.category, expiry: s.expiry || null, status: 'ok', addedAt: initial?.addedAt ?? today() });
        play('pop');
        onDone();
      }}
    >
      <F label="Alimento" grow><input id="st-n" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} autoFocus /></F>
      <F label="Qtd."><input id="st-q" inputMode="decimal" value={s.qty} onChange={(e) => setS({ ...s, qty: e.target.value })} /></F>
      <F label="Unid."><input id="st-u" value={s.unit} onChange={(e) => setS({ ...s, unit: e.target.value })} /></F>
      <F label="Categoria"><select id="st-c" value={s.category} onChange={(e) => setS({ ...s, category: e.target.value })}>{FOOD_CATS.map((c) => <option key={c}>{c}</option>)}</select></F>
      <F label="Validade"><input id="st-v" type="date" value={s.expiry} onChange={(e) => setS({ ...s, expiry: e.target.value })} /></F>
      <div className="btn-row"><button type="button" className="btn btn-quiet btn-sm" onClick={onDone}>Cancelar</button><button className="btn btn-primary btn-sm" type="submit">Guardar</button></div>
    </form>
  );
}

export function StockItem({ s, onDone }: { s: YlStock; onDone: () => void }) {
  const yl = useYl();
  const [edit, setEdit] = useState(false);
  const close = (status: 'consumido' | 'descartado') => {
    yl.save({ ...s, status, closedAt: nowIso() });
    play(status === 'consumido' ? 'check' : 'uncheck');
    onDone();
  };
  if (edit) return <StockForm initial={s} onDone={onDone} />;
  return (
    <div className="yl-item-card">
      <div>
        <strong>{s.name}</strong>
        <span className="muted small"> · {s.qty} {s.unit} · {s.category}{s.expiry ? ` · ${expiryText(s.expiry)}` : ''}</span>
      </div>
      <div className="btn-row wrap">
        {s.qty > 1 && <button className="btn btn-secondary btn-sm" onClick={() => { yl.save({ ...s, qty: s.qty - 1 }); play('pop'); onDone(); }}>Usei 1</button>}
        <button className="btn btn-primary btn-sm" onClick={() => close('consumido')}>✓ Consumido</button>
        <button className="btn btn-quiet btn-sm" onClick={() => close('descartado')}>Descartei</button>
        <button className="btn btn-quiet btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={13} /> Editar</button>
        <ConfirmButton className="btn btn-quiet btn-sm" label={<><Icon name="trash" size={13} /> Retirar</>} question="Retirar sem registrar?" confirmLabel="Retirar" onConfirm={() => { yl.del(s.id); onDone(); }} />
        <button className="icon-btn icon-btn-sm" onClick={onDone} aria-label="Fechar"><Icon name="close" size={14} /></button>
      </div>
    </div>
  );
}

// ── Livro de receitas ─────────────────────────────────────────

const RECIPE_CATS = ['Café da manhã', 'Almoço e jantar', 'Lanches', 'Doces', 'Bebidas', 'Outros'];

/** ingrediente disponível no estoque? (por nome) */
export const inStock = (name: string, stock: YlStock[]) => stock.find((s) => s.status === 'ok' && (s.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) || name.toLowerCase().includes(s.name.toLowerCase())));

function RecipeBook({ onClose, onCook }: { onClose: () => void; onCook: (id: string) => void }) {
  const yl = useYl();
  const recipes = [...yl.of('recipe')].sort((a, b) => Number(b.fav) - Number(a.fav) || a.name.localeCompare(b.name, 'pt-BR'));
  const [sel, setSel] = useState<string | null>(recipes[0]?.id ?? null);
  const [editing, setEditing] = useState<YlRecipe | 'new' | null>(null);
  const [cat, setCat] = useState<string>('todas');
  const r = recipes.find((x) => x.id === sel) ?? null;
  const stock = yl.of('stock');
  const shown = recipes.filter((x) => cat === 'todas' || x.category === cat);
  return (
    <div>
      <PanelHead title="📖 Livro de receitas" onClose={onClose}>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing('new')}><Icon name="plus" size={14} /> Nova receita</button>
      </PanelHead>
      {editing ? (
        <RecipeForm initial={editing === 'new' ? null : editing} onDone={(id) => { setEditing(null); if (id) setSel(id); }} />
      ) : (
        <motion.div className="yl-bookopen" initial={{ rotateY: -70, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 90, damping: 14 }}>
          <div className="yl-page yl-page-l">
            <div className="yl-cats">
              {['todas', ...RECIPE_CATS].map((c) => <button key={c} className={`chip-mini ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            {!shown.length && <p className="muted small">Nenhuma receita aqui ainda. Que tal escrever a primeira?</p>}
            <ul className="yl-rlist">
              {shown.map((x) => (
                <li key={x.id}>
                  <button className={x.id === sel ? 'is-on' : ''} onClick={() => { setSel(x.id); play('page'); }}>
                    <span>{x.fav ? '⭐ ' : ''}{x.name}</span>
                    <small className="muted">{x.made.length ? `feita ${x.made.length}×` : x.category}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={r?.id ?? 'none'} className="yl-page yl-page-r" initial={{ rotateY: 30, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -20, opacity: 0 }} transition={{ duration: 0.3 }}>
              {r ? (
                <>
                  <div className="yl-r-head">
                    <h3>{r.name}</h3>
                    <div className="btn-row">
                      <button className={`icon-btn icon-btn-sm ${r.fav ? 'is-fav' : ''}`} onClick={() => yl.save({ ...r, fav: !r.fav })} aria-label="Favorita" title="Favorita">{r.fav ? '⭐' : '☆'}</button>
                      <button className="icon-btn icon-btn-sm" onClick={() => setEditing(r)} aria-label="Editar"><Icon name="edit" size={14} /></button>
                    </div>
                  </div>
                  {r.photo && <AssetImg id={r.photo} className="yl-r-photo" alt="" />}
                  <span className="yl-k">Ingredientes</span>
                  <ul className="yl-ing">
                    {r.ingredients.map((g, i) => {
                      const s = inStock(g.name, stock);
                      return <li key={i} className={s ? 'has' : ''} title={s ? `Tem na geladeira: ${s.name}` : 'Não está no estoque'}>{s ? '✓ ' : ''}{g.qty} {g.name}</li>;
                    })}
                  </ul>
                  <span className="yl-k">Preparo</span>
                  <ol className="yl-steps">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {r.notes && <p className="yl-r-notes">{r.notes}</p>}
                  <div className="btn-row">
                    <button className="btn btn-primary btn-sm" onClick={() => onCook(r.id)}>🍳 Preparar no fogão</button>
                    {r.made.length > 0 && <span className="muted small">última vez: {fmtDate(r.made[r.made.length - 1])}</span>}
                  </div>
                </>
              ) : (
                <p className="muted">Escolha uma receita na página ao lado.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function RecipeForm({ initial, onDone }: { initial: YlRecipe | null; onDone: (id?: string) => void }) {
  const yl = useYl();
  const ui = useUI();
  const [r, setR] = useState({
    name: initial?.name ?? '', category: initial?.category ?? RECIPE_CATS[1], notes: initial?.notes ?? '', photo: initial?.photo,
    ing: (initial?.ingredients ?? []).map((g) => `${g.qty ? `${g.qty} | ` : ''}${g.name}`).join('\n'),
    steps: (initial?.steps ?? []).join('\n'),
  });
  return (
    <form
      className="yl-form yl-form-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!r.name.trim()) return;
        const id = initial?.id ?? ylId('recipe');
        yl.save({
          id, kind: 'recipe', createdAt: initial?.createdAt ?? nowIso(), name: r.name.trim(), category: r.category, notes: r.notes.trim(), photo: r.photo,
          ingredients: r.ing.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [a, b] = l.split('|').map((x) => x.trim()); return b ? { qty: a, name: b } : { qty: '', name: a }; }),
          steps: r.steps.split('\n').map((l) => l.trim()).filter(Boolean), fav: initial?.fav ?? false, made: initial?.made ?? [],
        });
        play('check');
        onDone(id);
      }}
    >
      <div className="yl-form">
        <F label="Nome" grow><input id="rc-n" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} autoFocus /></F>
        <F label="Categoria"><select id="rc-c" value={r.category} onChange={(e) => setR({ ...r, category: e.target.value })}>{RECIPE_CATS.map((c) => <option key={c}>{c}</option>)}</select></F>
      </div>
      <F label="Ingredientes (um por linha; quantidade | ingrediente)"><textarea id="rc-i" rows={5} value={r.ing} onChange={(e) => setR({ ...r, ing: e.target.value })} placeholder={'2 | ovos\n1 xícara | aveia\nbanana'} /></F>
      <F label="Preparo (um passo por linha)"><textarea id="rc-s" rows={5} value={r.steps} onChange={(e) => setR({ ...r, steps: e.target.value })} /></F>
      <F label="Observações"><textarea id="rc-o" rows={2} value={r.notes} onChange={(e) => setR({ ...r, notes: e.target.value })} /></F>
      <div className="btn-row wrap">
        <label className="btn btn-quiet btn-sm">
          <Icon name="upload" size={14} /> {r.photo ? 'Trocar foto' : 'Foto'}
          <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const x = await uploadImage(f); if ('id' in x) setR((p) => ({ ...p, photo: x.id })); else ui.toast(x.error, 'erro'); }} />
        </label>
        {initial && <ConfirmButton className="btn btn-quiet btn-sm" label={<><Icon name="trash" size={13} /> Apagar</>} question="Apagar a receita?" confirmLabel="Apagar" onConfirm={() => { yl.del(initial.id); onDone(); }} />}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDone()}>Cancelar</button>
        <button className="btn btn-primary btn-sm" type="submit">Salvar receita</button>
      </div>
    </form>
  );
}

// ── Fogão: modo preparo ───────────────────────────────────────

function Stove({ initial, onClose }: { initial: string | null; onClose: () => void }) {
  const yl = useYl();
  const ui = useUI();
  const recipes = yl.of('recipe');
  const [id, setId] = useState<string | null>(initial && recipes.some((r) => r.id === initial) ? initial : null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [got, setGot] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [use, setUse] = useState<Set<string>>(new Set());
  const r = recipes.find((x) => x.id === id) ?? null;
  const stock = yl.of('stock');
  const matches = useMemo(() => (r ? r.ingredients.map((g) => inStock(g.name, stock)).filter((x): x is YlStock => !!x) : []), [r, stock]);
  const pct = r && r.steps.length ? done.size / r.steps.length : 0;

  if (!r)
    return (
      <div>
        <PanelHead title="🍳 Fogão" sub="Escolha uma receita do livro para preparar passo a passo." onClose={onClose} />
        {!recipes.length ? <p className="muted">O livro de receitas ainda está vazio. Clique no livro na bancada para escrever a primeira.</p> : (
          <div className="yl-pick-grid">
            {recipes.map((x) => <button key={x.id} className="yl-pick-card" onClick={() => { setId(x.id); setDone(new Set()); setGot(new Set()); setFinished(false); }}><strong>{x.fav ? '⭐ ' : ''}{x.name}</strong><small className="muted">{x.steps.length} passos · {x.ingredients.length} ingredientes</small></button>)}
          </div>
        )}
      </div>
    );

  const finish = () => {
    yl.save({ ...r, made: [...r.made, today()] });
    setFinished(true);
    setUse(new Set(matches.map((m) => m.id)));
    play('mission');
    burst({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, 'coracoes', 16);
  };
  return (
    <div>
      <PanelHead title={`🍳 ${r.name}`} sub={finished ? 'Prontinho! Quer atualizar a geladeira?' : 'Marque os ingredientes separados e cada passo concluído.'} onClose={onClose}>
        <button className="btn btn-quiet btn-sm" onClick={() => setId(null)}>Trocar receita</button>
      </PanelHead>
      <div className="yl-cook">
        <div className={`yl-pan ${pct > 0 && !finished ? 'is-cooking' : ''} ${finished ? 'is-done' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 220 150">
            <ellipse cx="110" cy="128" rx="80" ry="12" fill="#3B3F52" />
            <g className="yl-flame">{[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${70 + k * 20} 128 q-8 -14 0 -26 q8 12 0 26z`} fill={k % 2 ? '#F4A23A' : '#F06B4A'} style={{ animationDelay: `${k * 0.12}s` }} />)}</g>
            <rect x="40" y="70" width="140" height="44" rx="14" fill="#F38CB8" />
            <rect x="26" y="66" width="168" height="12" rx="6" fill="#D9578F" />
            <rect x="180" y="84" width="34" height="8" rx="4" fill="#D9578F" />
            <motion.rect x="48" y="70" width="124" rx="8" fill="#FFD27A" animate={{ height: 10 + pct * 26, y: 104 - pct * 26 }} />
            <g className="yl-pan-steam">{[0, 1, 2].map((k) => <path key={k} d={`M${80 + k * 30} 60 q-8 -12 0 -24 q8 -12 0 -24`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" style={{ animationDelay: `${k * 0.4}s` }} />)}</g>
          </svg>
          <div className="yl-cook-bar"><motion.i animate={{ width: `${pct * 100}%` }} /></div>
        </div>
        <div className="yl-cook-lists">
          <span className="yl-k">Ingredientes</span>
          <ul className="yl-checks">
            {r.ingredients.map((g, i) => (
              <li key={i}>
                <label className={got.has(i) ? 'is-done' : ''}>
                  <input type="checkbox" checked={got.has(i)} onChange={() => { const n = new Set(got); if (n.has(i)) n.delete(i); else n.add(i); setGot(n); play('check'); }} />
                  {g.qty} {g.name} {inStock(g.name, stock) ? <span className="chip-mini is-on">na geladeira</span> : null}
                </label>
              </li>
            ))}
          </ul>
          <span className="yl-k">Passos</span>
          <ol className="yl-checks">
            {r.steps.map((s, i) => (
              <li key={i}>
                <label className={done.has(i) ? 'is-done' : ''}>
                  <input type="checkbox" checked={done.has(i)} onChange={() => { const n = new Set(done); if (n.has(i)) n.delete(i); else n.add(i); setDone(n); play(n.has(i) ? 'check' : 'uncheck'); }} />
                  {s}
                </label>
              </li>
            ))}
          </ol>
          {!finished ? (
            <button className="btn btn-primary" disabled={!r.steps.length ? false : done.size < r.steps.length} onClick={finish}>Finalizar preparo</button>
          ) : (
            <div className="yl-after">
              {matches.length ? (
                <>
                  <span className="yl-k">Usou da geladeira?</span>
                  {matches.map((m) => (
                    <label key={m.id} className="yl-check-row">
                      <input type="checkbox" checked={use.has(m.id)} onChange={() => { const n = new Set(use); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); setUse(n); }} />
                      {m.name} <span className="muted small">({m.qty} {m.unit})</span>
                    </label>
                  ))}
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    for (const m of matches) if (use.has(m.id)) yl.save(m.qty > 1 ? { ...m, qty: m.qty - 1 } : { ...m, status: 'consumido', closedAt: nowIso() });
                    ui.toast('Geladeira atualizada.');
                    onClose();
                  }}>Atualizar estoque</button>
                </>
              ) : <p className="muted small">Nenhum ingrediente desta receita está na geladeira.</p>}
              <button className="btn btn-quiet btn-sm" onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pia ───────────────────────────────────────────────────────

const CHORES = ['Lavar a louça', 'Limpar a bancada', 'Organizar a geladeira', 'Tirar o lixo', 'Limpar o fogão'];

function Sink({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [date, setDate] = useState(today());
  const [custom, setCustom] = useState('');
  const chores = yl.of('chore');
  const day = chores.filter((c) => c.date === date);
  const toggle = (task: string) => {
    const cur = day.find((c) => c.task === task);
    if (cur) {
      yl.del(cur.id);
      play('uncheck');
    } else {
      yl.save({ id: ylId('chore'), kind: 'chore', createdAt: nowIso(), date, task });
      play('check');
    }
  };
  const tasks = [...new Set([...CHORES, ...chores.map((c) => c.task)])];
  return (
    <div>
      <PanelHead title="🫧 Pia" sub="Tarefas da cozinha. Toque para marcar feito." onClose={onClose}>
        <DateIn id="sink-d" value={date} onChange={setDate} />
      </PanelHead>
      <div className="yl-chores">
        {tasks.map((t) => {
          const on = day.some((c) => c.task === t);
          return (
            <motion.button key={t} className={`yl-chore ${on ? 'is-on' : ''}`} onClick={() => toggle(t)} whileTap={{ scale: 0.92 }}>
              <span className="yl-bubble" aria-hidden="true">{on ? '✨' : '🫧'}</span>
              {t}
            </motion.button>
          );
        })}
        <form className="yl-chore-add" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { toggle(custom.trim()); setCustom(''); } }}>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Outra tarefa…" aria-label="Outra tarefa" />
        </form>
      </div>
      <p className="muted small">Nos últimos 7 dias: {chores.filter((c) => c.date > addDays(today(), -7)).length} tarefas feitas.</p>
    </div>
  );
}
