import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Supabase шинэ (publishable/secret) болон хуучин (anon/service_role) түлхүүрийн аль алинд ажиллана.
// Шинэ түлхүүрүүд SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS-д JSON хэлбэрээр ({"default": "..."}) байдаг.
function pickKey(legacyName: string, newName: string): string {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try {
    const parsed = JSON.parse(Deno.env.get(newName) ?? '{}');
    return parsed.default ?? Object.values(parsed)[0] ?? '';
  } catch {
    return '';
  }
}

const URL = Deno.env.get('SUPABASE_URL')!;
const PUBLIC_KEY = pickKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
const SECRET_KEY = pickKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');

// Нууц түлхүүр нь зөвхөн серверт (Edge Function) байна. RLS-ийг тойрдог тул зөвхөн төлбөр бичихэд ашиглана.
export function adminClient(): SupabaseClient {
  return createClient(URL, SECRET_KEY, { auth: { persistSession: false } });
}

// Хэрэглэгчийн токеноор ажиллах клиент — RLS бүрэн хэрэгжинэ, auth.uid() ажиллана.
export function userClient(req: Request): SupabaseClient {
  return createClient(URL, PUBLIC_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

// Платформын verify_jwt-д найдахгүй: токеныг Supabase Auth-аар өөрөө шалгана.
// Ингэснээр шинэ, хуучин түлхүүрийн аль алинд ажиллана.
export async function requireUser(req: Request) {
  const client = userClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Нэвтрээгүй байна');
  return { client, user: data.user };
}
