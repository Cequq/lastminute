import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // .env тохируулаагүй үед хөгжүүлэгчид ойлгомжтой анхааруулга
  console.error('VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY-г .env файлд тохируулна уу.');
}

// Зөвхөн anon (нийтийн) түлхүүр. Бүх хамгаалалтыг RLS хийнэ.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key');

export const QPAY_MODE = import.meta.env.VITE_QPAY_MODE ?? 'sandbox';

// Edge Function дуудах туслах. Алдааг ойлгомжтой мессеж болгон шиднэ.
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const detail = await error.context?.json();
      if (detail?.error) message = detail.error;
    } catch { /* хариу JSON биш */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
