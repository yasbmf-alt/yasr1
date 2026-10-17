// Testa o schema.sql num Postgres local (PGlite) com um "Supabase de mentira":
// confere que cada pessoa só vê e mexe nos próprios dados.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db = new PGlite();
const stub = `
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
create table storage.objects (id serial primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema storage to authenticated; grant all on storage.objects to authenticated; grant usage, select on sequence storage.objects_id_seq to authenticated;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
`;
await db.exec(stub);
const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
await db.exec(schema);
await db.exec(schema); // idempotente
const A='11111111-1111-1111-1111-111111111111', B='22222222-2222-2222-2222-222222222222';
const as = async (uid, role, sql, params=[]) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`);
  try { const r = await db.query(sql, params); return { rows: r.rows, n: r.affectedRows }; } catch (e) { return { error: e.message }; } finally { await db.exec('reset role;'); }
};
const out = [];
out.push(['A insere', await as(A,'authenticated',`insert into public.yas_docs (col,id,data) values ('missions','m1','{"x":1}') returning user_id`)]);
out.push(['A lê', await as(A,'authenticated',`select col,id from public.yas_docs`)]);
out.push(['B lê (deve vir vazio)', await as(B,'authenticated',`select col,id from public.yas_docs`)]);
out.push(['B tenta gravar como A (deve falhar)', await as(B,'authenticated',`insert into public.yas_docs (user_id,col,id,data) values ('${A}','missions','m2','{}')`)]);
out.push(['B tenta editar o de A (0 linhas)', await as(B,'authenticated',`update public.yas_docs set data='{"hack":1}' where id='m1'`)]);
out.push(['B tenta apagar o de A (0 linhas)', await as(B,'authenticated',`delete from public.yas_docs where id='m1'`)]);
out.push(['anon lê (deve falhar)', await as(null,'anon',`select * from public.yas_docs`)]);
out.push(['coleção inválida (deve falhar)', await as(A,'authenticated',`insert into public.yas_docs (col,id,data) values ('hack','x','{}')`)]);
out.push(['upsert do app', await as(A,'authenticated',`insert into public.yas_docs (user_id,col,id,data) values ('${A}','missions','m1','{"x":2}') on conflict (user_id,col,id) do update set data=excluded.data returning data`)]);
out.push(['arquivo na pasta de A', await as(A,'authenticated',`insert into storage.objects (bucket_id,name) values ('yas-assets','${A}/image/a.png') returning name`)]);
out.push(['B envia na pasta de A (deve falhar)', await as(B,'authenticated',`insert into storage.objects (bucket_id,name) values ('yas-assets','${A}/image/b.png')`)]);
out.push(['B lista arquivos (vazio)', await as(B,'authenticated',`select name from storage.objects`)]);
out.push(['bucket privado', await as(A,'postgres',`select public, file_size_limit from storage.buckets`)]);
for (const [k,v] of out) console.log(k.padEnd(40), JSON.stringify(v));
const fails = [
  out[2][1].rows?.length !== 0, !out[3][1].error, out[4][1].n !== 0, out[5][1].n !== 0, !out[6][1].error, !out[7][1].error, !out[10][1].error, out[11][1].rows?.length !== 0,
].filter(Boolean).length;
if (fails) { console.error(`\n✗ ${fails} verificação(ões) de segurança falharam`); process.exit(1); }
console.log('\n✓ schema e políticas de acesso conferidos');
