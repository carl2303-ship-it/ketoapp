-- Biblioteca partilhada: todos os alimentos na mesma tabela, visíveis para todos.
-- Quando alguém autenticado adiciona, fica disponível para toda a gente.
-- Aplicar no SQL Editor do projeto oymdacaicfyejuizyosw se o MCP não tiver permissão.

-- 1) Deduplicar por nome+marca (case-insensitive): manter o mais antigo, remapear FKs.
with ranked as (
  select
    id,
    row_number() over (
      partition by lower(trim(name)), lower(trim(coalesce(brand, '')))
      order by created_at asc nulls last, id asc
    ) as rn
  from public.foods
),
dupes as (
  select id from ranked where rn > 1
),
keepers as (
  select
    d.id as dupe_id,
    k.id as keep_id
  from ranked d
  join ranked k
    on lower((select name from public.foods f where f.id = d.id))
     = lower((select name from public.foods f where f.id = k.id))
   and lower(coalesce((select brand from public.foods f where f.id = d.id), ''))
     = lower(coalesce((select brand from public.foods f where f.id = k.id), ''))
   and d.rn > 1
   and k.rn = 1
)
update public.meal_entries me
set food_id = keepers.keep_id
from keepers
where me.food_id = keepers.dupe_id;

with ranked as (
  select
    id,
    lower(trim(name)) as n,
    lower(trim(coalesce(brand, ''))) as b,
    row_number() over (
      partition by lower(trim(name)), lower(trim(coalesce(brand, '')))
      order by created_at asc nulls last, id asc
    ) as rn
  from public.foods
),
keepers as (
  select d.id as dupe_id, k.id as keep_id
  from ranked d
  join ranked k on d.n = k.n and d.b = k.b and d.rn > 1 and k.rn = 1
)
update public.weekly_plans wp
set food_id = keepers.keep_id
from keepers
where wp.food_id = keepers.dupe_id;

with ranked as (
  select
    id,
    lower(trim(name)) as n,
    lower(trim(coalesce(brand, ''))) as b,
    row_number() over (
      partition by lower(trim(name)), lower(trim(coalesce(brand, '')))
      order by created_at asc nulls last, id asc
    ) as rn
  from public.foods
),
keepers as (
  select d.id as dupe_id, k.id as keep_id
  from ranked d
  join ranked k on d.n = k.n and d.b = k.b and d.rn > 1 and k.rn = 1
)
update public.recipe_items ri
set food_id = keepers.keep_id
from keepers
where ri.food_id = keepers.dupe_id;

delete from public.foods f
where f.id in (
  select id from (
    select
      id,
      row_number() over (
        partition by lower(trim(name)), lower(trim(coalesce(brand, '')))
        order by created_at asc nulls last, id asc
      ) as rn
    from public.foods
  ) t
  where rn > 1
);

-- 2) Promover tudo a catálogo partilhado (is_global + sem dono).
update public.foods
set is_global = true, user_id = null
where is_global = false or user_id is not null;

-- 3) Índice único para impedir novos duplicados.
create unique index if not exists foods_shared_name_brand_uidx
  on public.foods (lower(trim(name)), lower(trim(coalesce(brand, ''))));

-- 4) RLS: leitura pública; escrita só autenticados (sempre como global partilhado).
drop policy if exists "foods_select" on public.foods;
create policy "foods_select" on public.foods
  for select using (true);

drop policy if exists "foods_insert_own" on public.foods;
drop policy if exists "foods_insert_shared" on public.foods;
create policy "foods_insert_shared" on public.foods
  for insert to authenticated
  with check (is_global = true and user_id is null);

drop policy if exists "foods_update_own" on public.foods;
drop policy if exists "foods_update_shared" on public.foods;
create policy "foods_update_shared" on public.foods
  for update to authenticated
  using (true)
  with check (is_global = true and user_id is null);

-- Sem DELETE para clients: "apagar" na app = ocultar (user_hidden_foods).
-- Remoção definitiva da biblioteca: só admin no SQL Editor / service role.
drop policy if exists "foods_delete_own" on public.foods;
drop policy if exists "foods_delete_shared" on public.foods;
