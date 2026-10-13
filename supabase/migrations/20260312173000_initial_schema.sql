-- KetoTrack & Plan — schema inicial + RLS + seed
-- Aplicar no SQL Editor do projeto oymdacaicfyejuizyosw se o MCP/CLI não tiver permissão.

create extension if not exists "pgcrypto";

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  daily_calories_target integer not null default 2000,
  fat_ratio numeric(5,2) not null default 75,
  protein_ratio numeric(5,2) not null default 20,
  net_carb_target_g numeric(6,2) not null default 25,
  water_target_l numeric(4,2) not null default 3.0,
  sodium_target_mg integer not null default 5000,
  potassium_target_mg integer not null default 3500,
  magnesium_target_mg integer not null default 400,
  keto_variation text not null default 'skd'
    check (keto_variation in ('skd', 'high_protein', 'tkd')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. foods
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  category text,
  calories numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  carbs_total_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) not null default 0,
  polyols_g numeric(8,2) not null default 0,
  sodium_mg numeric(10,2) not null default 0,
  potassium_mg numeric(10,2) not null default 0,
  magnesium_mg numeric(10,2) not null default 0,
  saturated_fat_g numeric(8,2) not null default 0,
  is_global boolean not null default false,
  created_at timestamptz not null default now(),
  constraint foods_global_or_user check (
    (is_global = true and user_id is null) or (is_global = false and user_id is not null)
  )
);

create index if not exists foods_name_idx on public.foods using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists foods_category_idx on public.foods (category);
create index if not exists foods_user_id_idx on public.foods (user_id);

-- 3. recipes
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  instructions text,
  total_macros_json jsonb,
  created_at timestamptz not null default now()
);

-- 4. recipe_items
create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  amount_grams numeric(8,2) not null check (amount_grams > 0)
);

-- 5. daily_logs
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  water_ml integer not null default 0,
  blood_ketones numeric(6,2),
  blood_glucose numeric(6,2),
  sodium_mg numeric(10,2) not null default 0,
  potassium_mg numeric(10,2) not null default 0,
  magnesium_mg numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 6. meal_entries
create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  meal_type text not null
    check (meal_type in ('pequeno_almoco', 'almoco', 'lanche', 'jantar', 'ceia')),
  food_id uuid references public.foods (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  amount_grams numeric(8,2) not null check (amount_grams > 0),
  is_tkd_workout_carb boolean not null default false,
  created_at timestamptz not null default now(),
  constraint meal_entries_food_or_recipe check (
    food_id is not null or recipe_id is not null
  )
);

create index if not exists meal_entries_daily_log_idx on public.meal_entries (daily_log_id);

-- 7. weekly_plans
create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  meal_type text not null
    check (meal_type in ('pequeno_almoco', 'almoco', 'lanche', 'jantar', 'ceia')),
  food_id uuid not null references public.foods (id) on delete cascade,
  amount_grams numeric(8,2) not null check (amount_grams > 0),
  created_at timestamptz not null default now()
);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meal_entries enable row level security;
alter table public.weekly_plans enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- foods: globais legíveis por todos autenticados; pessoais só do dono
drop policy if exists "foods_select" on public.foods;
create policy "foods_select" on public.foods
  for select using (
    is_global = true or auth.uid() = user_id
  );
drop policy if exists "foods_insert_own" on public.foods;
create policy "foods_insert_own" on public.foods
  for insert with check (
    auth.uid() = user_id and is_global = false
  );
drop policy if exists "foods_update_own" on public.foods;
create policy "foods_update_own" on public.foods
  for update using (auth.uid() = user_id and is_global = false)
  with check (auth.uid() = user_id and is_global = false);
drop policy if exists "foods_delete_own" on public.foods;
create policy "foods_delete_own" on public.foods
  for delete using (auth.uid() = user_id and is_global = false);

-- recipes
drop policy if exists "recipes_all_own" on public.recipes;
create policy "recipes_all_own" on public.recipes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- recipe_items via recipe ownership
drop policy if exists "recipe_items_select" on public.recipe_items;
create policy "recipe_items_select" on public.recipe_items
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );
drop policy if exists "recipe_items_mutate" on public.recipe_items;
create policy "recipe_items_mutate" on public.recipe_items
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- daily_logs
drop policy if exists "daily_logs_all_own" on public.daily_logs;
create policy "daily_logs_all_own" on public.daily_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- meal_entries via daily_log
drop policy if exists "meal_entries_select" on public.meal_entries;
create policy "meal_entries_select" on public.meal_entries
  for select using (
    exists (
      select 1 from public.daily_logs d
      where d.id = daily_log_id and d.user_id = auth.uid()
    )
  );
