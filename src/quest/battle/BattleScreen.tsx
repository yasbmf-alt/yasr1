// Tela de batalha do Yas Quest (layout de RPG de bolso, feito do zero).
// A lógica fica em machine.ts; aqui só desenhamos o estado e disparamos eventos.
import { useEffect, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useAnimationControls } from 'framer-motion';
import { play } from '../../logic/sound';
import { battleReducer, initBattle, summary } from './machine';
import { narrator } from './narrator';
import { sprites } from './sprites';
import { BattleSprite } from './BattleSprite';
import { DialogBox } from './DialogBox';
import { HPBar } from './HPBar';
import { MoveMenu } from './MoveMenu';
import { FeedbackPanel } from './FeedbackPanel';
import { BattleEnd } from './BattleEnd';
import { Bioma } from '../scene/Bioma';
import type { BattleCast, BattleQuestion, TurnResult } from './types';

export interface BattleScreenProps {
  cast: BattleCast;
  questions: BattleQuestion[];
  title?: string;
  /** cada resposta (para salvar no histórico); não é chamado na demo */
  onAnswer?: (r: TurnResult) => void;
  onExit: () => void;
  onFinish: (s: ReturnType<typeof summary>) => void;
  finishLabel?: string;
  onAgain?: () => void;
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function BattleScreen({ cast, questions, title, onAnswer, onExit, onFinish, finishLabel = 'Continuar', onAgain }: BattleScreenProps) {
  const [s, send] = useReducer(battleReducer, undefined, () => initBattle(cast, questions));
  const foe = useAnimationControls();
  const me = useAnimationControls();
  const stage = useAnimationControls();
  const told = useRef(0);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  // cada resposta registrada vai para fora (histórico da questão)
  useEffect(() => {
    if (s.results.length > told.current) { told.current = s.results.length; onAnswer?.(s.results[s.results.length - 1]); }
  }, [s.results]); // eslint-disable-line react-hooks/exhaustive-deps

  // fase de animação: golpe certeiro ou contra-ataque, depois segue sozinho
  useEffect(() => {
    if (s.phase !== 'animacao') return undefined;
    let alive = true;
    const run = async () => {
      if (reduced()) { await new Promise((r) => window.setTimeout(r, 250)); }
      else if (s.ok) {
        play('check');
        await me.start({ x: [0, 18, 0], transition: { duration: 0.28 } });
        await foe.start({ x: [0, -7, 7, -4, 0], opacity: [1, 0.2, 1, 0.2, 1], filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1)'], transition: { duration: 0.5 } });
        if (s.hp <= 0) await foe.start({ y: 28, opacity: 0, transition: { duration: 0.45 } });
      } else {
        play('fizzle');
        await foe.start({ x: [0, -26, 0], y: [0, 10, 0], transition: { duration: 0.32 } });
        await stage.start({ x: [0, -6, 6, -3, 0], transition: { duration: 0.35 } });
      }
      if (alive) send({ type: 'ANIMACAO_FIM' });
    };
    void run();
    return () => { alive = false; };
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (s.phase === 'fim' && s.hp <= 0) play('chapter'); }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = s.current;
  const asking = s.phase === 'pergunta' || s.phase === 'escolha' || s.phase === 'animacao';
  const feedback = s.phase === 'feedback' && q && s.pick;
  const last = feedback ? s.results[s.results.length - 1] : null;
  const endsNow = s.hp <= 0 || !s.queue.length;
  const sum = s.phase === 'fim' ? summary(s) : null;

  const exit = () => {
    if (s.phase === 'fim' || s.phase === 'entrada' || window.confirm('Sair da batalha? O que você já respondeu fica salvo.')) onExit();
  };

  return createPortal(
    <div className={`bt ${cast.serio ? 'is-serio' : ''} ${asking ? 'is-asking' : ''}`} role="dialog" aria-label={title ?? `Batalha: ${cast.tema}`}>
      <motion.div className="bt-frame" animate={stage}>
        <header className="bt-top">
          <button className="bt-exit" onClick={exit} aria-label="Sair da batalha">✕</button>
          <span className="bt-title">{title ?? cast.tema}</span>
        </header>

        {/* arena: fundo da ilha, monstro no alto à direita, Yas embaixo à esquerda */}
        <section className="bt-field" style={sprites.ilhaPropria(cast.slug) ? { backgroundImage: `url(${sprites.ilhaPropria(cast.slug)})` } : undefined}>
          {!sprites.ilhaPropria(cast.slug) && <Bioma b={cast.bioma ?? 'resp'} />}
          <div className="bt-foe-side">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: s.phase === 'entrada' ? 0 : 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HPBar name={cast.monstro} hp={s.hp} max={s.hpMax} />
            </motion.div>
            <div className="bt-foe-spot">
              <BattleSprite src={sprites.plataforma()} alt="" w={144} h={27} className="bt-plat" />
              <motion.div className="bt-foe" initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 16 }}>
                <motion.div animate={foe}>
                  <BattleSprite src={sprites.monstro(cast.slug)} alt={cast.monstro} w={120} h={120} className="bt-foe-img" />
                </motion.div>
              </motion.div>
            </div>
          </div>
          <div className="bt-me-side">
            <BattleSprite src={sprites.plataforma()} alt="" w={168} h={31} className="bt-plat" />
            <motion.div className="bt-me" initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.1 }}>
              <motion.div animate={me}>
                <BattleSprite src={sprites.yas()} alt="Yasmin" w={112} h={112} className="bt-me-img" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* parte de baixo: uma coisa por vez */}
        <section className="bt-bottom">
          {s.phase === 'fim' && sum ? (
            <>
              <DialogBox text={s.narration} speaker="bigode" serio={cast.serio} />
              <BattleEnd {...sum} won={sum.won} onDone={() => onFinish(sum)} doneLabel={finishLabel} onAgain={onAgain} />
            </>
          ) : asking && q ? (
            <>
              {s.narration && s.phase === 'pergunta' && <p className="bt-aside">{s.narration}</p>}
              <DialogBox
                key={`${q.id}-${s.turn}`}
                text={q.enunciado}
                speaker="questao"
                fast
                canAdvance={false}
                onTyped={() => { if (s.phase === 'pergunta') send({ type: 'AVANCAR' }); }}
              />
              {s.phase === 'pergunta' && <p className="bt-hint">toque no texto para mostrar tudo</p>}
              {s.phase !== 'pergunta' && (
                <>
                  {s.phase === 'escolha' && <p className="bt-aside">{narrator.escolha(cast)}</p>}
                  <MoveMenu alternativas={q.alternativas} gabarito={q.gabarito} pick={s.pick} locked={s.phase !== 'escolha'} onPick={(k) => send({ type: 'ESCOLHER', pick: k })} />
                </>
              )}
            </>
          ) : feedback && q && s.pick && last ? (
            <>
              <DialogBox text={s.narration} speaker="bigode" serio={cast.serio} />
              <FeedbackPanel
                key={`fb-${s.turn}`}
                q={q}
                pick={s.pick}
                ok={!!s.ok}
                voltaDepois={!s.ok && !last.revisao}
                onNext={() => send({ type: 'PROXIMO' })}
                nextLabel={endsNow ? 'Ver resultado' : 'Continuar'}
              />
            </>
          ) : (
            <DialogBox text={s.narration} speaker="bigode" serio={cast.serio} onAdvance={() => send({ type: 'AVANCAR' })} />
          )}
        </section>
      </motion.div>
    </div>,
    document.body,
  );
}
