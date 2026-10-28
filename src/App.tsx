import { GoalParty } from './components/GoalParty';
import { EventWatcher, PreviewBar } from './components/EventDecor';
import { BackupReminder } from './components/BackupReminder';
import { platformKind } from './platform/platform';
import React from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { StoreProvider, useStore } from './data/store';
import { UIProvider, useUI, type Page } from './components/ui';
import { Icon } from './components/Icon';
import { TopicSheet } from './components/TopicSheet';
import { RewardWatcher } from './components/useRewards';
import { Trilha } from './pages/Trilha';
import { Evolucao } from './pages/Evolucao';
import { Configuracoes } from './pages/Configuracoes';
import { Simulados } from './pages/Simulados';
import { Painel } from './pages/Painel';
import { Quarto } from './pages/Quarto';
import { Flashcards } from './pages/Flashcards';
import { Agenda } from './pages/Agenda';
import { Revisoes } from './pages/Revisoes';
import { Biblioteca } from './pages/Biblioteca';
import { setDemo } from './data/repo';
import { useActiveEvents } from './components/EventDecor';

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'trilha', label: 'Minha Trilha', icon: 'trilha' },
  { id: 'quarto', label: 'Meu quarto', icon: 'room' },
  { id: 'biblioteca', label: 'Biblioteca', icon: 'biblioteca' },
  { id: 'evolucao', label: 'Jardim', icon: 'evolucao' },
  { id: 'revisoes', label: 'Revisões', icon: 'revisao' },
  { id: 'agenda', label: 'Agenda', icon: 'agenda' },
  { id: 'painel', label: 'Painel', icon: 'chart' },
  { id: 'simulados', label: 'Simulados', icon: 'simulados' },
  { id: 'flashcards', label: 'Flashcards', icon: 'flashcards' },
  { id: 'config', label: 'Configurações', icon: 'config' },
];

function Sidebar() {
  const { page, go } = useUI();
  return (
    <nav className="sidebar" aria-label="Navegação principal">
      <div className="logo" aria-label="Yas R1">
        <span>Yas</span>
        <span className="logo-r1">R1</span>
      </div>
      <ul className="nav">
        {NAV.map((n) => (
          <li key={n.id} className={n.id === 'config' ? 'nav-last' : undefined}>
            <button className={`nav-item ${page === n.id ? 'is-active' : ''}`} onClick={() => go(n.id)} aria-label={n.label} title={n.label} aria-current={page === n.id ? 'page' : undefined}>
              {page === n.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <Icon name={n.icon} size={20} />
              <span className="nav-label">{n.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Banners() {
  const { mode, error, clearError } = useStore();
  return (
    <>
      {mode === 'demo' && (
        <div className="banner banner-demo" role="status">
          <span>
            <strong>Modo demonstração.</strong> Tudo aqui é fictício e nada é salvo. Seus dados continuam guardados.
          </span>
          <button className="btn btn-sm btn-dark" onClick={() => { setDemo(false); location.reload(); }}>
            Voltar para meus dados
          </button>
        </div>
      )}
      {mode === 'local' && (
        <div className="banner banner-local" role="status">
          {platformKind() === 'local'
            ? 'Este Yas R1 está salvando só neste navegador. Exporte backups com frequência (Configurações → Dados).'
            : 'O banco do app não respondeu nesta janela, então as alterações estão sendo salvas só neste navegador. Recarregue a página para sincronizar.'}
        </div>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          <span>{error}</span>
          <button className="btn btn-sm btn-quiet" onClick={clearError}>Ok</button>
        </div>
      )}
    </>
  );
}

function Main() {
  const { page } = useUI();
  const { ready, mode } = useStore();
  const { data } = useStore();
  const rm = data.settings.reducedMotion;
  React.useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', rm === 'on' || (rm === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches));
  }, [rm]);
  // Halloween e Natal trocam a paleta do app inteiro enquanto durarem (some sozinho depois)
  const ev = useActiveEvents();
  const season = ev.seasonal?.theme === 'halloween' ? 'halloween' : ev.seasonal?.theme === 'natal' ? 'natal' : null;
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pal-halloween', season === 'halloween');
    html.classList.toggle('pal-natal', season === 'natal');
  }, [season]);

  return (
    <MotionConfig reducedMotion={rm === 'on' ? 'always' : rm === 'off' ? 'never' : 'user'}>
      <div className="app">
        <GoalParty />
        <Sidebar />
        <main className="main">
          <Banners />
          {!ready || mode === 'loading' ? (
            <div className="loading">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="sr-only">Carregando seus estudos</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                {page === 'trilha' && <Trilha />}
                {page === 'evolucao' && <Evolucao />}
                {page === 'biblioteca' && <Biblioteca />}
                {page === 'agenda' && <Agenda />}
                {page === 'revisoes' && <Revisoes />}
                {page === 'simulados' && <Simulados />}
                {page === 'painel' && <Painel />}
                {page === 'quarto' && <Quarto />}
                {page === 'flashcards' && <Flashcards />}
                {page === 'config' && <Configuracoes />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
      <TopicSheet />
      <RewardWatcher />
      <EventWatcher />
      <BackupReminder />
      <PreviewBar />
    </MotionConfig>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <Main />
      </UIProvider>
    </StoreProvider>
  );
}
