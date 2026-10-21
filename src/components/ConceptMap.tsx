import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useStore } from '../data/store';
import { AssetImg } from '../assets/registry';
import { uploadImage } from './upload';
import { useUI } from './ui';
import type { MapColor, MapNode } from '../types';
import { MAP_COLORS, childSpot, childrenOf, colorOf, descendants, emptyMap, newNode, tidy, visibleNodes, NODE_H, NODE_W, type Size } from '../logic/conceptMap';

type View = { x: number; y: number; z: number };
type Gesture =
  | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number; moved: boolean }
  | { mode: 'node'; sx: number; sy: number; id: string; moved: boolean; orig: Map<string, { x: number; y: number }>; before: MapNode[] }
  | { mode: 'pinch'; d0: number; z0: number; mx: number; my: number; v0: View };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Mapa conceitual do tema, num quadro infinito. Um único mapa por tema:
 * o mesmo aparece na Correção de Simulados e na Biblioteca.
 */
export function ConceptMapEditor({ topicId, focusNodeId, height }: { topicId: string; focusNodeId?: string | null; height?: number | string }) {
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  const ui = useUI();
  const topic = store.data.topics.find((t) => t.id === topicId);

  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [rootId, setRootId] = useState('');
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const [, setSizeVer] = useState(0);
  const [hist, setHist] = useState({ past: 0, future: 0 });

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const rootRef = useRef(rootId);
  rootRef.current = rootId;
  const viewRef = useRef(view);
  viewRef.current = view;
  const past = useRef<MapNode[][]>([]);
  const future = useRef<MapNode[][]>([]);
  const loadedFor = useRef<string | null>(null);
  const lastSaved = useRef('');
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);
  const sizes = useRef(new Map<string, Size>());
  const els = useRef(new Map<string, HTMLDivElement>());
  const vp = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const needFit = useRef<string | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const editStart = useRef<MapNode[] | null>(null);

  // ── salvar (no próprio tema) ──
  const commitSave = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current || !loadedFor.current) return;
    const t = storeRef.current.snapshot().topics.find((x) => x.id === loadedFor.current);
    if (!t) return;
    const updatedAt = new Date().toISOString();
    lastSaved.current = updatedAt;
    dirty.current = false;
    storeRef.current.saveTopic({ ...t, map: { rootId: rootRef.current, nodes: nodesRef.current, updatedAt } });
  }, []);
  const scheduleSave = useCallback(() => {
    dirty.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(commitSave, 700);
  }, [commitSave]);
  useEffect(() => () => commitSave(), [commitSave]);
  useEffect(() => {
    const h = () => commitSave();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [commitSave]);

  // ── carregar ──
  useEffect(() => {
    if (!topic) return;
    if (loadedFor.current !== topicId) {
      if (loadedFor.current) commitSave();
      const m = topic.map ?? emptyMap(topic);
      setNodes(m.nodes);
      setRootId(m.rootId);
      past.current = [];
      future.current = [];
      setHist({ past: 0, future: 0 });
      loadedFor.current = topicId;
      lastSaved.current = topic.map?.updatedAt ?? '';
      dirty.current = false;
      setSel(focusNodeId ?? null);
      setEditing(null);
      setPanel(false);
      needFit.current = focusNodeId ?? 'all';
      return;
    }
    // atualização vinda de outro aparelho: só aplica se não há edição pendente
    const m = topic.map;
    if (m && !dirty.current && m.updatedAt > lastSaved.current) {
      setNodes(m.nodes);
      setRootId(m.rootId);
      lastSaved.current = m.updatedAt;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, topic?.map?.updatedAt, !!topic]);

  useEffect(() => {
    if (focusNodeId && nodes.some((n) => n.id === focusNodeId)) {
      setSel(focusNodeId);
      needFit.current = focusNodeId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId]);

  // ── histórico ──
  const pushHistory = (snap = nodesRef.current) => {
    past.current = [...past.current.slice(-99), snap];
    future.current = [];
    setHist({ past: past.current.length, future: 0 });
  };
  const apply = (fn: (n: MapNode[]) => MapNode[], history = true) => {
    if (history) pushHistory();
    const next = fn(nodesRef.current);
    nodesRef.current = next;
    setNodes(next);
    scheduleSave();
  };
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(nodesRef.current);
    nodesRef.current = prev;
    setNodes(prev);
    setHist({ past: past.current.length, future: future.current.length });
    if (sel && !prev.some((n) => n.id === sel)) setSel(null);
    scheduleSave();
  };
  const redo = () => {
    const nx = future.current.pop();
    if (!nx) return;
    past.current.push(nodesRef.current);
    nodesRef.current = nx;
    setNodes(nx);
    setHist({ past: past.current.length, future: future.current.length });
    scheduleSave();
  };

  // ── medidas dos nós (para as curvas) ──
  const visible = useMemo(() => visibleNodes(nodes), [nodes]);
  useLayoutEffect(() => {
    let changed = false;
    for (const [id, el] of els.current) {
      const s = { w: el.offsetWidth, h: el.offsetHeight };
      const o = sizes.current.get(id);
      if (!o || o.w !== s.w || o.h !== s.h) {
        sizes.current.set(id, s);
        changed = true;
      }
    }
    if (changed) setSizeVer((v) => v + 1);
    if (needFit.current && vp.current && visible.length) {
      const f = needFit.current;
      needFit.current = null;
      if (f === 'all') fit();
      else centerOn(f);
    }
  });

  const panelRef = useRef(false);
  panelRef.current = panel && !!sel;
  // área útil do quadro (sem o painel de detalhes, quando ele está ao lado)
  const vpSize = () => {
    const w = vp.current?.clientWidth ?? 800;
    const side = panelRef.current && w > 760 ? 320 : 0;
    return { w: w - side, h: vp.current?.clientHeight ?? 500 };
  };
  const fit = () => {
    const vis = visibleNodes(nodesRef.current);
    if (!vis.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of vis) {
      const s = sizes.current.get(n.id) ?? { w: NODE_W, h: NODE_H };
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + s.w); y1 = Math.max(y1, n.y + s.h);
    }
    const { w, h } = vpSize();
    const z = clamp(Math.min((w - 80) / (x1 - x0 || 1), (h - 80) / (y1 - y0 || 1)), 0.3, 1.1);
    setView({ z, x: w / 2 - ((x0 + x1) / 2) * z, y: h / 2 - ((y0 + y1) / 2) * z });
  };
  const centerOn = (id: string) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return;
    const s = sizes.current.get(id) ?? { w: NODE_W, h: NODE_H };
    const { w, h } = vpSize();
    const z = Math.max(viewRef.current.z, 0.9);
    setView({ z, x: w / 2 - (n.x + s.w / 2) * z, y: h / 2 - (n.y + s.h / 2) * z });
  };
  const zoomAt = (px: number, py: number, factor: number) =>
    setView((v) => {
      const z = clamp(v.z * factor, 0.25, 2.5);
      return { z, x: px - (px - v.x) * (z / v.z), y: py - (py - v.y) * (z / v.z) };
    });
  const zoomCenter = (f: number) => {
    const { w, h } = vpSize();
    zoomAt(w / 2, h / 2, f);
  };

  // roda do mouse: rolar = mover o quadro; ctrl/pinça do trackpad = zoom
  useEffect(() => {
    const el = vp.current;
    if (!el) return undefined;
    const h = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.cm-panel')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01));
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  // ── edição ──
  const addChild = (pid: string) => {
    const p = nodesRef.current.find((n) => n.id === pid);
    if (!p) return;
    const spot = childSpot(nodesRef.current, p, sizes.current);
    const n = newNode({ parentId: pid, ...spot, color: p.parentId === null && pid === rootRef.current ? undefined : p.color });
    editStart.current = null;
    apply((ns) => ns.map((x) => (x.id === pid && x.collapsed ? { ...x, collapsed: false } : x)).concat(n));
    setSel(n.id);
    setEditing(n.id);
  };
  const addSibling = (id: string) => {
    const me = nodesRef.current.find((n) => n.id === id);
    if (!me) return;
    if (!me.parentId) return addChild(id);
    addChild(me.parentId);
  };
  const remove = (id: string) => {
    if (id === rootRef.current) return;
    const gone = descendants(nodesRef.current, id);
    gone.add(id);
    apply((ns) => ns.filter((n) => !gone.has(n.id)));
    setSel(null);
    setPanel(false);
  };
  const patch = (id: string, p: Partial<MapNode>, history = true) => apply((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)), history);
  const finishEdit = (id: string, title: string) => {
    setEditing(null);
    wrap.current?.focus({ preventScroll: true }); // atalhos continuam funcionando
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return;
    const empty = !title.trim() && !n.notes && !n.explanation && !n.list?.length && !n.links?.length && !n.images?.length && !childrenOf(nodesRef.current, id).length;
    if (empty && id !== rootRef.current) {
      // nó novo que ficou vazio: some sem deixar rastro no histórico
      const next = nodesRef.current.filter((x) => x.id !== id);
      nodesRef.current = next;
      setNodes(next);
      if (past.current.length && !past.current.at(-1)!.some((x) => x.id === id)) {
        past.current.pop();
        setHist({ past: past.current.length, future: future.current.length });
      }
      setSel(n.parentId);
      editStart.current = null;
      scheduleSave();
      return;
    }
    if (title !== n.title) patch(id, { title: title.trim() }, !!editStart.current);
    editStart.current = null;
  };
  const startEdit = (id: string) => {
    editStart.current = nodesRef.current;
    setSel(id);
    setEditing(id);
  };

  // ── ponteiro: arrastar o quadro, arrastar nós, pinça ──
  const toWorld = (cx: number, cy: number) => {
    const r = vp.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.cm-ui, input, textarea, button, select, a')) return;
    wrap.current?.focus({ preventScroll: true });
    vp.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = vp.current!.getBoundingClientRect();
      gesture.current = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: viewRef.current.z, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, v0: viewRef.current };
      return;
    }
    const nodeEl = t.closest('[data-node]') as HTMLElement | null;
    if (nodeEl) {
      const id = nodeEl.dataset.node!;
      setSel(id);
      const move = new Set([id, ...descendants(nodesRef.current, id)]);
      const orig = new Map(nodesRef.current.filter((n) => move.has(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]));
      gesture.current = { mode: 'node', sx: e.clientX, sy: e.clientY, id, moved: false, orig, before: nodesRef.current };
    } else {
      gesture.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.mode === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const z = clamp((g.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / (g.d0 || 1), 0.25, 2.5);
      setView({ z, x: g.mx - (g.mx - g.v0.x) * (z / g.v0.z), y: g.my - (g.my - g.v0.y) * (z / g.v0.z) });
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    g.moved = true;
    if (g.mode === 'pan') setView((v) => ({ ...v, x: g.vx + dx, y: g.vy + dy }));
    else {
      const z = viewRef.current.z;
      const next = nodesRef.current.map((n) => {
        const o = g.orig.get(n.id);
        return o ? { ...n, x: Math.round(o.x + dx / z), y: Math.round(o.y + dy / z) } : n;
      });
      nodesRef.current = next;
      setNodes(next);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.mode === 'pinch') {
      if (pointers.current.size === 0) gesture.current = null;
      return;
    }
    gesture.current = null;
    if (!g) return;
    if (g.mode === 'node' && g.moved) {
      pushHistory(g.before);
      scheduleSave();
    }
    if (g.mode === 'pan' && !g.moved) {
      setSel(null);
      setEditing(null);
    }
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.cm-ui, input, textarea, button')) return;
    const nodeEl = t.closest('[data-node]') as HTMLElement | null;
    if (nodeEl) return startEdit(nodeEl.dataset.node!);
    const w = toWorld(e.clientX, e.clientY);
    const n = newNode({ parentId: null, x: Math.round(w.x - NODE_W / 2), y: Math.round(w.y - NODE_H / 2), color: 'neutro' });
    editStart.current = null;
    apply((ns) => ns.concat(n));
    setSel(n.id);
    setEditing(n.id);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const typing = (e.target as HTMLElement).closest('input, textarea, select');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y' && !typing) {
      e.preventDefault();
      redo();
      return;
    }
    if (typing || !sel) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      addChild(sel);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      addSibling(sel);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(sel);
    } else if (e.key === 'F2') {
      e.preventDefault();
      startEdit(sel);
    } else if (e.key === 'Escape') {
      setSel(null);
      setPanel(false);
    }
  };

  // ── desenho ──
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visIds = new Set(visible.map((n) => n.id));
  const edges = visible
    .filter((n) => n.parentId && visIds.has(n.parentId))
    .map((n) => {
      const p = byId.get(n.parentId!)!;
      const sa = sizes.current.get(p.id) ?? { w: NODE_W, h: NODE_H };
      const sb = sizes.current.get(n.id) ?? { w: NODE_W, h: NODE_H };
      const right = n.x + sb.w / 2 >= p.x + sa.w / 2;
      const x1 = right ? p.x + sa.w : p.x;
      const y1 = p.y + sa.h / 2;
      const x2 = right ? n.x : n.x + sb.w;
      const y2 = n.y + sb.h / 2;
      const dx = Math.max(28, Math.abs(x2 - x1) / 2) * (right ? 1 : -1);
      return { id: n.id, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, color: colorOf(n.color).line };
    });
  const selNode = sel ? byId.get(sel) : null;
  const selScreen = selNode && !editing
    ? { x: selNode.x * view.z + view.x, y: selNode.y * view.z + view.y, w: (sizes.current.get(selNode.id)?.w ?? NODE_W) * view.z }
    : null;
  const grid = 22 * view.z;

  if (!topic) return null;
  return (
    <div className={`cm ${panel && selNode ? 'has-panel' : ''}`} ref={wrap} style={{ height: height ?? 560 }} tabIndex={0} onKeyDown={onKeyDown}>
      <div
        className="cm-viewport"
        ref={vp}
        style={{ backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div className="cm-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          <svg className="cm-edges" aria-hidden="true">
            {edges.map((ed) => <path key={ed.id} d={ed.d} stroke={ed.color} />)}
          </svg>
          {visible.map((n) => {
            const c = colorOf(n.color);
            const kids = childrenOf(nodes, n.id).length;
            const isRoot = n.id === rootId;
            return (
              <div
                key={n.id}
                data-node={n.id}
                ref={(el) => {
                  if (el) els.current.set(n.id, el);
                  else els.current.delete(n.id);
                }}
                className={`cm-node ${isRoot ? 'is-root' : ''} ${sel === n.id ? 'is-sel' : ''}`}
                style={{ left: n.x, top: n.y, background: isRoot ? undefined : c.bg, borderColor: isRoot ? undefined : c.line }}
              >
                {editing === n.id ? (
                  <InlineTitle
                    initial={n.title}
                    onDone={(v) => finishEdit(n.id, v)}
                    onTab={(v) => {
                      finishEdit(n.id, v);
                      if (v.trim()) addChild(n.id);
                    }}
                  />
                ) : (
                  <span className={`cm-title ${n.title ? '' : 'is-empty'}`}>{n.title || 'Sem título'}</span>
                )}
                <NodeBadges n={n} />
                {kids > 0 && (
                  <button
                    type="button"
                    className={`cm-collapse ${n.collapsed ? 'is-closed' : ''}`}
                    onClick={() => patch(n.id, { collapsed: !n.collapsed })}
                    aria-label={n.collapsed ? `Mostrar ${kids} ramos` : 'Recolher ramos'}
                    title={n.collapsed ? `Mostrar ${kids} ramo${kids > 1 ? 's' : ''}` : 'Recolher'}
                  >
                    {n.collapsed ? kids : '−'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selScreen && selNode && (
          <div className="cm-ui cm-nodebar" style={{ left: selScreen.x + selScreen.w / 2, top: selScreen.y - 10 }}>
            <button type="button" onClick={() => addChild(selNode.id)} title="Novo ramo (Tab)"><Icon name="plus" size={14} /> Ramo</button>
            {selNode.parentId && <button type="button" onClick={() => addSibling(selNode.id)} title="Novo nó ao lado (Enter)"><Icon name="plus" size={14} /> Irmão</button>}
            <button type="button" onClick={() => startEdit(selNode.id)} title="Renomear (F2)"><Icon name="edit" size={14} /></button>
            <button type="button" onClick={() => setPanel(true)} title="Detalhes: notas, lista, links, imagens"><Icon name="note" size={14} /> Detalhes</button>
            {selNode.id !== rootId && <button type="button" onClick={() => remove(selNode.id)} title="Apagar (Delete)" aria-label="Apagar nó"><Icon name="trash" size={14} /></button>}
          </div>
        )}
      </div>

      <div className="cm-ui cm-toolbar">
        <button type="button" onClick={undo} disabled={!hist.past} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Icon name="restore" size={16} /></button>
        <button type="button" className="cm-redo" onClick={redo} disabled={!hist.future} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Icon name="restore" size={16} /></button>
        <span className="cm-sep" />
        <button type="button" onClick={() => zoomCenter(1 / 1.2)} aria-label="Diminuir zoom">−</button>
        <button type="button" className="cm-zoom" onClick={() => setView((v) => ({ ...v, z: 1 }))} title="Zoom 100%">{Math.round(view.z * 100)}%</button>
        <button type="button" onClick={() => zoomCenter(1.2)} aria-label="Aumentar zoom">+</button>
        <span className="cm-sep" />
        <button type="button" onClick={fit} title="Ver o mapa inteiro">Centralizar</button>
        <button type="button" onClick={() => { apply((ns) => tidy(ns, rootId, sizes.current)); needFit.current = 'all'; }} title="Organizar os ramos a partir do tema">Organizar</button>
      </div>
      <p className="cm-ui cm-hint">Duplo clique no fundo cria um nó · <kbd>Tab</kbd> ramo · <kbd>Enter</kbd> irmão · arraste para mover</p>

      {panel && selNode && (
        <NodePanel
          key={selNode.id}
          node={selNode}
          isRoot={selNode.id === rootId}
          nodes={nodes}
          onClose={() => setPanel(false)}
          onFocusField={() => pushHistory()}
          onChange={(p) => patch(selNode.id, p, false)}
          onChangeHistory={(p) => patch(selNode.id, p, true)}
          onRemove={() => remove(selNode.id)}
          onUpload={async (f) => {
            const r = await uploadImage(f);
            if ('id' in r) patch(selNode.id, { images: [...(nodesRef.current.find((n) => n.id === selNode.id)?.images ?? []), r.id] });
            else ui.toast(r.error, 'erro');
          }}
        />
      )}
    </div>
  );
}

function InlineTitle({ initial, onDone, onTab }: { initial: string; onDone: (v: string) => void; onTab: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const done = useRef(false);
  const finish = (fn: (v: string) => void) => {
    if (done.current) return;
    done.current = true;
    fn(v);
  };
  return (
    <textarea
      className="cm-input"
      value={v}
      autoFocus
      rows={1}
      placeholder="Escreva…"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        setV(e.target.value);
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
      }}
      onBlur={() => finish(onDone)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finish(onDone);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          finish(onTab);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(() => onDone(initial));
        }
      }}
      aria-label="Título do nó"
    />
  );
}

function NodeBadges({ n }: { n: MapNode }) {
  const b: string[] = [];
  if (n.explanation?.trim()) b.push('explicação');
  if (n.notes?.trim()) b.push('nota');
  if (n.list?.length) b.push(`lista ${n.list.length}`);
  if (n.links?.length) b.push(`${n.links.length} link${n.links.length > 1 ? 's' : ''}`);
  if (n.images?.length) b.push(`${n.images.length} imagem${n.images.length > 1 ? 'ns' : ''}`);
  if (!b.length) return null;
  return <span className="cm-badges">{b.join(' · ')}</span>;
}

function NodePanel({ node, isRoot, nodes, onClose, onFocusField, onChange, onChangeHistory, onRemove, onUpload }: {
  node: MapNode; isRoot: boolean; nodes: MapNode[]; onClose: () => void; onFocusField: () => void;
  onChange: (p: Partial<MapNode>) => void; onChangeHistory: (p: Partial<MapNode>) => void; onRemove: () => void; onUpload: (f: File) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [listText, setListText] = useState((node.list ?? []).join('\n'));
  const fileRef = useRef<HTMLInputElement>(null);
  const banned = useMemo(() => new Set([node.id, ...descendants(nodes, node.id)]), [nodes, node.id]);
  const parents = nodes.filter((n) => !banned.has(n.id));
  const links = node.links ?? [];
  const f = { onFocus: onFocusField };
  return (
    <aside className="cm-ui cm-panel" aria-label="Detalhes do nó">
      <div className="cm-panel-head">
        <strong>Detalhes do nó</strong>
        <button type="button" className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Fechar detalhes"><Icon name="close" size={16} /></button>
      </div>
      <label className="cm-f">
        <span>Título</span>
        <input value={node.title} onChange={(e) => onChange({ title: e.target.value })} {...f} />
      </label>
      <label className="cm-f">
        <span>Explicação</span>
        <textarea rows={4} value={node.explanation ?? ''} onChange={(e) => onChange({ explanation: e.target.value })} placeholder="Com as suas palavras" {...f} />
      </label>
      <label className="cm-f">
        <span>Lista <em>(um item por linha)</em></span>
        <textarea
          rows={3}
          value={listText}
          onChange={(e) => {
            setListText(e.target.value);
            onChange({ list: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) });
          }}
          {...f}
        />
      </label>
      <label className="cm-f">
        <span>Notas</span>
        <textarea rows={3} value={node.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Macetes, pegadinhas, dúvidas" {...f} />
      </label>
      <div className="cm-f">
        <span>Links</span>
        {links.map((l, i) => (
          <div key={i} className="cm-link">
            <input value={l.label} placeholder="Nome" aria-label="Nome do link" onChange={(e) => onChange({ links: links.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} {...f} />
            <input value={l.url} placeholder="https://" aria-label="Endereço do link" inputMode="url" onChange={(e) => onChange({ links: links.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)) })} {...f} />
            {/^https?:\/\//.test(l.url) && <a href={l.url} target="_blank" rel="noreferrer noopener" className="icon-btn icon-btn-sm" aria-label="Abrir link"><Icon name="eye" size={14} /></a>}
            <button type="button" className="icon-btn icon-btn-sm" onClick={() => onChangeHistory({ links: links.filter((_, k) => k !== i) })} aria-label="Remover link"><Icon name="close" size={14} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChangeHistory({ links: [...links, { label: '', url: '' }] })}><Icon name="plus" size={14} /> Link</button>
      </div>
      <div className="cm-f">
        <span>Imagens</span>
        {!!node.images?.length && (
          <div className="cm-imgs">
            {node.images.map((id) => (
              <div key={id} className="cm-img">
                <AssetImg id={id} alt="" loading="lazy" />
                <button type="button" className="icon-btn icon-btn-sm" onClick={() => onChangeHistory({ images: node.images!.filter((x) => x !== id) })} aria-label="Remover imagem"><Icon name="close" size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="upload" size={14} /> {busy ? 'Enviando…' : 'Imagem'}</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBusy(true);
            await onUpload(file);
            setBusy(false);
          }}
        />
      </div>
      <div className="cm-f">
        <span>Cor</span>
        <div className="cm-colors" role="radiogroup" aria-label="Cor do nó">
          {MAP_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={(node.color ?? 'neutro') === c.id}
              aria-label={c.label}
              className={`cm-swatch ${(node.color ?? 'neutro') === c.id ? 'is-on' : ''}`}
              style={{ background: c.bg, borderColor: c.line }}
              onClick={() => onChangeHistory({ color: c.id as MapColor })}
            />
          ))}
        </div>
      </div>
      {!isRoot && (
        <label className="cm-f">
          <span>Ligado a</span>
          <select value={node.parentId ?? ''} onChange={(e) => onChangeHistory({ parentId: e.target.value || null })}>
            <option value="">Nó solto</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.title || 'Sem título'}</option>)}
          </select>
        </label>
      )}
      {!isRoot && (
        <button type="button" className="btn btn-quiet btn-sm cm-del" onClick={onRemove}><Icon name="trash" size={14} /> Apagar nó e ramos</button>
      )}
    </aside>
  );
}
