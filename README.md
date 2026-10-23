# KetoTrack & Plan

Web app cetogénica + performance: macros, net carbs, diário alimentar e planeamento.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui + Lucide + Recharts + Zustand
- Supabase (PostgreSQL + RLS + Auth)

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

## Funcionalidades (slice atual)

| Área | Estado |
|---|---|
| Dashboard (anel macros + cartões) | Feito |
| Registo de alimentos / diário | Feito |
| Gestão de alimentos (lista remota Supabase) | Feito |
| Planeador semanal (Seg–Dom, copiar dia, lista compras) | Feito |
| Eletrólitos + GKI | Feito |
| Login (sync RLS diário/plano) | Feito (password) |
| Receitas | Stub |
| TKD flag no registo | Feito |

**Nota RLS:** alimentos globais leem-se sem login. Diário, plano e alimentos pessoais só sincronizam após «Entrar».

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

A app é uma Progressive Web App — não vai à App Store / Play Store.

1. Abre https://ketogenic-app.netlify.app/ no browser (Safari no iPhone; Chrome no Android).
2. Toca em **Instalar** no topo da app, ou:
   - **iPhone:** Partilhar → Adicionar ao ecrã principal
   - **Android:** menu ⋮ → Instalar aplicação / Adicionar ao ecrã principal
3. Abre o ícone KetoTrack no ecrã principal (modo standalone).

Requisitos: HTTPS (Netlify já tem), manifesto + ícones + service worker (`/sw.js`).

## Scripts

- `npm run dev` — porto 4321
- `npm run build` / `npm start`
- `npm run lint`
