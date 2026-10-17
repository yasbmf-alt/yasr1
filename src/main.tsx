import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthGate } from './components/AuthGate';
import { isDemoOn } from './data/repo';
import { platformKind } from './platform/platform';
import './styles.css';

// No site próprio (Supabase) o app só abre depois do login.
const needsLogin = platformKind() === 'supabase' && !isDemoOn();
createRoot(document.getElementById('root')!).render(needsLogin ? <AuthGate><App /></AuthGate> : <App />);

// Site próprio: registra o service worker para abrir como app no celular.
if (import.meta.env.VITE_TARGET === 'web' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
