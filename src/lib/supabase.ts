import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { demoClient } from "./demo-db";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Demo mode: no Supabase keys set, so the app runs on built-in sample data. */
export const DEMO = !URL;

/** Supabase client acting as the signed-in user (respects RLS). */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  if (DEMO) return demoClient(store.get("demo_uid")?.value ?? null) as unknown as SupabaseClient;
  return createServerClient(URL!, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component */ }
      },
    },
  }) as unknown as SupabaseClient;
}

/** Service-role client. Server only: bypasses RLS, used for grading, payments and admin writes. */
export function supabaseAdmin(): SupabaseClient {
  if (DEMO) return demoClient(null) as unknown as SupabaseClient;
  return createClient(URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function slideUrl(courseId: string, version: number, page: number) {
  const file = `${courseId}/v${version}/${String(page).padStart(3, "0")}.webp`;
  return DEMO ? `/api/demo/slide/${file}` : `${URL}/storage/v1/object/public/slides/${file}`;
}
