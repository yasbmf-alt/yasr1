// Camada de persistência. Três implementações com a mesma interface:
//  • DbRepo     – banco do próprio app (sincroniza entre desktop e celular)
//  • LocalRepo  – reserva, só neste navegador, quando o banco não está disponível
//  • MemoryRepo – modo demonstração, nada é salvo
import type { Collection, DataSnapshot, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export type RepoMode = 'db' | 'local' | 'demo';
type Listener = (snap: DataSnapshot, ready: boolean) => void;
type Doc = { id: string } & Record<string, unknown>;

export interface Repo {
  mode: RepoMode;
  subscribe(fn: Listener): () => void;
  put(col: Collection, doc: Doc): void;
  remove(col: Collection, id: string): void;
  replaceAll(data: DataSnapshot): Promise<void>;
  onError?: (msg: string) => void;
}

const COLS: Collection[] = ['chapters', 'missions', 'topics', 'sessions', 'meta', 'notes', 'events', 'simulados', 'decks', 'cards', 'errnotes', 'macetes', 'letters', 'vouchers'];

function emptyCache(): Record<Collection, Map<string, Doc>> {
  return {
    chapters: new Map(), missions: new Map(), topics: new Map(), sessions: new Map(), meta: new Map(),
    notes: new Map(), events: new Map(), simulados: new Map(), decks: new Map(), cards: new Map(),
    errnotes: new Map(), macetes: new Map(), letters: new Map(), vouchers: new Map(),
  };
}

function toSnapshot(cache: Record<Collection, Map<string, Doc>>): DataSnapshot {
  const list = <T,>(c: Collection) => [...cache[c].values()] as unknown as T[];
  const s = cache.meta.get('settings') as Partial<Settings> | undefined;
  return {
    chapters: list('chapters'),
    missions: list('missions'),
    topics: list('topics'),
    sessions: list('sessions'),
    notes: list('notes'),
    events: list('events'),
    simulados: list('simulados'),
    decks: list('decks'),
    cards: list('cards'),
    errnotes: list('errnotes'),
    macetes: list('macetes'),
    letters: list('letters'),
    vouchers: list('vouchers'),
    settings: { ...DEFAULT_SETTINGS, ...(s ?? {}), id: 'settings' },
  };
}

export function snapshotToDocs(data: DataSnapshot): { col: Collection; doc: Doc }[] {
  const out: { col: Collection; doc: Doc }[] = [];
  for (const c of data.chapters) out.push({ col: 'chapters', doc: { ...c } });
  for (const m of data.missions) out.push({ col: 'missions', doc: { ...m } as unknown as Doc });
  for (const t of data.topics) out.push({ col: 'topics', doc: { ...t } as unknown as Doc });
  for (const s of data.sessions) out.push({ col: 'sessions', doc: { ...s } as unknown as Doc });
  const extra: [Collection, { id: string }[] | undefined][] = [
    ['notes', data.notes], ['events', data.events], ['simulados', data.simulados], ['decks', data.decks], ['cards', data.cards],
    ['errnotes', data.errnotes], ['macetes', data.macetes], ['letters', data.letters], ['vouchers', data.vouchers],
  ];
  for (const [col, arr] of extra) for (const d of arr ?? []) out.push({ col, doc: { ...d } as unknown as Doc });
  out.push({ col: 'meta', doc: { ...data.settings } as unknown as Doc });
  return out;
}

// ── Banco (claude db) ──────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
class DbRepo implements Repo {
  mode: RepoMode = 'db';
  onError?: (msg: string) => void;
  private cache = emptyCache();
  private pending = new Map<string, Doc | null>(); // path → doc (null = apagar)
  private queue = new Map<string, { running: boolean; next: (() => Promise<void>) | null }>();
  private loaded = new Set<Collection>();
  private listeners = new Set<Listener>();
  private unsubs: (() => void)[] = [];

  constructor(private db: any) {}

  private view(): DataSnapshot {
    if (!this.pending.size) return toSnapshot(this.cache);
    const merged = emptyCache();
    for (const c of COLS) merged[c] = new Map(this.cache[c]);
    for (const [path, doc] of this.pending) {
      const [col, id] = path.split('/') as [Collection, string];
      if (doc) merged[col].set(id, doc);
      else merged[col].delete(id);
    }
    return toSnapshot(merged);
  }

  private emit() {
    const snap = this.view();
    const ready = this.loaded.size === COLS.length;
    this.listeners.forEach((l) => l(snap, ready));
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    if (!this.unsubs.length) {
      for (const col of COLS) {
        const un = this.db.collection(col).onSnapshot(
          (snap: any) => {
            const m = new Map<string, Doc>();
            for (const d of snap.docs) m.set(d.id, { ...(d.data() as object), id: d.id } as Doc);
            this.cache[col] = m;
            this.loaded.add(col);
            this.emit();
          },
          (e: any) => {
            this.loaded.add(col);
            this.onError?.(e?.code === 'revoked' ? 'O acesso ao banco foi encerrado nesta janela. Recarregue a página.' : 'Não consegui ler seus dados agora. Recarregue a página.');
            this.emit();
          },
        );
        this.unsubs.push(un);
      }
    } else {
      fn(this.view(), this.loaded.size === COLS.length);
    }
    return () => {
      this.listeners.delete(fn);
    };
  }

  private enqueue(path: string, run: () => Promise<void>) {
    const q = this.queue.get(path) ?? { running: false, next: null };
    q.next = run;
    this.queue.set(path, q);
    if (!q.running) void this.drain(path);
  }

  private async drain(path: string) {
    const q = this.queue.get(path)!;
    q.running = true;
    while (q.next) {
      const run = q.next;
      q.next = null;
      try {
        await run();
      } catch (e: any) {
        if (e?.code === 'unavailable') {
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
          try {
            await run();
          } catch {
            this.onError?.('Não consegui salvar agora. Confira sua conexão e tente de novo.');
          }
        } else if (e?.code === 'quota_exceeded') {
          this.onError?.('O banco do app chegou ao limite de espaço. Exporte um backup e apague registros antigos.');
        } else {
          this.onError?.('Não consegui salvar essa alteração.');
        }
      }
    }
    q.running = false;
    if (!q.next) {
      this.pending.delete(path);
      this.emit();
    }
  }

  put(col: Collection, doc: Doc) {
    const path = `${col}/${doc.id}`;
    const body = JSON.parse(JSON.stringify(doc));
    this.pending.set(path, body);
    this.emit();
    this.enqueue(path, () => this.db.doc(path).set(body));
  }

  remove(col: Collection, id: string) {
    const path = `${col}/${id}`;
    this.pending.set(path, null);
    this.emit();
    this.enqueue(path, () => this.db.doc(path).delete());
  }

  async replaceAll(data: DataSnapshot) {
    const wanted = snapshotToDocs(data);
    const keep = new Set(wanted.map((w) => `${w.col}/${w.doc.id}`));
    for (const col of COLS)
      for (const id of this.cache[col].keys()) if (!keep.has(`${col}/${id}`)) await this.db.doc(`${col}/${id}`).delete();
    for (const w of wanted) await this.db.doc(`${w.col}/${w.doc.id}`).set(JSON.parse(JSON.stringify(w.doc)));
  }
}

// ── Navegador / memória ───────────────────────────────────────

class LocalRepo implements Repo {
  onError?: (msg: string) => void;
  private cache = emptyCache();
  private listeners = new Set<Listener>();

  constructor(public mode: RepoMode, initial?: DataSnapshot, private key = 'yasr1-data') {
    let data = initial;
    if (!data && mode === 'local') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) data = JSON.parse(raw);
      } catch {
        /* sem armazenamento */
      }
    }
    if (data) for (const { col, doc } of snapshotToDocs(data)) this.cache[col].set(doc.id, doc);
  }

  private emit() {
    const snap = toSnapshot(this.cache);
    if (this.mode === 'local') {
      try {
        localStorage.setItem(this.key, JSON.stringify(snap));
      } catch {
        this.onError?.('Não consegui salvar neste navegador.');
      }
    }
    this.listeners.forEach((l) => l(snap, true));
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(toSnapshot(this.cache), true);
    return () => {
      this.listeners.delete(fn);
    };
  }

  put(col: Collection, doc: Doc) {
    this.cache[col].set(doc.id, JSON.parse(JSON.stringify(doc)));
    this.emit();
  }

  remove(col: Collection, id: string) {
    this.cache[col].delete(id);
    this.emit();
  }

  async replaceAll(data: DataSnapshot) {
    this.cache = emptyCache();
    for (const { col, doc } of snapshotToDocs(data)) this.cache[col].set(doc.id, doc);
    this.emit();
  }
}

export const DEMO_FLAG = 'yasr1-demo';

export function isDemoOn() {
  try {
    return localStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

export function setDemo(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_FLAG, '1');
    else localStorage.removeItem(DEMO_FLAG);
  } catch {
    /* ignore */
  }
}

export async function useCapability<T = any>(name: string): Promise<T | null> {
  const c = (window as any).claude;
  if (!c?.use) return null;
  try {
    return (await c.use(name)) as T | null;
  } catch {
    return null;
  }
}

export async function createRepo(demo: () => DataSnapshot): Promise<Repo> {
  if (isDemoOn()) return new LocalRepo('demo', demo());
  const db = await useCapability('db');
  if (db) return new DbRepo(db);
  return new LocalRepo('local');
}
