import { useMemo } from 'react';
import { useStore } from '../data/store';
import { uid } from '../logic/dates';
import { CFG_ID, DEFAULT_CFG, type DocOf, type YlCfg, type YlDoc, type YlKind } from './types';

/** acesso aos registros da Yasland (por tipo), já ordenados do mais novo para o mais antigo quando há data */
export function useYl() {
  const { data, saveYl, deleteYl } = useStore();
  const all = data.yasland ?? [];
  const byKind = useMemo(() => {
    const m = new Map<YlKind, YlDoc[]>();
    for (const d of all) m.set(d.kind, [...(m.get(d.kind) ?? []), d]);
    return m;
  }, [all]);
  const cfgDoc = byKind.get('cfg')?.[0] as YlCfg | undefined;
  const cfg: YlCfg = { ...DEFAULT_CFG, ...(cfgDoc ?? {}), id: CFG_ID, kind: 'cfg' };
  return {
    all,
    of: <K extends YlKind>(k: K) => (byKind.get(k) ?? []) as DocOf<K>[],
    save: (d: YlDoc) => saveYl(d),
    del: (id: string) => deleteYl(id),
    cfg,
    setCfg: (p: Partial<YlCfg>) => saveYl({ ...cfg, ...p, createdAt: cfg.createdAt || new Date().toISOString() }),
  };
}

export const ylId = (k: YlKind) => `yl:${k}:${uid()}`;
export const nowIso = () => new Date().toISOString();
