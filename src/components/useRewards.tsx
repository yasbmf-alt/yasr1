import { useEffect, useRef } from 'react';
import { useStore, type CompletionResult } from '../data/store';
import { useUI } from './ui';
import type { Chapter, Mission } from '../types';
import { pickRewardImage, rollMimo } from '../logic/rewards';
import { earned, recentPair } from '../logic/achievements';
import { today } from '../logic/dates';
import { play } from '../logic/sound';

/** Recompensas de conclusão: pop-up de imagem, celebração e vales de mimo. */
export function useRewards() {
  const store = useStore();
  const ui = useUI();
  return {
    afterCompletion(r: CompletionResult, m: Mission, chapter: Chapter | null) {
      const d = store.snapshot();
      if (r.chapterCompleted && chapter) {
        const img = pickRewardImage(d.settings.rewardImages);
        if (img) ui.enqueue({ kind: 'image', assetId: img.assetId });
        else ui.celebrate({ kind: 'chapter', title: `${chapter.title} concluída`, extras: ['Uma flor rara nasceu no seu jardim'] });
        const v = rollMimo(d, chapter.title);
        if (v) {
          store.saveVoucher(v);
          ui.enqueue({ kind: 'voucher', voucherId: v.id });
        }
        return;
      }
      if (r.missionCompleted) {
        const pair = recentPair(d, today());
        const img = pair.length >= 2 ? pickRewardImage(d.settings.rewardImages) : null;
        if (img) {
          store.saveSettings({ rewardUsedMissions: [...(d.settings.rewardUsedMissions ?? []), ...pair] });
          ui.enqueue({ kind: 'image', assetId: img.assetId });
        } else {
          ui.celebrate({
            kind: 'mission',
            title: m.label,
            extras: [...(r.firstBook ? ['Livro novo na biblioteca'] : []), 'Sua planta cresceu um pouquinho'],
          });
        }
        return;
      }
      ui.activityDone();
    },
  };
}

const SEEN = 'yasr1-ach-seen';

/** Observa conquistas novas e cartas que chegaram, sem nenhuma ação da usuária. */
let quietUntil = 0;
/** chamado antes de restaurar um backup: nada de sorteios por causa da importação */
export const quietRewards = (ms = 15000) => {
  quietUntil = Date.now() + ms;
};

export function RewardWatcher() {
  const store = useStore();
  const ui = useUI();
  const { data, ready, mode } = store;
  const first = useRef(true);
  const delivered = useRef(new Set<string>());

  useEffect(() => {
    if (!ready || mode === 'loading') return;
    const ach = earned(data);
    const ids = ach.map((a) => a.id);
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(`${SEEN}-${mode}`);
      seen = raw ? JSON.parse(raw) : null;
    } catch {
      seen = null;
    }
    if (seen == null) {
      // primeira visita: tudo que já existe conta como visto, sem sorteios
      try {
        localStorage.setItem(`${SEEN}-${mode}`, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
    } else {
      const fresh = ach.filter((a) => !seen!.includes(a.id));
      if (fresh.length) {
        try {
          localStorage.setItem(`${SEEN}-${mode}`, JSON.stringify(ids));
        } catch {
          /* ignore */
        }
        // muitas conquistas de uma vez = importação/restauração: só marca como vistas
        if (fresh.length < 4 && Date.now() > quietUntil) {
          for (const a of fresh.slice(0, 2)) ui.toast(`Nova conquista no pote: ${a.emoji} ${a.title}`, 'diva');
          if (!fresh.every((a) => a.id.startsWith('cap-'))) {
            const v = rollMimo(store.snapshot(), fresh[0].title);
            if (v) {
              store.saveVoucher(v);
              setTimeout(() => ui.enqueue({ kind: 'voucher', voucherId: v.id }), 1600);
            }
          }
        }
      }
    }
    // cartas que chegaram
    const t = today();
    const earnedIds = new Set(ids);
    for (const l of data.letters) {
      if (!l.sealed || l.openedAt || delivered.current.has(l.id)) continue;
      const due = l.mode === 'marco' ? !!l.milestone && earnedIds.has(l.milestone) : !!l.openDate && l.openDate <= t;
      if (due) {
        delivered.current.add(l.id);
        setTimeout(() => {
          play('paper');
          ui.enqueue({ kind: 'letter', letterId: l.id });
        }, first.current ? 1400 : 400);
      }
    }
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ready, mode]);
  return null;
}
