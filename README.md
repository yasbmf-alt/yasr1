# Yas R1

Cantinho de estudos para a residência: trilha Medway + internato, quarto, biblioteca, jardim, agenda, simulados, flashcards, eventos e recompensas.

## Duas versões do mesmo código

| Versão | Como gera | Onde roda | Dados |
|---|---|---|---|
| Claude | `npm run build:claude` → `yas-r1.html` | artifact no Claude | banco do artifact |
| Site próprio | `npm run build:web` → `dist-web/` | Cloudflare Pages ou Vercel | Supabase (login + banco + arquivos) |

A versão é escolhida sozinha: dentro do Claude usa o banco do Claude; no site, com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` definidas, usa o Supabase com login.

## Site próprio em 4 passos
1. Supabase: crie o projeto e rode `supabase/schema.sql` no SQL Editor.
2. Cloudflare Pages: conecte este repositório. Build `npm run build:web`, saída `dist-web`, variáveis do `.env.example`.
3. Supabase → Authentication → URL Configuration: coloque o endereço do site.
4. Crie sua conta no site e depois desligue novos cadastros no Supabase.

O passo a passo completo, para quem nunca fez isso, está no guia que acompanha este código.

## Testes
- `npm test`: confere o `schema.sql` e as políticas de acesso num Postgres local (PGlite).
- `python3 scripts/e2e/restore_test.py backup.json`: exporta, apaga, restaura e compara (precisa de `npx vite build` antes).
- `python3 scripts/e2e/cloud_test.py backup.json`: login, migração, leitura, gravação offline e conferência contra um Supabase simulado (precisa do build web com `VITE_SUPABASE_URL=https://fake.supabase.test`).

## Segurança
- Só a chave **anon public** vai para o site. A **service_role** nunca entra no site; só nos Secrets do GitHub, se ligar o backup automático (`.github/workflows/backup.yml`).
- Cada linha do banco e cada arquivo pertence a um usuário (RLS). Visitantes sem login não acessam nada.
