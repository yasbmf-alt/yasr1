import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Dois jeitos de construir o mesmo app:
//  • claude (padrão): um único HTML, publicado como artifact no Claude
//  • web: site normal para Cloudflare Pages/Vercel, com login Supabase e
//    instalável no celular (VITE_TARGET=web, pasta dist-web)
const web = process.env.VITE_TARGET === 'web';

const webHead = (): Plugin => ({
  name: 'yas-web-head',
  transformIndexHtml(html) {
    return html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#2e4a7f" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Yas R1" />`,
    );
  },
});

export default defineConfig(
  web
    ? {
        plugins: [react(), webHead()],
        define: { 'import.meta.env.VITE_TARGET': JSON.stringify('web') },
        publicDir: 'public',
        build: { target: 'es2020', outDir: 'dist-web', sourcemap: false },
      }
    : {
        plugins: [react(), viteSingleFile()],
        publicDir: false,
        // a versão do Claude nunca leva as chaves do site próprio
        define: {
          'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
          'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
          'import.meta.env.VITE_TARGET': JSON.stringify('claude'),
        },
        build: { target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 100000000 },
      },
);
