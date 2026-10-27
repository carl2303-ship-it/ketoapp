export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://oymdacaicfyejuizyosw.supabase.co";

const PLACEHOLDER_MARKERS = [
  "your-anon",
  "xxxxxxxx",
  "your_publishable",
  "sb_publishable_xxxxxxxx",
];

function isPlaceholderKey(value: string): boolean {
  return PLACEHOLDER_MARKERS.some((m) => value.includes(m));
}

/** Escolhe a primeira chave pública que não seja placeholder. */
function firstRealKey(...candidates: Array<string | undefined>): string {
  const trimmed = candidates.map((c) => c?.trim() || "");
  for (const value of trimmed) {
    if (value && !isPlaceholderKey(value)) return value;
  }
  return trimmed.find(Boolean) || "";
}

/**
 * Preferir JWT anon (eyJ…) quando existir — REST API estável.
 * Senão publishable moderna. Ignora placeholders para não bloquear o fallback.
 * (A publishable sem hífen final dá 401; o JWT anon do projecto funciona.)
 */
export const supabaseAnonKey = firstRealKey(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function hasSupabaseCredentials(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  return !isPlaceholderKey(supabaseAnonKey);
}

export function isMockMode(): boolean {
  return !hasSupabaseCredentials();
}
