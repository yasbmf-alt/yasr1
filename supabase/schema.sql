-- ─────────────────────────────────────────────────────────────
-- Yas R1 · banco no Supabase
-- Cole este arquivo inteiro em: Supabase → SQL Editor → New query → Run.
-- Pode rodar de novo sem problema (não apaga dados).
-- ─────────────────────────────────────────────────────────────

-- 1. Uma tabela só guarda todos os registros do app, um por linha.
--    "col" diz o tipo (missions, sessions…), "data" guarda o conteúdo.
create table if not exists public.yas_docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  col        text        not null check (col in (
               'chapters','missions','topics','sessions','meta','notes','events',
               'simulados','decks','cards','errnotes','macetes','letters','vouchers')),
  id         text        not null check (length(id) between 1 and 200),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);

create index if not exists yas_docs_user_col on public.yas_docs (user_id, col);

-- 2. Políticas de acesso (RLS): cada pessoa só enxerga e mexe nas próprias linhas.
alter table public.yas_docs enable row level security;
alter table public.yas_docs force row level security;

drop policy if exists "yas: ler os meus"     on public.yas_docs;
drop policy if exists "yas: criar os meus"   on public.yas_docs;
drop policy if exists "yas: editar os meus"  on public.yas_docs;
drop policy if exists "yas: apagar os meus"  on public.yas_docs;

create policy "yas: ler os meus"    on public.yas_docs for select to authenticated using (user_id = auth.uid());
create policy "yas: criar os meus"  on public.yas_docs for insert to authenticated with check (user_id = auth.uid());
create policy "yas: editar os meus" on public.yas_docs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "yas: apagar os meus" on public.yas_docs for delete to authenticated using (user_id = auth.uid());

-- visitantes sem login não têm acesso nenhum
revoke all on public.yas_docs from anon;
grant select, insert, update, delete on public.yas_docs to authenticated;

-- 3. Sincronização ao vivo entre computador e celular
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'yas_docs'
  ) then
    alter publication supabase_realtime add table public.yas_docs;
  end if;
exception when undefined_object then
  -- projeto sem a publicação de realtime: o app funciona do mesmo jeito, só sem atualização ao vivo
  null;
end $$;

-- 4. Arquivos (imagens e sons): pasta privada, cada pessoa só acessa a própria pasta
insert into storage.buckets (id, name, public, file_size_limit)
values ('yas-assets', 'yas-assets', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists "yas arquivos: ler os meus"   on storage.objects;
drop policy if exists "yas arquivos: enviar os meus" on storage.objects;
drop policy if exists "yas arquivos: trocar os meus" on storage.objects;
drop policy if exists "yas arquivos: apagar os meus" on storage.objects;

create policy "yas arquivos: ler os meus" on storage.objects for select to authenticated
  using (bucket_id = 'yas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "yas arquivos: enviar os meus" on storage.objects for insert to authenticated
  with check (bucket_id = 'yas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "yas arquivos: trocar os meus" on storage.objects for update to authenticated
  using (bucket_id = 'yas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "yas arquivos: apagar os meus" on storage.objects for delete to authenticated
  using (bucket_id = 'yas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
