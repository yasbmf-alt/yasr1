// Onde o Yas R1 está rodando e como ele guarda arquivos.
//  • claude   – aberto no Claude: banco e arquivos do próprio artifact
//  • supabase – site próprio (Cloudflare Pages/Vercel) com login e banco Supabase
//  • local    – sem nenhum dos dois: só neste navegador (reserva)
// O resto do app conversa só com estas funções, sem saber qual é qual.
import { useEffect, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PlatformKind = 'claude' | 'supabase' | 'local';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const hasSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

export function platformKind(): PlatformKind {
  if ((window as any).claude?.use) return 'claude';
  if (hasSupabase) return 'supabase';
  return 'local';
}

export async function claudeCapability<T = any>(name: string): Promise<T | null> {
  const c = (window as any).claude;
  if (!c?.use) return null;
  try {
    return (await c.use(name)) as T | null;
  } catch {
    return null;
  }
}

// ── Supabase (carregado só quando configurado) ───────────────
type SupaModule = typeof import('./supabase');
let supaMod: Promise<SupaModule> | null = null;
export const supa = (): Promise<SupaModule> | null => {
  // as variáveis entram no build como texto fixo; na versão do Claude ficam vazias
  // e este trecho (com a biblioteca do Supabase) some do arquivo final
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return null;
  return (supaMod ??= import('./supabase'));
};

// ── Arquivos (imagens e sons) ────────────────────────────────

export type UploadResult = { id: string } | { error: string };

const imageType = (f: File) =>
  f.type ||
  (f.name.endsWith('.svg') ? 'image/svg+xml' : f.name.endsWith('.webp') ? 'image/webp' : f.name.endsWith('.gif') ? 'image/gif' : f.name.match(/\.jpe?g$/) ? 'image/jpeg' : 'image/png');

export async function canUpload(): Promise<boolean> {
  const k = platformKind();
  if (k === 'claude') return !!(await claudeCapability('assets'));
  if (k === 'supabase') return true;
  return false;
}

export async function uploadFile(file: File | Blob, kind: 'image' | 'audio', name = 'arquivo'): Promise<UploadResult> {
  const k = platformKind();
  if (k === 'claude') {
    const assets = await claudeCapability('assets');
    if (!assets) return { error: 'O envio de arquivos não está disponível nesta janela.' };
    const f = file instanceof File ? file : new File([file], name, { type: file.type });
    const type = kind === 'image' ? imageType(f) : f.name.toLowerCase().endsWith('.webm') || f.type.includes('webm') ? 'video/webm' : 'video/mp4';
    try {
      const r = await assets.upload(f, { type });
      return { id: r.id };
    } catch (e: any) {
      return {
        error:
          e?.code === 'too_large' ? 'Arquivo grande demais (até 20 MB; SVG até 2 MB).'
            : e?.code === 'unsupported_type' ? (kind === 'image' ? 'Use PNG, JPG, WebP, GIF ou SVG.' : 'Esse formato não foi aceito. Tente MP4/M4A ou WebM.')
              : e?.code === 'quota_or_state' ? 'O espaço de arquivos do app acabou.'
                : 'Não consegui enviar esse arquivo.',
      };
    }
  }
  const m = supa();
  if (m) return (await m).uploadToStorage(file, kind, name);
  return { error: 'Para enviar arquivos, abra o Yas R1 pelo Claude ou pelo seu site com login.' };
}

// ── Endereço de um arquivo enviado ───────────────────────────
// Ids do Claude são 32 caracteres hexadecimais; ids do Supabase começam com "sb:".

const urlCache = new Map<string, { url: string; until: number }>();
const waiting = new Map<string, Promise<string | null>>();

export function assetUrlSync(id: string): string | null {
  if (!id) return null;
  if (!id.startsWith('sb:')) return `/_blob/${id}`;
  const c = urlCache.get(id);
  return c && c.until > Date.now() ? c.url : null;
}

export async function resolveAssetUrl(id: string): Promise<string | null> {
  const now = assetUrlSync(id);
  if (now) return now;
  if (!id.startsWith('sb:')) return null;
  if (!waiting.has(id)) {
    const m = supa();
    const p = m
      ? m.then((x) => x.signedUrl(id.slice(3))).then((url) => {
          if (url) urlCache.set(id, { url, until: Date.now() + 50 * 60 * 1000 });
          waiting.delete(id);
          return url;
        })
      : Promise.resolve(null);
    waiting.set(id, p);
  }
  return waiting.get(id)!;
}

export function useAssetUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? assetUrlSync(id) : null));
  useEffect(() => {
    if (!id) return setUrl(null);
    const now = assetUrlSync(id);
    if (now) return setUrl(now);
    let alive = true;
    void resolveAssetUrl(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

// ── Baixar um arquivo (backup, listas) ───────────────────────

export async function saveDownload(filename: string, text: string, mimeType = 'application/json'): Promise<'ok' | 'declined' | 'failed'> {
  if (platformKind() === 'claude') {
    const dl = await claudeCapability('downloads');
    if (dl?.save) {
      try {
        await dl.save({ filename, data: text, mimeType });
        return 'ok';
      } catch (e: any) {
        if (e?.code === 'declined') return 'declined';
        return 'failed';
      }
    }
    return 'failed';
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'ok';
  } catch {
    return 'failed';
  }
}
