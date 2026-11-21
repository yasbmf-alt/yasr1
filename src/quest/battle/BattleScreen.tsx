// Tela de batalha do Yas Quest (layout de RPG de bolso, feito do zero).
// A lógica fica em machine.ts; aqui só desenhamos o estado e disparamos eventos.
import { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { sfx } from './sfx';
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

type Fx = { id: number; kind: 'golpe' | 'efetivo' | 'contra' | 'desmaio'; label: string };
const GOLPE_TXT = ['EM CHEIO!', 'GOLPE CERTEIRO!', 'ACERTOU!', 'NO PONTO!'];
const RED = 'sepia(1) saturate(14) hue-rotate(-38deg) brightness(1.05) contrast(1.1)';
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
/** partículas do impacto (direções fixas para não sortear a cada render) */
const SPARKS = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2, d: 38 + (i % 3) * 16, c: ['#fff3b0', '#ffffff', '#f8c9f1', '#e0525e'][i % 4] }));

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function BattleScreen({ cast, questions, title, onAnswer, onExit, onFinish, finishLabel = 'Continuar', onAgain }: BattleScreenProps) {
  const [s, send] = useReducer(battleReducer, undefined, () => initBattle(cast, questions));
  const foe = useAnimationControls();
  const me = useAnimationControls();
  const stage = useAnimationControls();
  const told = useRef(0);
  const [shownHp, setShownHp] = useState(s.hp);
  const [hpHit, setHpHit] = useState(0);
  const [fx, setFx] = useState<Fx | null>(null);
  const fxId = useRef(0);
  const boom = (kind: Fx['kind'], label: string) => { fxId.current += 1; setFx({ id: fxId.current, kind, label }); };
  const [wipe, setWipe] = useState(true);
  useEffect(() => { sfx('entrada'); const t = window.setTimeout(() => setWipe(false), 900); return () => window.clearTimeout(t); }, []);
  useEffect(() => { if (s.phase !== 'animacao') setShownHp(s.hp); }, [s.phase, s.hp]);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  // cada resposta registrada vai para fora (histórico da questão)
  useEffect(() => {
    if (s.results.length > told.current) { told.current = s.results.length; onAnswer?.(s.results[s.results.length - 1]); }
  }, [s.results]); // eslint-disable-line react-hooks/exhaustive-deps

  // fase de animação: golpe da Yasmin (monstro fica vermelho, HP cai) ou contra-ataque
  useEffect(() => {
    if (s.phase !== 'animacao') return undefined;
    let alive = true;
    const run = async () => {
      if (reduced()) {
        if (s.ok) { setShownHp(s.hp); setHpHit((h) => h + 1); sfx('golpe'); }
        await wait(300);
      } else if (s.ok) {
        const efetivo = s.current?.zona === 'pegadinha';
        await me.start({ x: -8, transition: { duration: 0.12 } });
        void me.start({ x: [-8, 46, 0], y: [0, -22, 0], transition: { duration: 0.42, times: [0, 0.4, 1] } });
        await wait(150);
        sfx(efetivo ? 'efetivo' : 'golpe');
        boom(efetivo ? 'efetivo' : 'golpe', efetivo ? 'SUPER EFETIVO!' : GOLPE_TXT[Math.floor(Math.random() * GOLPE_TXT.length)]);
        void stage.start({ x: [0, -5, 5, -3, 0], y: [0, 3, -2, 0], transition: { duration: 0.3 } });
        await foe.start({ x: [0, 16, -6, 6, 0], filter: [RED, 'none', RED, 'none', RED, 'none'], transition: { duration: 0.6 } });
        setShownHp(s.hp); setHpHit((h) => h + 1); sfx('drena');
        await wait(420);
        if (s.hp <= 0) {
          sfx('desmaio');
          await foe.start({ opacity: [1, 0.3, 1, 0.3, 1], filter: [RED, 'none', RED, 'none'], transition: { duration: 0.45 } });
          boom('desmaio', 'DESMAIOU!');
          await foe.start({ y: 46, scaleY: 0.2, opacity: 0, transition: { duration: 0.6, ease: 'easeIn' } });
          sfx('vitoria');
          await wait(500);
        }
      } else {
        await foe.start({ y: -8, scale: 1.06, transition: { duration: 0.16 } });
        sfx('contra');
        void foe.start({ x: [0, -90, 0], y: [-8, 60, 0], scale: [1.06, 1.15, 1], transition: { duration: 0.42, times: [0, 0.4, 1] } });
        await wait(160);
        boom('contra', 'CONTRA-ATAQUE!');
        void stage.start({ x: [0, -9, 9, -6, 4, 0], transition: { duration: 0.42 } });
        await me.start({ x: [0, -12, 10, -6, 0], filter: [RED, 'none', RED, 'none'], transition: { duration: 0.5 } });
        await wait(350);
      }
      if (alive) send({ type: 'ANIMACAO_FIM' });
    };
    void run();
    return () => { alive = false; };
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps


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
          <AnimatePresence>{fx && (fx.kind === 'contra' || fx.kind === 'golpe' || fx.kind === 'efetivo') && <motion.span key={`v${fx.id}`} className={`fx-vignette is-${fx.kind}`} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} aria-hidden="true" />}</AnimatePresence>
          {wipe && <span className="bt-wipe" aria-hidden="true">{Array.from({ length: 48 }, (_, k) => <i key={k} style={{ animationDelay: `${((k % 8) + Math.floor(k / 8)) * 0.035}s` }} />)}</span>}
          <div className="bt-foe-side">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: s.phase === 'entrada' ? 0 : 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HPBar name={cast.monstro} hp={shownHp} max={s.hpMax} hit={hpHit} />
            </motion.div>
            <div className="bt-foe-spot">
              <BattleSprite src={sprites.plataforma()} alt="" w={144} h={27} className="bt-plat" />
              <motion.div className="bt-foe" initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 16 }}>
                <motion.div animate={foe}>
                  <BattleSprite src={sprites.monstro(cast.slug)} alt={cast.monstro} w={120} h={120} className="bt-foe-img" />
                </motion.div>
                <AnimatePresence>
                  {fx && fx.kind !== 'contra' && (
                    <motion.span key={fx.id} className={`fx-on-foe is-${fx.kind}`} initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true">
                      {fx.kind !== 'desmaio' && <><i className="fx-slash s1" /><i className="fx-slash s2" /><i className="fx-slash s3" /></>}
                      <i className="fx-ring" />
                      {SPARKS.map((p, k) => <i key={k} className="fx-spark" style={{ '--dx': `${Math.cos(p.a) * p.d}px`, '--dy': `${Math.sin(p.a) * p.d}px`, background: p.c } as React.CSSProperties} />)}
                      {fx.kind !== 'desmaio' && <b className="fx-dmg">-1</b>}
                      <em className="fx-label">{fx.label}</em>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
          <div className="bt-me-side">
            <BattleSprite src={sprites.plataforma()} alt="" w={168} h={31} className="bt-plat" />
            <motion.div className="bt-me" initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.1 }}>
              <motion.div animate={me}>
                <BattleSprite src={sprites.yas()} alt="Yasmin" w={112} h={112} className="bt-me-img" />
              </motion.div>
              <AnimatePresence>
                {fx && fx.kind === 'contra' && (
                  <motion.span key={fx.id} className="fx-on-me" exit={{ opacity: 0 }} aria-hidden="true">
                    <i className="fx-claw c1" /><i className="fx-claw c2" /><i className="fx-claw c3" />
                    <em className="fx-label is-contra">{fx.label}</em>
                  </motion.span>
                )}
              </AnimatePresence>
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
                  <MoveMenu alternativas={q.alternativas} gabarito={q.gabarito} pick={s.pick} locked={s.phase !== 'escolha'} onPick={(k) => { sfx('escolhe'); send({ type: 'ESCOLHER', pick: k }); }} />
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
