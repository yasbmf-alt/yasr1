// Backup independente: lê o banco do Supabase com a chave de serviço e salva
// um arquivo no mesmo formato do botão "Backup dos dados" do app.
// Roda no GitHub Actions (ver .github/workflows/backup.yml) ou no seu computador:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/export-supabase.mjs
// A chave de serviço NUNCA vai para o site; fica só nos "Secrets" do GitHub.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('yas_docs').select('user_id,col,id,data').order('user_id').order('col').order('id').range(from, from + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
const LISTS = ['chapters', 'missions', 'topics', 'sessions', 'notes', 'events', 'simulados', 'decks', 'cards', 'errnotes', 'macetes', 'letters', 'vouchers'];
const byUser = new Map();
for (const r of rows) {
  const d = byUser.get(r.user_id) ?? Object.fromEntries(LISTS.map((k) => [k, []]));
  if (r.col === 'meta') d.settings = { ...r.data, id: r.id };
  else if (d[r.col]) d[r.col].push({ ...r.data, id: r.id });
  byUser.set(r.user_id, d);
}
fs.mkdirSync('backup', { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
for (const [uid, data] of byUser) {
  const counts = Object.fromEntries(LISTS.map((k) => [k, data[k].length]));
  const file = `backup/yas-r1-backup-${stamp}-${uid.slice(0, 8)}.json`;
  fs.writeFileSync(file, JSON.stringify({ app: 'yas-r1', version: 2, exportedAt: new Date().toISOString(), counts, data }, null, 2));
  console.log(file, counts);
}
