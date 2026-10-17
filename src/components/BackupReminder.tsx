// Lembrete discreto: quando faz 7 dias do último backup baixado, um aviso
// aparece uma vez por dia. Desliga em Configurações → Dados.
import { useEffect } from 'react';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { today } from '../logic/dates';

export function BackupReminder() {
  const { data, ready, mode } = useStore();
  const ui = useUI();
  useEffect(() => {
    if (!ready || mode === 'demo' || mode === 'loading' || data.settings.backupReminder === false) return;
    const hasData = data.sessions.length + data.missions.length > 0;
    if (!hasData) return;
    const last = data.settings.lastBackupAt;
    const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
    if (days < 7) return;
    try {
      const k = 'yasr1-backup-lembrete';
      if (localStorage.getItem(k) === today()) return;
      localStorage.setItem(k, today());
    } catch {
      return;
    }
    const id = setTimeout(() => ui.toast(last ? 'Lembrete gentil: que tal baixar um backup novo? Configurações → Dados.' : 'Dica: baixe um backup dos seus dados em Configurações → Dados.', 'info'), 4000);
    return () => clearTimeout(id);
  }, [ready, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
