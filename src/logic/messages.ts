// Frases da diva. Curtinhas, de propósito.

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const MANHA = [
  'acorda diva, a R1 não vai se passar sozinha 💅',
  'café na mão, videoaula no play, recalque no chão',
  'servindo conhecimento desde cedo, como deve ser',
  'bom dia só pra quem vai fazer questões hoje',
  'o protocolo de hoje é: você lacrar',
];
const TARDE = [
  'tarde de estudo? a banca já tá suando frio',
  'pausa pro café e volta pras questões, mona',
  'ela estuda, ela revisa, ela é R1',
  'não é sorte, é revisão espaçada, querida',
  'a concorrência descansando e você? servindo',
];
const NOITE = [
  'missão da noite: fechar o dia com chave de ouro',
  'mais uma revisão e cama, combinado? 🌙',
  'estudar de noite é coisa de quem vai passar',
  'a lua tá linda e o seu percentual também vai ficar',
  'última sessão do dia: entregando tudo',
];
const GERAIS = [
  'foi ela que pediu R1? foi.',
  'cada questão errada hoje é um acerto na prova',
  'deu a louca na fisiopatologia e você dominou',
  'ninguém segura uma interna focada',
  'o jardim tá crescendo e a confiança também 🌱',
  'flashcard em dia, autoestima em dia',
];

export const DONE_LINES = [
  'vc lacrou mt hj diva!',
  'atividade concluída e a autoestima lá em cima',
  'mais uma pro currículo da futura R1',
  'essa foi de arrasar, segue o baile',
  'checklist batendo, banca tremendo',
  'ela não erra, ela revisa',
];

export const MISSION_LINES = [
  'a missão foi dada e a missão foi CUMPRIDA 👑',
  'tema fechado com sucesso, próxima vítima',
  'mais um livro na estante, mais uma flor no jardim',
  'missão cumprida e cabelo intacto',
];

export const CHAPTER_LINES = [
  'capítulo fechado, recalque aberto ✨',
  'uma semana inteirinha servida. tô passada',
  'essa R1 já tem dona',
];

const pick = <T,>(a: T[], seed?: number) => a[Math.abs(seed ?? Math.floor(Math.random() * 1e6)) % a.length];

export function motivational(seed?: number, d = new Date()) {
  const h = d.getHours();
  const pool = [...(h < 12 ? MANHA : h < 18 ? TARDE : NOITE), ...GERAIS];
  return pick(pool, seed);
}

export const randomLine = (pool: string[]) => pick(pool);
