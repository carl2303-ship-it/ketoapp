-- Alimentos keto ricos em fibras (idempotente por nome global).
insert into public.foods (
  name, brand, category, calories, fat_g, protein_g, carbs_total_g, fiber_g, polyols_g,
  sodium_mg, potassium_mg, magnesium_mg, saturated_fat_g, is_global, user_id
)
select * from (values
  ('Sementes de linhaça', null::text, 'Sementes', 534, 42, 18, 29, 27, 0, 30, 813, 392, 3.7, true, null::uuid),
  ('Farinha de coco', null, 'Farinhas', 400, 13, 18, 60, 39, 0, 20, 850, 120, 11, true, null),
  ('Courgette / abobrinha', null, 'Vegetais', 17, 0.3, 1.2, 3.1, 1, 0, 8, 261, 18, 0.1, true, null)
) as v(
  name, brand, category, calories, fat_g, protein_g, carbs_total_g, fiber_g, polyols_g,
  sodium_mg, potassium_mg, magnesium_mg, saturated_fat_g, is_global, user_id
)
where not exists (
  select 1 from public.foods f where f.name = v.name and f.is_global = true
);
