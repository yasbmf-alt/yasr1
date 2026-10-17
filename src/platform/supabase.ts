// Versão hospedada: login, banco e arquivos no Supabase.
// Só a chave pública (anon) fica no navegador; quem protege os dados são as
// políticas de acesso (RLS) do banco: cada linha pertence a um usuário.
import { createClient, type RealtimeChannel, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Collection, DataSnapshot } from '../types';
import { COLS, emptyCache, snapshotToDocs, toSnapshot, type Doc, type Listener, type Repo, type RepoMode } from '../data/repo';
import { SUPABASE_KEY, SUPABASE_URL, type UploadResult } from './platform';

/* eslint-disable @typescript-eslint/no-explicit-any */
const TABLE = 'yas_docs';
const BUCKET = 'yas-assets';

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  return (client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'yasr1-auth' },
  }));
}

// ── Conta ────────────────────────────────────────────────────

export async function currentSession(): Promise<Session | null> {
  const { data } = await sb().auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(fn: (s: Session | null) => void) {
  const { data } = sb().auth.onAuthStateChange((_e, s) => fn(s));
  return () => data.subscription.unsubscribe();
}

const AUTH_MSG: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha não conferem.',
  email_not_confirmed: 'Confirme seu e-mail pelo link que chegou na caixa de entrada.',
  over_email_send_rate_limit: 'Muitos e-mails em pouco tempo. Espere alguns minutos.',
  user_already_exists: 'Esse e-mail já tem conta. Use “Entrar”.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres.',
  signup_disabled: 'Novos cadastros estão desligados neste Yas R1.',
};
const authError = (e: any) => AUTH_MSG[e?.code] ?? (e?.message?.includes('fetch') ? 'Sem conexão com o servidor. Confira sua internet.' : 'Não deu certo. Tente de novo.');

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await sb().auth.signInWithPassword({ email, password });
  return error ? authError(error) : null;
}
export async function signUp(email: string, password: string): Promise<string | null> {
  const { error, data } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
  if (error) return authError(error);
  return data.session ? null : 'confirm';
}
export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/#nova-senha` });
  return error ? authError(error) : null;
}
export async function updatePassword(password: string): Promise<string | null> {
  const { error } = await sb().auth.updateUser({ password });
  return error ? authError(error) : null;
}
export async function signOut() {
  await sb().auth.signOut();
}

// ── Repositório sincronizado ─────────────────────────────────
// • lê tudo do banco ao entrar e escuta mudanças (outro aparelho)
// • cada gravação vai para uma "caixa de saída" guardada no navegador;
//   se a internet cair, nada se perde: ela é enviada quando voltar
// • uma cópia da última leitura fica no navegador para abrir sem internet

type Outbox = Record<string, Doc | null>; // "col/id" → doc (null = apagar)

export class CloudRepo implements Repo {
  mode: RepoMode = 'cloud';
  onError?: (msg: string) => void;
  onPending?: (n: number) => void;
  private cache = emptyCache();
  private outbox: Outbox;
  private listeners = new Set<Listener>();
  private ready = false;
  private flushing = false;
  private channel: RealtimeChannel | null = null;
  private retry = 0;

  constructor(private uid: string) {
    this.outbox = this.readJSON<Outbox>(`yasr1-outbox-${uid}`) ?? {};
    const cached = this.readJSON<DataSnapshot>(`yasr1-cache-${uid}`);
    if (cached) for (const { col, doc } of snapshotToDocs(cached)) this.cache[col].set(doc.id, doc);
    window.addEventListener('online', () => void this.flush());
  }

  private readJSON<T>(k: string): T | null {
    try {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  private writeJSON(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* navegador sem espaço: segue só na memória */
    }
  }

  private view(): DataSnapshot {
    const merged = emptyCache();
    for (const c of COLS) merged[c] = new Map(this.cache[c]);
    for (const [path, doc] of Object.entries(this.outbox)) {
      const [col, id] = path.split('/') as [Collection, string];
      if (!merged[col]) continue;
      if (doc) merged[col].set(id, doc);
      else merged[col].delete(id);
    }
    return toSnapshot(merged);
  }

  private emit() {
    this.onPending?.(Object.keys(this.outbox).length);
    const snap = this.view();
    this.listeners.forEach((l) => l(snap, this.ready));
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.view(), this.ready);
    if (this.listeners.size === 1) void this.load();
    return () => {
      this.listeners.delete(fn);
    };
  }

