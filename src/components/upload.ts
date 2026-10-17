// Envio de imagens e sons. Funciona no Claude (arquivos do artifact) e no
// site próprio (Supabase Storage); a escolha fica em platform.ts.
import { canUpload, claudeCapability, uploadFile } from '../platform/platform';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** capacidade de arquivos do Claude (null fora do Claude) */
export const assetsCapability = () => claudeCapability<any>('assets');

/** o envio de imagens está disponível nesta janela? */
export const canUploadImages = canUpload;

/** Envia uma imagem e devolve o id durável. */
export const uploadImage = (file: File) => uploadFile(file, 'image', file.name);

/** Envia um áudio (MP3, M4A, WAV, OGG ou WebM). O app decodifica o arquivo no navegador. */
export const uploadAudio = (file: File) => uploadFile(file, 'audio', file.name);
