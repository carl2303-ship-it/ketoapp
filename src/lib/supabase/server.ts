import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseCredentials, supabaseAnonKey, supabaseUrl } from "./config";

export async function createClient() {
  if (!hasSupabaseCredentials()) {
    throw new Error(
      "Supabase credentials em falta. Define NEXT_PUBLIC_SUPABASE_ANON_KEY ou usa o modo mock.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component — ignore if middleware will refresh sessions.
        }
      },
    },
  });
}