  private async load() {
    // se houver cópia local, o app já abre com ela enquanto busca o banco
    if (Object.values(this.cache).some((m) => m.size)) {
      this.ready = true;
      this.emit();
    }
    try {
      const fresh = emptyCache();
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb().from(TABLE).select('col,id,data').order('col').order('id').range(from, from + PAGE - 1);
        if (error) throw error;
        for (const r of data ?? []) if (fresh[r.col as Collection]) fresh[r.col as Collection].set(r.id, { ...(r.data as object), id: r.id } as Doc);
        if (!data || data.length < PAGE) break;
      }
      this.cache = fresh;
      this.ready = true;
      this.writeJSON(`yasr1-cache-${this.uid}`, toSnapshot(fresh));
      this.emit();
      this.listen();
      void this.flush();
    } catch (e: any) {
      this.ready = true;
      this.emit();
      this.onError?.(navigator.onLine ? 'Não consegui ler seus dados do banco agora. Mostrando a última cópia salva neste aparelho.' : 'Você está sem internet. Mostrando a última cópia salva neste aparelho; o que mudar agora será enviado quando a conexão voltar.');
      setTimeout(() => void this.load(), 15000);
      void e;
    }
  }

  private listen() {
    if (this.channel) return;
    this.channel = sb()
      .channel(`yas-${this.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${this.uid}` }, (p: any) => {
        const row = (p.new && Object.keys(p.new).length ? p.new : p.old) as { col: Collection; id: string; data?: object };
        if (!row?.col || !this.cache[row.col]) return;
        if (p.eventType === 'DELETE') this.cache[row.col].delete(row.id);
        else this.cache[row.col].set(row.id, { ...(row.data ?? {}), id: row.id } as Doc);
        this.writeJSON(`yasr1-cache-${this.uid}`, toSnapshot(this.cache));
        this.emit();
      })
      .subscribe();
  }

  private queue(path: string, doc: Doc | null) {
    this.outbox[path] = doc;
    this.writeJSON(`yasr1-outbox-${this.uid}`, this.outbox);
    this.emit();
    void this.flush();
  }

  private async flush() {
    if (this.flushing || !navigator.onLine) return;
    this.flushing = true;
    try {
      while (Object.keys(this.outbox).length) {
        const entries = Object.entries(this.outbox).slice(0, 200);
        const ups = entries.filter(([, d]) => d).map(([path, d]) => {
          const [col, id] = path.split('/');
          return { user_id: this.uid, col, id, data: d, updated_at: new Date().toISOString() };
        });
        const dels = entries.filter(([, d]) => !d).map(([path]) => path.split('/') as [string, string]);
        if (ups.length) {
          const { error } = await sb().from(TABLE).upsert(ups, { onConflict: 'user_id,col,id' });
          if (error) throw error;
        }
        for (const [col, id] of dels) {
          const { error } = await sb().from(TABLE).delete().match({ col, id });
          if (error) throw error;
        }
        for (const [path, d] of entries) {
          if (this.outbox[path] !== d) continue; // mudou de novo enquanto enviava
          const [col, id] = path.split('/') as [Collection, string];
          if (d) this.cache[col].set(id, d);
          else this.cache[col].delete(id);
          delete this.outbox[path];
        }
        this.writeJSON(`yasr1-outbox-${this.uid}`, this.outbox);
        this.writeJSON(`yasr1-cache-${this.uid}`, toSnapshot(this.cache));
      }
      this.retry = 0;
    } catch (e: any) {
      this.retry++;
      const auth = e?.code === 'PGRST301' || e?.status === 401 || /JWT/i.test(e?.message ?? '');
      if (auth) this.onError?.('Sua sessão expirou. Entre de novo; nada do que você fez foi perdido.');
      else if (this.retry === 2) this.onError?.('Não consegui salvar no banco agora. Suas alterações estão guardadas neste aparelho e serão enviadas assim que der.');
      setTimeout(() => void this.flush(), Math.min(60000, 2000 * 2 ** this.retry));
    } finally {
      this.flushing = false;
      this.emit();
    }
  }

  put(col: Collection, doc: Doc) {
    this.queue(`${col}/${doc.id}`, JSON.parse(JSON.stringify(doc)));
  }

  remove(col: Collection, id: string) {
    this.queue(`${col}/${id}`, null);
  }

  async replaceAll(data: DataSnapshot) {
    const wanted = snapshotToDocs(data);
    const keep = new Set(wanted.map((w) => `${w.col}/${w.doc.id}`));
    const view = this.view();
    for (const { col, doc } of snapshotToDocs(view)) if (!keep.has(`${col}/${doc.id}`)) this.outbox[`${col}/${doc.id}`] = null;
    for (const w of wanted) this.outbox[`${w.col}/${w.doc.id}`] = JSON.parse(JSON.stringify(w.doc));
    this.writeJSON(`yasr1-outbox-${this.uid}`, this.outbox);
    this.emit();
    await this.flush();
    if (Object.keys(this.outbox).length) throw new Error('pendente');
  }
}

export async function createCloudRepo(): Promise<Repo | null> {
  const s = await currentSession();
  if (!s) return null;
  return new CloudRepo(s.user.id);
}

// ── Arquivos ─────────────────────────────────────────────────

const extOf = (f: Blob, name: string) => {
  const m = name.match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase();
  const t = f.type.split('/')[1] ?? 'bin';
  return t.replace('svg+xml', 'svg').replace('mpeg', 'mp3');
};

export async function uploadToStorage(file: Blob, kind: 'image' | 'audio', name: string): Promise<UploadResult> {
  const s = await currentSession();
  if (!s) return { error: 'Entre na sua conta para enviar arquivos.' };
  if (file.size > 20 * 1024 * 1024) return { error: 'Arquivo grande demais (até 20 MB).' };
  const id = crypto.randomUUID();
  const path = `${s.user.id}/${kind}/${id}.${extOf(file, name)}`;
  const { error } = await sb().storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false, cacheControl: '31536000' });
  if (error) return { error: /fetch/i.test(error.message) ? 'Sem conexão. Tente de novo quando a internet voltar.' : 'Não consegui enviar esse arquivo.' };
  return { id: `sb:${path}` };
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data, error } = await sb().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}

/** quantos documentos de cada tipo estão de fato no banco (para conferir) */
export async function serverCounts(cols: readonly string[]): Promise<Record<string, number> | null> {
  try {
    const out: Record<string, number> = {};
    for (const c of cols) {
      const { count, error } = await sb().from(TABLE).select('id', { count: 'exact', head: true }).eq('col', c);
      if (error) throw error;
      out[c] = count ?? 0;
    }
    return out;
  } catch {
    return null;
  }
}

export async function accountEmail(): Promise<string | null> {
  return (await currentSession())?.user.email ?? null;
}
