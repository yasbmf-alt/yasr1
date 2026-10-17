// Backup: exportar, conferir e restaurar sem apagar nada por acidente.
// Formato: { app: 'yas-r1', version, exportedAt, counts, data, files? }
// "files" leva imagens e sons como texto (data URL), para o backup completo.
import type { DataSnapshot, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { resolveAssetUrl, uploadFile } from '../platform/platform';

export const BACKUP_VERSION = 2;

const LISTS = ['chapters', 'missions', 'topics', 'sessions', 'notes', 'events', 'simulados', 'decks', 'cards', 'errnotes', 'macetes', 'letters', 'vouchers'] as const;
type ListKey = (typeof LISTS)[number];

export const LIST_LABEL: Record<ListKey, string> = {
  chapters: 'Capítulos', missions: 'Missões', topics: 'Temas', sessions: 'Registros de estudo', notes: 'Post-its',
  events: 'Agenda', simulados: 'Simulados', decks: 'Baralhos', cards: 'Flashcards', errnotes: 'Notas da gaveta',
  macetes: 'Macetes', letters: 'Cartinhas', vouchers: 'Vales de mimos',
};

export interface BackupFile {
  type: string;
  size: number;
  data: string; // data URL
}

export interface BackupJSON {
  app: 'yas-r1';
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: DataSnapshot;
  files?: Record<string, BackupFile>;
}

export const countsOf = (d: DataSnapshot) => Object.fromEntries(LISTS.map((k) => [k, (d[k] as unknown[] | undefined)?.length ?? 0])) as Record<ListKey, number>;

/** todos os arquivos (imagens, sons) que os dados usam */
export function assetIdsOf(d: DataSnapshot): string[] {
  const s = d.settings;
  const ids = new Set<string>();
  Object.values(s.assetMap ?? {}).forEach((x) => x && ids.add(x));
  (s.rewardImages ?? []).forEach((x) => x.assetId && ids.add(x.assetId));
  Object.values(s.soundAssets ?? {}).forEach((x) => x && ids.add(x));
  d.topics.forEach((t) => t.coverAssetId && ids.add(t.coverAssetId));
  d.missions.forEach((m) => m.coverAssetId && ids.add(m.coverAssetId));
  return [...ids];
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

export async function buildBackup(d: DataSnapshot, withFiles: boolean, onProgress?: (done: number, total: number) => void): Promise<{ json: BackupJSON; missing: string[] }> {
  const json: BackupJSON = { app: 'yas-r1', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), counts: countsOf(d), data: d };
  const missing: string[] = [];
  if (withFiles) {
    const ids = assetIdsOf(d);
    json.files = {};
    let done = 0;
    for (const id of ids) {
      try {
        const url = await resolveAssetUrl(id);
        if (!url) throw new Error('sem endereço');
        const r = await fetch(url);
        if (!r.ok) throw new Error(String(r.status));
        const b = await r.blob();
        json.files[id] = { type: b.type, size: b.size, data: await blobToDataUrl(b) };
      } catch {
        missing.push(id);
      }
      onProgress?.(++done, ids.length);
    }
  }
  return { json, missing };
}

export interface Checked {
  ok: boolean;
  data?: DataSnapshot;
  files?: Record<string, BackupFile>;
  exportedAt?: string;
  counts?: Record<ListKey, number>;
  problems: string[]; // impedem a restauração
  warnings: string[]; // não impedem
}

/** confere o arquivo antes de qualquer restauração */
export function checkBackup(raw: unknown): Checked {
  const problems: string[] = [];
  const warnings: string[] = [];
  const o = raw as Partial<BackupJSON> & Record<string, unknown>;
  if (!o || typeof o !== 'object') return { ok: false, problems: ['O arquivo não é um JSON de backup.'], warnings };
  const d = (o.data ?? o) as Partial<DataSnapshot> & Record<string, unknown>;
  if (o.app && o.app !== 'yas-r1') problems.push('Esse backup é de outro aplicativo.');
  if ((o.version ?? 1) > BACKUP_VERSION) warnings.push('Backup feito numa versão mais nova do Yas R1; campos desconhecidos serão mantidos como estão.');
  for (const k of ['chapters', 'missions', 'topics', 'sessions'] as const) if (!Array.isArray(d[k])) problems.push(`Faltam os ${LIST_LABEL[k].toLowerCase()}.`);
  for (const k of LISTS) {
    const arr = d[k];
    if (arr == null) continue;
    if (!Array.isArray(arr)) {
      problems.push(`${LIST_LABEL[k]} não estão no formato certo.`);
      continue;
    }
    const seen = new Set<string>();
    arr.forEach((x: unknown, i: number) => {
      const id = (x as { id?: unknown })?.id;
      if (typeof id !== 'string' || !id) problems.push(`${LIST_LABEL[k]}: item ${i + 1} sem identificador.`);
      else if (seen.has(id)) warnings.push(`${LIST_LABEL[k]}: item repetido (${id}); fica só um.`);
      else seen.add(id);
    });
  }
  if (d.settings != null && typeof d.settings !== 'object') problems.push('As configurações não estão no formato certo.');
  if (problems.length) return { ok: false, problems: problems.slice(0, 8), warnings };

  const norm: DataSnapshot = {
    chapters: dedupe(d.chapters as DataSnapshot['chapters']),
    missions: dedupe(d.missions as DataSnapshot['missions']),
    topics: dedupe(d.topics as DataSnapshot['topics']),
    sessions: dedupe(d.sessions as DataSnapshot['sessions']),
    notes: dedupe((d.notes ?? []) as DataSnapshot['notes']),
    events: dedupe((d.events ?? []) as DataSnapshot['events']),
    simulados: dedupe((d.simulados ?? []) as DataSnapshot['simulados']),
    decks: dedupe((d.decks ?? []) as DataSnapshot['decks']),
    cards: dedupe((d.cards ?? []) as DataSnapshot['cards']),
    errnotes: dedupe((d.errnotes ?? []) as DataSnapshot['errnotes']),
    macetes: dedupe((d.macetes ?? []) as DataSnapshot['macetes']),
    letters: dedupe((d.letters ?? []) as DataSnapshot['letters']),
    vouchers: dedupe((d.vouchers ?? []) as DataSnapshot['vouchers']),
    settings: { ...DEFAULT_SETTINGS, ...((d.settings as Partial<Settings>) ?? {}), id: 'settings' },
  };
  const chapterIds = new Set(norm.chapters.map((c) => c.id));
  const orphanM = norm.missions.filter((m) => !chapterIds.has(m.chapterId)).length;
  if (orphanM) warnings.push(`${orphanM} missão(ões) apontam para um capítulo que não está no backup.`);
  const topicIds = new Set(norm.topics.map((t) => t.id));
  const orphanS = norm.sessions.filter((s) => s.topicId && !topicIds.has(s.topicId)).length;
  if (orphanS) warnings.push(`${orphanS} registro(s) apontam para um tema que não está no backup.`);
  const files = o.files && typeof o.files === 'object' ? (o.files as Record<string, BackupFile>) : undefined;
  const needed = assetIdsOf(norm);
  if (needed.length && !files) warnings.push(`O backup usa ${needed.length} arquivo(s) seus (imagens/sons), mas não traz os arquivos. Se for restaurar em outro lugar, use o backup completo.`);
  return { ok: true, data: norm, files, exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : undefined, counts: countsOf(norm), problems, warnings };
}

function dedupe<T extends { id: string }>(arr: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return [...m.values()];
}

/** juntar: mantém tudo o que existe e só acrescenta o que falta */
export function mergeSnapshots(cur: DataSnapshot, inc: DataSnapshot): DataSnapshot {
  const out = { ...cur } as DataSnapshot;
  for (const k of LISTS) {
    const have = new Set(((cur[k] as { id: string }[]) ?? []).map((x) => x.id));
    (out[k] as unknown) = [...((cur[k] as { id: string }[]) ?? []), ...((inc[k] as { id: string }[]) ?? []).filter((x) => !have.has(x.id))];
  }
  const cs = cur.settings;
  const is = inc.settings;
  out.settings = {
    ...cs,
    assetMap: { ...(is.assetMap ?? {}), ...(cs.assetMap ?? {}) },
    soundAssets: { ...(is.soundAssets ?? {}), ...(cs.soundAssets ?? {}) },
    rewardImages: [...(cs.rewardImages ?? []), ...(is.rewardImages ?? []).filter((x) => !(cs.rewardImages ?? []).some((y) => y.id === x.id))],
    eggsFound: { ...(is.eggsFound ?? {}), ...(cs.eggsFound ?? {}) },
  };
  return out;
}

/** troca ids de arquivos antigos pelos novos (depois de reenviar os arquivos) */
export function remapAssets(d: DataSnapshot, map: Record<string, string>): DataSnapshot {
  if (!Object.keys(map).length) return d;
  const r = (x: string | null | undefined) => (x && map[x] ? map[x] : x ?? null);
  const s = d.settings;
  return {
    ...d,
    topics: d.topics.map((t) => ({ ...t, coverAssetId: r(t.coverAssetId) })),
    missions: d.missions.map((m) => ({ ...m, coverAssetId: r(m.coverAssetId) })),
    settings: {
      ...s,
      assetMap: Object.fromEntries(Object.entries(s.assetMap ?? {}).map(([k, v]) => [k, r(v) as string])),
      soundAssets: Object.fromEntries(Object.entries(s.soundAssets ?? {}).map(([k, v]) => [k, r(v) as string])),
      rewardImages: (s.rewardImages ?? []).map((x) => ({ ...x, assetId: r(x.assetId) as string })),
    },
  };
}

const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();

/** reenvia os arquivos do backup que ainda não existem aqui; devolve o mapa de ids */
export async function restoreFiles(files: Record<string, BackupFile>, onProgress?: (done: number, total: number) => void): Promise<{ map: Record<string, string>; failed: number }> {
  const map: Record<string, string> = {};
  let failed = 0;
  const entries = Object.entries(files);
  let done = 0;
  for (const [id, f] of entries) {
    // se o arquivo já existe neste lugar (mesmo id), não reenvia
    const url = await resolveAssetUrl(id).catch(() => null);
    const exists = url ? await fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false) : false;
    if (!exists) {
      const blob = await dataUrlToBlob(f.data);
      const kind = f.type.startsWith('image/') ? 'image' : 'audio';
      const res = await uploadFile(blob, kind, `arquivo.${(f.type.split('/')[1] ?? 'bin').replace('svg+xml', 'svg')}`);
      if ('id' in res) map[id] = res.id;
      else failed++;
    }
    onProgress?.(++done, entries.length);
  }
  return { map, failed };
}

// ── Cópia de segurança antes de restaurar (neste navegador) ──
const PRE_KEY = 'yasr1-antes-da-importacao';
export function keepPreRestore(d: DataSnapshot) {
  try {
    localStorage.setItem(PRE_KEY, JSON.stringify({ at: new Date().toISOString(), data: d }));
    return true;
  } catch {
    return false;
  }
}
export function readPreRestore(): { at: string; data: DataSnapshot } | null {
  try {
    const raw = localStorage.getItem(PRE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearPreRestore() {
  try {
    localStorage.removeItem(PRE_KEY);
  } catch {
    /* ignore */
  }
}
