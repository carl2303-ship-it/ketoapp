import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseCredentials, supabaseAnonKey, supabaseUrl } from "./config";

export function createClient() {
  if (!hasSupabaseCredentials()) {
    throw new Error(
      "Supabase credentials em falta. Define NEXT_PUBLIC_SUPABASE_ANON_KEY ou usa o modo mock.",
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
