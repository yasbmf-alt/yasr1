// Yasland: registros da vida real (treinos, água, mercado, cozinha, spa, horta).
// Cada registro é um documento próprio guardado na coleção "meta" com id "yl:<tipo>:<id>",
// então não precisa de tabela nova e entra no backup junto com o resto.

export type MealSlot = 'cafe' | 'almoco' | 'lanche' | 'jantar';
export type SportKind = 'beach' | 'tenis' | 'pilates';
export type HairType = 'lavagem' | 'hidratacao' | 'nutricao' | 'reconstrucao';

interface Base {
  id: string;
  createdAt: string;
}
export interface Exercise { id: string; name: string; sets: number; reps: string; load: number | null; rest: number | null }

export interface YlWater extends Base { kind: 'water'; date: string; at: string; ml: number; vessel?: string }
export interface YlCardio extends Base { kind: 'cardio'; date: string; modality: string; minutes: number; speed?: number | null; incline?: number | null; distance?: number | null; kcal?: number | null; notes?: string }
export interface YlSheet extends Base { kind: 'sheet'; name: string; exercises: Exercise[] }
export interface YlLift extends Base { kind: 'lift'; date: string; sheetId: string; sheetName: string; minutes: number; done: { exId: string; name: string; sets: { reps: string; load: number | null }[] }[]; total: number; complete?: boolean }
export interface YlSport extends Base { kind: 'sport'; date: string; modality: SportKind; minutes: number; notes?: string }
export interface YlGrocery extends Base { kind: 'grocery'; name: string; qty: number; unit: string; price: number | null; category: string; inBasket: boolean }
export interface YlPurchaseItem { name: string; qty: number; unit: string; price: number | null; category: string; expiry: string | null }
export interface YlPurchase extends Base { kind: 'purchase'; date: string; total: number; items: YlPurchaseItem[] }
export interface YlStock extends Base { kind: 'stock'; name: string; qty: number; unit: string; category: string; expiry: string | null; status: 'ok' | 'consumido' | 'descartado'; addedAt: string; closedAt?: string | null }
export interface YlWish extends Base { kind: 'wish'; name: string; image?: string; wantPrice: number | null; prices: { date: string; price: number }[]; priority: 1 | 2 | 3; link?: string; boughtAt?: string | null }
export interface YlMeal extends Base { kind: 'meal'; date: string; slot: MealSlot; text: string; recipeId?: string | null }
export interface YlRecipe extends Base { kind: 'recipe'; name: string; category: string; ingredients: { name: string; qty: string }[]; steps: string[]; notes: string; photo?: string; fav: boolean; made: string[] }
export interface YlChore extends Base { kind: 'chore'; date: string; task: string }
export interface YlSkin extends Base { kind: 'skin'; date: string; period: 'manha' | 'noite'; done: string[] }
export interface YlHair extends Base { kind: 'hair'; date: string; type: HairType; notes?: string }
export interface YlSleep extends Base { kind: 'sleep'; date: string; hours: number; quality: number; notes?: string }
export interface YlHabit extends Base { kind: 'habit'; name: string; emoji: string; color: string; perWeek: number; archived?: boolean }
export interface YlCheck extends Base { kind: 'hcheck'; habitId: string; date: string }
export interface YlGut extends Base { kind: 'gut'; date: string; at: string; bristol: number | null; symptoms?: string; notes?: string }
export interface YlPlot extends Base { kind: 'plot'; slot: number; species: string; plantedAt: string; harvestedAt?: string | null }
export interface YlCfg extends Base {
  kind: 'cfg';
  waterGoal: number;
  vessels: { id: string; name: string; ml: number; shape: 'copo' | 'garrafinha' | 'garrafa' | 'pote' }[];
  skinSteps: { manha: string[]; noite: string[] };
  hairPlan: HairType[]; // ordem do cronograma capilar
  seenBadges: string[];
}

export type YlDoc =
  | YlWater | YlCardio | YlSheet | YlLift | YlSport | YlGrocery | YlPurchase | YlStock | YlWish | YlMeal | YlRecipe
  | YlChore | YlSkin | YlHair | YlSleep | YlHabit | YlCheck | YlGut | YlPlot | YlCfg;
export type YlKind = YlDoc['kind'];
export type DocOf<K extends YlKind> = Extract<YlDoc, { kind: K }>;

export const CFG_ID = 'yl:cfg';
export const DEFAULT_CFG: YlCfg = {
  id: CFG_ID, kind: 'cfg', createdAt: '', waterGoal: 2000,
  vessels: [
    { id: 'copo', name: 'Copo', ml: 200, shape: 'copo' },
    { id: 'garrafinha', name: 'Garrafinha', ml: 500, shape: 'garrafinha' },
    { id: 'garrafa', name: 'Garrafa', ml: 950, shape: 'garrafa' },
  ],
  skinSteps: { manha: ['Limpeza', 'Hidratante', 'Protetor solar'], noite: ['Demaquilante', 'Limpeza', 'Sérum', 'Hidratante'] },
  hairPlan: ['hidratacao', 'nutricao', 'hidratacao', 'reconstrucao'],
  seenBadges: [],
};

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'cafe', label: 'Café' }, { id: 'almoco', label: 'Almoço' }, { id: 'lanche', label: 'Lanche' }, { id: 'jantar', label: 'Jantar' },
];
export const FOOD_CATS = ['Hortifrúti', 'Carnes e ovos', 'Laticínios', 'Padaria', 'Grãos e massas', 'Congelados', 'Bebidas', 'Temperos', 'Limpeza', 'Higiene', 'Outros'];
export const HAIR_LABEL: Record<HairType, string> = { lavagem: 'Lavagem', hidratacao: 'Hidratação', nutricao: 'Nutrição', reconstrucao: 'Reconstrução' };
export const SPORT_LABEL: Record<SportKind, string> = { beach: 'Beach tennis', tenis: 'Tênis', pilates: 'Pilates' };
