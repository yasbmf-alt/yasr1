import { useCapability } from '../data/repo';

/* eslint-disable @typescript-eslint/no-explicit-any */
let cached: Promise<any> | null = null;
export const assetsCapability = () => (cached ??= useCapability('assets'));

const typeFor = (f: File) =>
  f.type ||
  (f.name.endsWith('.svg') ? 'image/svg+xml' : f.name.endsWith('.webp') ? 'image/webp' : f.name.endsWith('.gif') ? 'image/gif' : f.name.match(/\.jpe?g$/) ? 'image/jpeg' : 'image/png');

/** Envia uma imagem para o armazenamento do app e devolve o id durável. */
export async function uploadImage(file: File): Promise<{ id: string } | { error: string }> {
  const assets = await assetsCapability();
  if (!assets) return { error: 'O envio de imagens funciona com o Yas R1 aberto no Claude, na sua conta.' };
  try {
    const r = await assets.upload(file, { type: typeFor(file) });
    return { id: r.id };
  } catch (e: any) {
    return {
      error:
        e?.code === 'too_large' ? 'Arquivo grande demais (até 20 MB; SVG até 2 MB).'
          : e?.code === 'unsupported_type' ? 'Use PNG, JPG, WebP, GIF ou SVG.'
            : e?.code === 'quota_or_state' ? 'O espaço de imagens do app acabou.'
              : 'Não consegui enviar essa imagem.',
    };
  }
}

/** Envia um áudio (MP3, M4A, WAV, OGG ou WebM). O app decodifica o arquivo no navegador. */
export async function uploadAudio(file: File): Promise<{ id: string } | { error: string }> {
  const assets = await assetsCapability();
  if (!assets) return { error: 'O envio de arquivos funciona com o Yas R1 aberto no Claude, na sua conta.' };
  const type = file.name.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
  try {
    const r = await assets.upload(file, { type });
    return { id: r.id };
  } catch (e: any) {
    return {
      error:
        e?.code === 'too_large' ? 'Arquivo grande demais (até 20 MB).'
          : e?.code === 'unsupported_type' ? 'Esse formato não foi aceito. Tente MP4/M4A ou WebM.'
            : 'Não consegui enviar esse som.',
    };
  }
}
