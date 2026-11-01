// Mercadinho: cesta (lista de compras), caixa (finalizar e mandar para a
// geladeira), controle de validade e vitrine de desejos.
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { Hot, Place, PanelHead, F, DateIn, brl, daysUntil, fmtDate, num } from '../ui';
import { useYl, ylId, nowIso } from '../store';
import { FOOD_CATS, type YlGrocery, type YlPurchaseItem, type YlWish } from '../types';
import { expiryClass, expiryText, inStock, StockItem } from './Casa';
import { useUI, ConfirmButton } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { today } from '../../logic/dates';
import { play } from '../../logic/sound';
import { burst } from '../../logic/fx';
import { uploadImage } from '../../components/upload';
import { AssetImg } from '../../assets/registry';

type Spot = 'cesta' | 'caixa' | 'validade' | 'vitrine';

export function Mercadinho({ onBack }: PlaceProps) {
  const yl = useYl();
  const [spot, setSpot] = useState<Spot | null>(null);
  const pick = (id: string) => setSpot((s) => (s === id ? null : (id as Spot)));
  const list = yl.of('grocery');
  const inBasket = list.filter((g) => g.inBasket).length;
  const soon = yl.of('stock').filter((s) => s.status === 'ok' && s.expiry && daysUntil(s.expiry) <= 3).length;
  const scene = (
    <svg viewBox="0 0 1000 470" className="yl-room" role="img" aria-label="Mercadinho">
      <rect width="1000" height="340" fill="#FFF8EC" />
      <rect y="340" width="1000" height="130" fill="#EADFCF" />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 100} y="340" width="50" height="130" fill="#E2D4C0" opacity=".6" />)}
      {/* toldo */}
      {Array.from({ length: 20 }).map((_, i) => <path key={i} d={`M${i * 50} 0 h50 v34 a25 25 0 0 1 -50 0z`} fill={i % 2 ? '#fff' : '#EE6F87'} />)}

      {/* prateleiras */}
      <Hot id="cesta" label="Prateleiras e cesta: lista de compras" on={spot === 'cesta'} onPick={pick}>
        <g transform="translate(40 80)">
          <rect width="330" height="250" rx="10" fill="#F7E3C3" stroke="#E2C99F" strokeWidth="3" />
          {[0, 1, 2].map((r) => (
            <g key={r} transform={`translate(0 ${20 + r * 76})`}>
              <rect x="10" y="50" width="310" height="10" rx="4" fill="#D9B98B" />
              {Array.from({ length: 7 }).map((_, k) => {
                const c = ['#F4C430', '#E8455F', '#8DC26F', '#F08C3A', '#9C7FE0', '#6FB0F2', '#F38CB8'][(k + r * 2) % 7];
                return k % 2 ? <rect key={k} x={22 + k * 42} y={12 + (k % 3) * 4} width="28" height={38 - (k % 3) * 4} rx="5" fill={c} /> : <circle key={k} cx={36 + k * 42} cy="36" r="14" fill={c} />;
              })}
            </g>
          ))}
        </g>
        <g transform="translate(250 330)" className="yl-basket">
          <path d="M0 20 h110 l-12 60 h-86z" fill="#C79A72" />
          <path d="M20 20 q35 -40 70 0" fill="none" stroke="#9C6B45" strokeWidth="6" />
          {Array.from({ length: Math.min(5, inBasket) }).map((_, i) => <circle key={i} cx={22 + i * 17} cy="16" r="9" fill={['#E8455F', '#8DC26F', '#F4C430', '#F08C3A', '#9C7FE0'][i]} />)}
        </g>
      </Hot>

      {/* caixa registradora */}
      <Hot id="caixa" label="Caixa registradora" on={spot === 'caixa'} onPick={pick}>
        <g transform="translate(430 220)">
          <rect x="0" y="80" width="200" height="120" rx="10" fill="#9C7FE0" />
          <rect x="30" y="20" width="120" height="70" rx="10" fill="#E9D8FF" stroke="#9C7FE0" strokeWidth="4" />
          <rect x="44" y="32" width="92" height="22" rx="4" fill="#2E4A7F" />
          <text x="90" y="48" textAnchor="middle" className="yl-lcd">{inBasket ? `${inBasket} itens` : 'R$ 0,00'}</text>
          <rect x="40" y="100" width="120" height="16" rx="5" fill="#fff" opacity=".6" />
        </g>
      </Hot>

      {/* validade (cartaz de ofertas/prazo) */}
      <Hot id="validade" label="Quadro de validade" on={spot === 'validade'} onPick={pick}>
        <g transform="translate(450 70)">
          <rect width="160" height="120" rx="10" fill="#fff" stroke="#F4C430" strokeWidth="5" />
          <text x="80" y="34" textAnchor="middle" className="yl-tag yl-tag-dark">VALIDADE</text>
          <text x="80" y="82" textAnchor="middle" className="yl-big-n">{soon}</text>
          <text x="80" y="104" textAnchor="middle" className="yl-tag yl-tag-dark">vencendo</text>
        </g>
      </Hot>

      {/* vitrine de desejos */}
      <Hot id="vitrine" label="Vitrine de desejos" on={spot === 'vitrine'} onPick={pick}>
        <g transform="translate(680 80)">
          <rect width="280" height="250" rx="14" fill="#EAF4FF" stroke="#C9D7EA" strokeWidth="4" />
          <rect x="14" y="14" width="252" height="222" rx="10" fill="url(#yl-glass-m)" />
          <rect x="30" y="150" width="220" height="10" rx="5" fill="#C9D7EA" />
          <path d="M70 150 l14 -50 h40 l14 50z" fill="#F38CB8" /><rect x="88" y="90" width="32" height="14" rx="6" fill="#D9578F" />
          <rect x="160" y="96" width="60" height="54" rx="8" fill="#9FC46A" /><rect x="186" y="96" width="8" height="54" fill="#fff" opacity=".8" />
          <text x="140" y="214" textAnchor="middle" className="yl-tag yl-tag-dark">desejos ✨</text>
        </g>
      </Hot>
      <defs><linearGradient id="yl-glass-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#DCEBFB" /></linearGradient></defs>
    </svg>
  );
  const panel =
    spot === 'cesta' ? <Basket onClose={() => setSpot(null)} onCheckout={() => setSpot('caixa')} />
    : spot === 'caixa' ? <Checkout onClose={() => setSpot(null)} />
    : spot === 'validade' ? <Expiry onClose={() => setSpot(null)} />
    : spot === 'vitrine' ? <Wishlist onClose={() => setSpot(null)} />
    : null;
  return <Place title="Mercadinho" emoji="🛒" onBack={onBack} scene={scene} spot={spot} panel={panel} hint="Prateleiras: lista de compras · Caixa: finalizar · Quadro: validade · Vitrine: desejos." />;
}

