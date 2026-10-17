// Tela de entrada do site próprio. Só aparece na versão hospedada com Supabase.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mascot } from '../assets/art';
import { supa } from '../platform/platform';

type Mode = 'entrar' | 'criar' | 'esqueci' | 'nova-senha';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'out' | 'in' | 'recovery'>('checking');
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let off: (() => void) | undefined;
    void supa()!.then(async (m) => {
      const s = await m.currentSession();
      setUid(s?.user.id ?? null);
      setState(s ? (location.hash.includes('nova-senha') ? 'recovery' : 'in') : 'out');
      off = m.onAuthChange((ns) => {
        const id = ns?.user.id ?? null;
        setUid((prev) => {
          // trocou de conta ou saiu: recarrega para não misturar dados
          if (prev && prev !== id) setTimeout(() => location.reload(), 50);
          return id;
        });
        if (!ns) setState('out');
        else if (location.hash.includes('nova-senha')) setState('recovery');
        else setState((st) => (st === 'out' ? 'in' : st));
      });
    });
    return () => off?.();
  }, []);

  if (state === 'checking')
    return (
      <div className="loading">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="sr-only">Abrindo o Yas R1</span>
      </div>
    );
  if (state === 'in' && uid) return <>{children}</>;
  return <Login initial={state === 'recovery' ? 'nova-senha' : 'entrar'} onDone={() => { history.replaceState(null, '', '#trilha'); setState('in'); }} />;
}

function Login({ initial, onDone }: { initial: Mode; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'erro' | 'ok'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const m = await supa()!;
    let err: string | null = null;
    if (mode === 'entrar') err = await m.signIn(email.trim(), pass);
    else if (mode === 'criar') {
      err = await m.signUp(email.trim(), pass);
      if (err === 'confirm') {
        setBusy(false);
        setMsg({ tone: 'ok', text: 'Conta criada! Abra o e-mail de confirmação e depois entre aqui.' });
        setMode('entrar');
        return;
      }
    } else if (mode === 'esqueci') {
      err = await m.resetPassword(email.trim());
      if (!err) {
        setBusy(false);
        setMsg({ tone: 'ok', text: 'Se esse e-mail tiver conta, chegou um link para criar uma senha nova.' });
        return;
      }
    } else if (mode === 'nova-senha') err = await m.updatePassword(pass);
    setBusy(false);
    if (err) setMsg({ tone: 'erro', text: err });
    else onDone();
  };

  const titles: Record<Mode, string> = {
    entrar: 'Entrar no Yas R1',
    criar: 'Criar sua conta',
    esqueci: 'Esqueci minha senha',
    'nova-senha': 'Escolha uma senha nova',
  };

  return (
    <div className="login-page">
      <motion.form className="login-card" onSubmit={submit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
        <div className="login-mascot"><Mascot /></div>
        <p className="login-brand">Yas <span>R1</span></p>
        <h1 className="h2">{titles[mode]}</h1>
        {mode !== 'nova-senha' && (
          <label className="field">
            <span className="field-label">E-mail</span>
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        {mode !== 'esqueci' && (
          <label className="field">
            <span className="field-label">{mode === 'nova-senha' ? 'Senha nova' : 'Senha'}</span>
            <input id="login-pass" type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} required minLength={mode === 'entrar' ? 1 : 8} value={pass} onChange={(e) => setPass(e.target.value)} />
          </label>
        )}
        {msg && <p className={msg.tone === 'erro' ? 'form-error' : 'login-ok'} role="alert">{msg.text}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'Um instante…' : mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : mode === 'esqueci' ? 'Enviar link' : 'Salvar senha'}
        </button>
        <div className="login-links">
          {mode === 'entrar' && (
            <>
              <button type="button" className="link" onClick={() => { setMode('esqueci'); setMsg(null); }}>Esqueci a senha</button>
              <button type="button" className="link" onClick={() => { setMode('criar'); setMsg(null); }}>Primeira vez? Criar conta</button>
            </>
          )}
          {(mode === 'criar' || mode === 'esqueci') && <button type="button" className="link" onClick={() => { setMode('entrar'); setMsg(null); }}>Voltar para entrar</button>}
        </div>
        <p className="muted small login-note">Seus dados ficam guardados na sua conta, protegidos por senha. Ninguém mais consegue vê-los.</p>
      </motion.form>
    </div>
  );
}
