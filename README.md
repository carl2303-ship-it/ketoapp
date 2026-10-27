# KetoTrack & Plan

Web app cetogénica + performance: macros, net carbs, diário alimentar e planeamento.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui + Lucide + Recharts + Zustand (`ketotrack-v5`)
- Supabase (PostgreSQL + RLS + Auth)
- PWA (manifest + service worker + Instalar)

## Como correr

```bash
npm install
cp .env.example .env.local
# preenche NEXT_PUBLIC_SUPABASE_ANON_KEY e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

App em [http://127.0.0.1:4321](http://127.0.0.1:4321).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim (para remoto) | URL do projeto, ex. `https://oymdacaicfyejuizyosw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preferida | Chave publishable (`sb_publishable_…`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Alternativa | Chave anon JWT legada |

Sem chave válida, a UI corre em **modo mock** (localStorage + seed).

**Nunca commits de `.env.local`.** Usa só `.env.example` (placeholders).

## Schema / migração

Ficheiro: `supabase/migrations/20260312173000_initial_schema.sql` — **já aplicado** no projeto.

## Funcionalidades

| Área | Estado |
|---|---|
| Dashboard (anel macros + cartões + calendário semana/mês) | Feito |
| Totais / cartões em tempo real ao registar | Feito |
| Sugestões de refeições restantes (macros) | Feito |
| Registo de alimentos / diário | Feito |
| Copiar refeição do diário para outro dia | Feito |
| Gestão de alimentos (CRUD pessoais; globais fork/hide) | Feito |
| Pesquisa + categorias | Feito |
| Planeador semanal (copiar refeição ou dia, lista compras) | Feito |
| Eletrólitos + GKI | Feito |
| Login (sync RLS diário/plano) | Feito (password) |
| Receitas | Stub |
| TKD flag no registo | Feito |
| PWA Instalar | Feito |

**Nota RLS:** alimentos globais leem-se sem login. Diário, plano e alimentos pessoais só sincronizam após «Entrar». Pessoais ficam sempre no browser (`ketotrack-v5`).

## Deploy (Netlify)

Config em `netlify.toml`:

- `command = "npm run build"`
- `publish = ".next"`
- plugin `@netlify/plugin-nextjs` (runtime App Router)

Variáveis no painel Netlify (Site → Environment variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (e/ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

Site: https://ketogenic-app.netlify.app/

## Instalar no telemóvel (PWA)

1. Abre https://ketogenic-app.netlify.app/ no browser.
2. Toca em **Instalar** no topo, ou Safari → Partilhar → Adicionar ao ecrã principal.
3. Abre o ícone KetoTrack no ecrã principal.

## Scripts

- `npm run dev` — porto 4321
- `npm run build` / `npm start`
- `npm run icons` — gera ícones PWA
- `npm run lint`
