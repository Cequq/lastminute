// Зөвхөн QPAY_MODE=mock үед: "банкны аппаар төлсөн" үйлдлийг дуурайна.
// Төлбөрийг шууд батлахгүй — QPay-ийн адилаар webhook URL-ийг HTTP-ээр дуудна.
// Ингэснээр webhook → төлөв шинэчлэгдэх урсгал бодитоор ажиллаж байгааг харуулна.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { QPAY_MODE } from '../_shared/qpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (QPAY_MODE !== 'mock') return json({ error: 'Mock горим идэвхгүй' }, 403);

  try {
    const { client } = await requireUser(req);
    const { booking_id } = await req.json();

    const { data: booking } = await client.from('bookings').select('id, status').eq('id', booking_id).single();
    if (!booking) return json({ error: 'Захиалга олдсонгүй' }, 404);

    const admin = adminClient();
    const { data: payment } = await admin
      .from('payments')
      .select('id, callback_token')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/qpay-webhook?pid=${payment!.id}&token=${payment!.callback_token}`,
    );
    return json({ webhook_status: res.status, body: await res.text() });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Алдаа гарлаа' }, 500);
  }
});
