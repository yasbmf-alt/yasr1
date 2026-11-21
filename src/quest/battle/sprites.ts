// Sprites da batalha. Os arquivos ficam em ./sprites (veja o README de lá).
// Se existir um PNG ou WebP com o mesmo nome do placeholder SVG, ele é usado no lugar.
const files = import.meta.glob('./sprites/**/*.{svg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function sprite(name: string): string | undefined {
  for (const ext of ['png', 'webp', 'svg']) {
    const url = files[`./sprites/${name}.${ext}`];
    if (url) return url;
  }
  return undefined;
}

export const sprites = {
  monstro: (slug: string) => sprite(`monstros/${slug}`) ?? sprite('monstros/srag'),
  ilha: (slug: string) => sprite(`ilhas/${slug}`) ?? sprite('ilhas/srag'),
  bigode: () => sprite('bigode'),
  yas: () => sprite('yas-costas'),
  plataforma: () => sprite('plataforma'),
};
