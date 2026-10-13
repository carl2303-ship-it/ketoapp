export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://oymdacaicfyejuizyosw.supabase.co";

/** Prefer publishable key; fall back to legacy anon JWT. */
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

const PLACEHOLDER_MARKERS = [
  "your-anon",
  "xxxxxxxx",
  "your_publishable",
  "sb_publishable_xxxxxxxx",
];

export function hasSupabaseCredentials(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  return !PLACEHOLDER_MARKERS.some((m) => supabaseAnonKey.includes(m));
}

export function isMockMode(): boolean {
  return !hasSupabaseCredentials();
}