drop policy if exists "meal_entries_mutate" on public.meal_entries;
create policy "meal_entries_mutate" on public.meal_entries
  for all using (
    exists (
      select 1 from public.daily_logs d
      where d.id = daily_log_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs d
      where d.id = daily_log_id and d.user_id = auth.uid()
    )
  );

-- weekly_plans
drop policy if exists "weekly_plans_all_own" on public.weekly_plans;
create policy "weekly_plans_all_own" on public.weekly_plans
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed ≥20 alimentos keto (globais). Idempotente por nome.
insert into public.foods (
  name, brand, category, calories, fat_g, protein_g, carbs_total_g, fiber_g, polyols_g,
  sodium_mg, potassium_mg, magnesium_mg, saturated_fat_g, is_global, user_id
)
select * from (values
  ('Azeite virgem extra', null::text, 'Gorduras', 884, 100, 0, 0, 0, 0, 2, 1, 0, 14, true, null::uuid),
  ('Abacate', null, 'Frutas', 160, 15, 2, 9, 7, 0, 7, 485, 29, 2.1, true, null),
  ('Ovos inteiros', null, 'Proteínas', 143, 9.5, 12.6, 0.7, 0, 0, 142, 138, 12, 3.1, true, null),
  ('Salmão grelhado', null, 'Proteínas', 208, 13, 22, 0, 0, 0, 59, 384, 30, 3, true, null),
  ('Manteiga', null, 'Gorduras', 717, 81, 0.9, 0.1, 0, 0, 643, 24, 2, 51, true, null),
  ('Peito de frango', null, 'Proteínas', 165, 3.6, 31, 0, 0, 0, 74, 256, 29, 1, true, null),
  ('Espinafres', null, 'Vegetais', 23, 0.4, 2.9, 3.6, 2.2, 0, 79, 558, 79, 0.1, true, null),
  ('Nozes de macadâmia', null, 'Frutos secos', 718, 76, 8, 14, 9, 0, 5, 368, 130, 12, true, null),
  ('Óleo MCT', null, 'Gorduras', 855, 95, 0, 0, 0, 0, 0, 0, 0, 95, true, null),
  ('Dextrose (TKD)', null, 'TKD', 380, 0, 0, 95, 0, 0, 1, 0, 0, 0, true, null),
  ('Pastilhas de eletrólitos', 'LMNT-like', 'Suplementos', 10, 0, 0, 2, 0, 0, 1000, 200, 60, 0, true, null),
  ('Queijo cheddar', null, 'Laticínios', 403, 33, 25, 1.3, 0, 0, 621, 98, 28, 21, true, null),
  ('Couve-flor', null, 'Vegetais', 25, 0.3, 1.9, 5, 2, 0, 30, 299, 15, 0.1, true, null),
  ('Amêndoas', null, 'Frutos secos', 579, 50, 21, 22, 12.5, 0, 1, 733, 270, 3.8, true, null),
  ('Bacon frito', null, 'Proteínas', 541, 42, 37, 1.4, 0, 0, 1717, 565, 33, 14, true, null),
  ('Iogurte grego integral', null, 'Laticínios', 97, 5, 9, 3.6, 0, 0, 36, 141, 11, 3.2, true, null),
  ('Brócolos', null, 'Vegetais', 34, 0.4, 2.8, 7, 2.6, 0, 33, 316, 21, 0.1, true, null),
  ('Atum em azeite', null, 'Proteínas', 198, 8, 29, 0, 0, 0, 376, 237, 30, 1.5, true, null),
  ('Óleo de coco', null, 'Gorduras', 862, 100, 0, 0, 0, 0, 0, 0, 0, 87, true, null),
  ('Chia', null, 'Sementes', 486, 31, 17, 42, 34, 0, 16, 407, 335, 3.3, true, null),
  ('Camarão cozido', null, 'Proteínas', 99, 0.3, 24, 0.2, 0, 0, 111, 259, 39, 0.1, true, null),
  ('Rúcula', null, 'Vegetais', 25, 0.7, 2.6, 3.7, 1.6, 0, 27, 369, 47, 0.1, true, null),
  ('Queijo fresco / cottage', null, 'Laticínios', 98, 4.3, 11, 3.4, 0, 0, 364, 104, 8, 1.7, true, null),
  ('Eritritol', null, 'Adoçantes', 20, 0, 0, 100, 0, 100, 0, 0, 0, 0, true, null)
) as v(
  name, brand, category, calories, fat_g, protein_g, carbs_total_g, fiber_g, polyols_g,
  sodium_mg, potassium_mg, magnesium_mg, saturated_fat_g, is_global, user_id
)
where not exists (
  select 1 from public.foods f where f.name = v.name and f.is_global = true
);
