-- Apagar alimento = esconder só para mim.
-- Remoção definitiva da biblioteca partilhada: só admin na base de dados.
-- Projeto: oymdacaicfyejuizyosw

-- 1) Tabela de ocultações por utilizador
create table if not exists public.user_hidden_foods (
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create index if not exists user_hidden_foods_user_idx
  on public.user_hidden_foods (user_id);

alter table public.user_hidden_foods enable row level security;

drop policy if exists "user_hidden_foods_select_own" on public.user_hidden_foods;
create policy "user_hidden_foods_select_own" on public.user_hidden_foods
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_hidden_foods_insert_own" on public.user_hidden_foods;
create policy "user_hidden_foods_insert_own" on public.user_hidden_foods
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_hidden_foods_delete_own" on public.user_hidden_foods;
create policy "user_hidden_foods_delete_own" on public.user_hidden_foods
  for delete to authenticated
  using (auth.uid() = user_id);

-- 2) Clientes NÃO podem apagar da tabela foods (só admin / SQL Editor).
drop policy if exists "foods_delete_own" on public.foods;
drop policy if exists "foods_delete_shared" on public.foods;
-- Sem policy de DELETE para authenticated/anon ⇒ só service role / dashboard.