// ── Cesta ─────────────────────────────────────────────────────

function Basket({ onClose, onCheckout }: { onClose: () => void; onCheckout: () => void }) {
  const yl = useYl();
  const list = yl.of('grocery');
  const [f, setF] = useState({ name: '', qty: '1', unit: 'un', price: '', category: 'Hortifrúti' });
  const cats = [...new Set(list.map((g) => g.category))].sort((a, b) => FOOD_CATS.indexOf(a) - FOOD_CATS.indexOf(b));
  const est = list.reduce((a, g) => a + (g.price ?? 0) * g.qty, 0);
  const toggle = (g: YlGrocery, e: React.MouseEvent) => {
    yl.save({ ...g, inBasket: !g.inBasket });
    if (!g.inBasket) {
      play('pop');
      burst(e, 'brilho', 6);
    } else play('uncheck');
  };
  return (
    <div>
      <PanelHead title="🧺 Lista de compras" sub={`${list.length} itens · estimado ${brl(est)} · ${list.filter((g) => g.inBasket).length} na cesta`} onClose={onClose}>
        {list.some((g) => g.inBasket) && <button className="btn btn-primary btn-sm" onClick={onCheckout}>Ir para o caixa</button>}
      </PanelHead>
      <form
        className="yl-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          yl.save({ id: ylId('grocery'), kind: 'grocery', createdAt: nowIso(), name: f.name.trim(), qty: num(f.qty) ?? 1, unit: f.unit, price: num(f.price), category: f.category, inBasket: false });
          setF({ ...f, name: '', qty: '1', price: '' });
          play('pop');
        }}
      >
        <F label="Produto" grow><input id="g-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex.: banana" /></F>
        <F label="Qtd."><input id="g-q" inputMode="decimal" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></F>
        <F label="Unid."><input id="g-u" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></F>
        <F label="Preço est. (un)"><input id="g-p" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="R$" /></F>
        <F label="Categoria"><select id="g-c" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{FOOD_CATS.map((c) => <option key={c}>{c}</option>)}</select></F>
        <button className="btn btn-secondary btn-sm" type="submit"><Icon name="plus" size={14} /> Pôr na lista</button>
      </form>
      {!list.length && <p className="muted">Lista vazia. Adicione o que precisa comprar.</p>}
      <div className="yl-glist">
        {cats.map((c) => (
          <div key={c} className="yl-gcat">
            <span className="yl-k">{c}</span>
            <AnimatePresence initial={false}>
              {list.filter((g) => g.category === c).map((g) => (
                <motion.div key={g.id} layout className={`yl-gitem ${g.inBasket ? 'is-in' : ''}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <button className="yl-gcheck" onClick={(e) => toggle(g, e)} aria-pressed={g.inBasket} aria-label={g.inBasket ? 'Tirar da cesta' : 'Pôr na cesta'}>
                    <motion.span animate={g.inBasket ? { y: [0, -14, 6, 0], rotate: [0, -20, 10, 0] } : { y: 0 }} transition={{ duration: 0.5 }}>{g.inBasket ? '🧺' : '○'}</motion.span>
                  </button>
                  <span className="yl-gname">{g.name}</span>
                  <span className="muted small">{g.qty} {g.unit}{g.price != null ? ` · ${brl(g.price * g.qty)}` : ''}</span>
                  {inStock(g.name, yl.of('stock')) && <span className="chip-mini" title="Já tem na geladeira">tem em casa</span>}
                  <button className="icon-btn icon-btn-sm" onClick={() => yl.del(g.id)} aria-label="Tirar da lista"><Icon name="close" size={13} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Caixa ─────────────────────────────────────────────────────

const FRESH_DAYS: Record<string, number> = { 'Hortifrúti': 6, 'Carnes e ovos': 4, 'Laticínios': 10, 'Padaria': 4 };

function Checkout({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const ui = useUI();
  const basket = yl.of('grocery').filter((g) => g.inBasket);
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState(() =>
    basket.map((g) => ({ id: g.id, name: g.name, qty: String(g.qty), unit: g.unit, price: g.price != null ? String(g.price) : '', category: g.category, expiry: '', toStock: !['Limpeza', 'Higiene'].includes(g.category) })),
  );
  const total = rows.reduce((a, r) => a + (num(r.price) ?? 0) * (num(r.qty) ?? 1), 0);
  const purchases = [...yl.of('purchase')].sort((a, b) => b.date.localeCompare(a.date));
  const month = today().slice(0, 7);
  const monthTotal = purchases.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p.total, 0);
  const pay = () => {
    const items: YlPurchaseItem[] = rows.map((r) => ({ name: r.name, qty: num(r.qty) ?? 1, unit: r.unit, price: num(r.price), category: r.category, expiry: r.expiry || null }));
    yl.save({ id: ylId('purchase'), kind: 'purchase', createdAt: nowIso(), date, total: Math.round(total * 100) / 100, items });
    for (const r of rows) {
      if (r.toStock) yl.save({ id: ylId('stock'), kind: 'stock', createdAt: nowIso(), name: r.name, qty: num(r.qty) ?? 1, unit: r.unit, category: r.category, expiry: r.expiry || null, status: 'ok', addedAt: date });
      yl.del(r.id);
    }
    play('mission');
    burst({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, 'confete', 18);
    ui.toast(`Compra registrada: ${brl(total)}. ${rows.filter((r) => r.toStock).length} itens foram para a geladeira.`, 'diva');
    onClose();
  };
  return (
    <div>
      <PanelHead title="🧾 Caixa" sub={`Neste mês: ${brl(monthTotal)} em ${purchases.filter((p) => p.date.startsWith(month)).length} compras`} onClose={onClose} />
      {!rows.length ? (
        <p className="muted">A cesta está vazia. Marque os produtos na lista (prateleiras) para trazê-los ao caixa.</p>
      ) : (
        <>
          <div className="yl-receipt">
            <div className="yl-receipt-head"><span>Produto</span><span>Qtd.</span><span>Preço (un)</span><span>Validade</span><span title="Guardar na geladeira">Casa</span></div>
            {rows.map((r, i) => {
              const set = (p: Partial<typeof r>) => setRows(rows.map((x, k) => (k === i ? { ...x, ...p } : x)));
              return (
                <div key={r.id} className="yl-receipt-row">
                  <span>{r.name}</span>
                  <input aria-label="Quantidade" inputMode="decimal" value={r.qty} onChange={(e) => set({ qty: e.target.value })} />
                  <input aria-label="Preço real" inputMode="decimal" value={r.price} onChange={(e) => set({ price: e.target.value })} placeholder="R$" />
                  <span className="yl-exp">
                    <input aria-label="Validade" type="date" value={r.expiry} onChange={(e) => set({ expiry: e.target.value })} />
                    {!r.expiry && FRESH_DAYS[r.category] && <button className="link small" type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + FRESH_DAYS[r.category]); set({ expiry: d.toISOString().slice(0, 10) }); }}>+{FRESH_DAYS[r.category]}d</button>}
                  </span>
                  <input aria-label="Mandar para a geladeira" type="checkbox" checked={r.toStock} onChange={(e) => set({ toStock: e.target.checked })} />
                </div>
              );
            })}
            <div className="yl-receipt-total"><span>Total</span><strong>{brl(total)}</strong></div>
          </div>
          <div className="btn-row">
            <DateIn id="ck-d" value={date} onChange={setDate} />
            <button className="btn btn-primary" onClick={pay}>💳 Finalizar compra</button>
          </div>
        </>
      )}
      {purchases.length > 0 && (
        <details className="yl-hist">
          <summary>Compras anteriores</summary>
          <ul>
            {purchases.slice(0, 12).map((p) => (
              <li key={p.id}>
                <span>{fmtDate(p.date)}</span><span className="muted small">{p.items.length} itens</span><strong>{brl(p.total)}</strong>
                <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={13} />} question="Apagar esta compra?" confirmLabel="Apagar" onConfirm={() => yl.del(p.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── Validade ──────────────────────────────────────────────────

function Expiry({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [item, setItem] = useState<string | null>(null);
  const stock = yl.of('stock').filter((s) => s.status === 'ok');
  const dated = stock.filter((s) => s.expiry).sort((a, b) => a.expiry!.localeCompare(b.expiry!));
  const soon = dated.filter((s) => daysUntil(s.expiry!) <= 5);
  const forgotten = stock.filter((s) => !s.expiry && s.addedAt <= new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10));
  const recipes = yl.of('recipe');
  const ideas = recipes
    .map((r) => ({ r, hits: r.ingredients.filter((g) => soon.some((s) => s.name.toLowerCase().includes(g.name.toLowerCase().split(' ')[0]) || g.name.toLowerCase().includes(s.name.toLowerCase()))).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 4);
  const closed = yl.of('stock').filter((s) => s.closedAt && s.closedAt.slice(0, 7) === today().slice(0, 7));
  const sel = stock.find((s) => s.id === item);
  return (
    <div>
      <PanelHead title="⏰ Validade" sub={`Neste mês: ${closed.filter((s) => s.status === 'consumido').length} consumidos · ${closed.filter((s) => s.status === 'descartado').length} descartados`} onClose={onClose} />
      {sel && <StockItem s={sel} onDone={() => setItem(null)} />}
      {!dated.length && !forgotten.length && <p className="muted">Nada com validade por perto. Os itens finalizados no caixa (com validade) aparecem aqui.</p>}
      {soon.length > 0 && <span className="yl-k">Vencendo nos próximos dias</span>}
      <div className="yl-exp-list">
        {dated.map((s) => (
          <button key={s.id} className={`yl-food ${expiryClass(s.expiry)}`} onClick={() => setItem(s.id)}>
            <strong>{s.name}</strong>
            <small>{expiryText(s.expiry)} · {s.qty} {s.unit}</small>
          </button>
        ))}
      </div>
      {forgotten.length > 0 && (
        <>
          <span className="yl-k">Esquecidos na geladeira (há mais de 2 semanas, sem validade)</span>
          <div className="yl-exp-list">{forgotten.map((s) => <button key={s.id} className="yl-food" onClick={() => setItem(s.id)}><strong>{s.name}</strong><small>desde {fmtDate(s.addedAt)}</small></button>)}</div>
        </>
      )}
      {ideas.length > 0 && (
        <div className="yl-ideas">
          <span className="yl-k">👩🏻‍🍳 Dá para usar em</span>
          {ideas.map(({ r, hits }) => <span key={r.id} className="chip-mini is-on">{r.name} · {hits} ingrediente{hits > 1 ? 's' : ''} vencendo</span>)}
        </div>
      )}
    </div>
  );
}

// ── Vitrine de desejos ────────────────────────────────────────

function Wishlist({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const ui = useUI();
  const wishes = [...yl.of('wish')].sort((a, b) => Number(!!a.boughtAt) - Number(!!b.boughtAt) || a.priority - b.priority);
  const [f, setF] = useState<{ name: string; want: string; found: string; priority: 1 | 2 | 3; link: string; image?: string } | null>(null);
  const [price, setPrice] = useState<Record<string, string>>({});
  const lastPrice = (w: YlWish) => w.prices.at(-1)?.price ?? null;
  return (
    <div>
      <PanelHead title="✨ Vitrine de desejos" sub="Separado das compras do mercado. Acompanhe os preços até a hora certa." onClose={onClose}>
        <button className="btn btn-secondary btn-sm" onClick={() => setF({ name: '', want: '', found: '', priority: 2, link: '' })}><Icon name="plus" size={14} /> Desejo</button>
      </PanelHead>
      {f && (
        <form
          className="yl-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.name.trim()) return;
            const found = num(f.found);
            yl.save({ id: ylId('wish'), kind: 'wish', createdAt: nowIso(), name: f.name.trim(), wantPrice: num(f.want), prices: found != null ? [{ date: today(), price: found }] : [], priority: f.priority, link: f.link.trim() || undefined, image: f.image, boughtAt: null });
            setF(null);
            play('pop');
          }}
        >
          <F label="Nome" grow><input id="w-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></F>
          <F label="Quero pagar"><input id="w-w" inputMode="decimal" value={f.want} onChange={(e) => setF({ ...f, want: e.target.value })} placeholder="R$" /></F>
          <F label="Achei por"><input id="w-f" inputMode="decimal" value={f.found} onChange={(e) => setF({ ...f, found: e.target.value })} placeholder="R$" /></F>
          <F label="Prioridade"><select id="w-p" value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) as 1 | 2 | 3 })}><option value={1}>Alta</option><option value={2}>Média</option><option value={3}>Baixa</option></select></F>
          <F label="Link (opcional)" grow><input id="w-l" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></F>
          <label className="btn btn-quiet btn-sm">
            <Icon name="upload" size={14} /> {f.image ? 'Imagem ✓' : 'Imagem'}
            <input type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const x = await uploadImage(file); if ('id' in x) setF((p) => (p ? { ...p, image: x.id } : p)); else ui.toast(x.error, 'erro'); }} />
          </label>
          <div className="btn-row"><button type="button" className="btn btn-quiet btn-sm" onClick={() => setF(null)}>Cancelar</button><button className="btn btn-primary btn-sm" type="submit">Pôr na vitrine</button></div>
        </form>
      )}
      {!wishes.length && !f && <p className="muted">Vitrine vazia. Guarde aqui o que você quer comprar com calma.</p>}
      <div className="yl-wishes">
        {wishes.map((w, i) => {
          const lp = lastPrice(w);
          const good = lp != null && w.wantPrice != null && lp <= w.wantPrice;
          return (
            <motion.div key={w.id} className={`yl-wish ${w.boughtAt ? 'is-bought' : ''} ${good ? 'is-good' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -4, rotate: -0.6 }}>
              <div className="yl-wish-img">{w.image ? <AssetImg id={w.image} alt="" /> : <span>🎁</span>}</div>
              <strong>{w.name}</strong>
              <span className="small">{['', '🔴 alta', '🟡 média', '🟢 baixa'][w.priority]}</span>
              <span className="small">quero: {brl(w.wantPrice)} · achei: {brl(lp)}</span>
              {good && !w.boughtAt && <span className="chip-mini is-on">chegou no preço!</span>}
              {w.prices.length > 1 && <span className="muted small">preços: {w.prices.slice(-4).map((p) => brl(p.price)).join(' → ')}</span>}
              {w.link && /^https?:\/\//.test(w.link) && <a className="link small" href={w.link} target="_blank" rel="noreferrer noopener">abrir link</a>}
              {w.boughtAt ? <span className="chip-mini is-on">comprado {fmtDate(w.boughtAt)}</span> : (
                <div className="yl-wish-actions">
                  <input aria-label="Novo preço encontrado" inputMode="decimal" placeholder="novo preço" value={price[w.id] ?? ''} onChange={(e) => setPrice({ ...price, [w.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { const n = num(price[w.id] ?? ''); if (n != null) { yl.save({ ...w, prices: [...w.prices, { date: today(), price: n }] }); setPrice({ ...price, [w.id]: '' }); } } }} />
                  <button className="btn btn-primary btn-sm" onClick={(e) => { yl.save({ ...w, boughtAt: today() }); burst(e, 'confete', 14); play('mission'); }}>Comprei!</button>
                </div>
              )}
              <ConfirmButton className="icon-btn icon-btn-sm yl-wish-del" label={<Icon name="trash" size={13} />} question="Tirar da vitrine?" confirmLabel="Tirar" onConfirm={() => yl.del(w.id)} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
