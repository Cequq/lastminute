// POST { deal_id, quantity }  → шинэ захиалга + QPay нэхэмжлэл үүсгэнэ
// POST { booking_id }         → хүлээгдэж буй захиалгад нэхэмжлэл дахин үүсгэнэ
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { createInvoice, QPAY_MODE } from '../_shared/qpay.ts';

const PAYMENT_COLUMNS =
  'id, booking_id, provider, invoice_id, qr_text, qr_image, short_url, bank_urls, amount, status, paid_at, created_at';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { client, user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const admin = adminClient();

    // 1. Захиалга бэлдэх
    let booking;
    if (body.booking_id) {
      // RLS: хэрэглэгч зөвхөн өөрийн захиалгыг харна
      const { data, error } = await client.from('bookings').select('*').eq('id', body.booking_id).single();
      if (error || !data) return json({ error: 'Захиалга олдсонгүй' }, 404);
      if (data.status !== 'pending') return json({ error: 'Энэ захиалга төлөх боломжгүй төлөвт байна' }, 400);
      if (new Date(data.expires_at) < new Date()) return json({ error: 'Захиалгын хугацаа дууссан' }, 400);
      booking = data;
    } else {
      if (!body.deal_id) return json({ error: 'deal_id шаардлагатай' }, 400);
      const qty = Number(body.quantity ?? 1);
      // Үнийг SQL функц тооцно — frontend-ээс ирсэн үнэд итгэхгүй
      const { data, error } = await client.rpc('create_pending_booking', {
        p_deal_id: body.deal_id,
        p_quantity: qty,
      });
      if (error) return json({ error: error.message }, 400);
      booking = data;
    }

    // 2. Төлбөрийн мөр үүсгэх (callback_token нь DB-д автоматаар үүснэ)
    const { data: payment, error: payErr } = await admin
      .from('payments')
      .insert({ booking_id: booking.id, amount: booking.total_amount, provider: 'qpay' })
      .select('id, callback_token')
      .single();
    if (payErr) throw payErr;

    const { data: deal } = await admin
      .from('deals')
      .select('title, businesses(name)')
      .eq('id', booking.deal_id)
      .single();

    // 3. QPay нэхэмжлэл. Төлбөр орход QPay энэ URL-ийг дуудна (webhook).
    const callbackUrl =
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/qpay-webhook` +
      `?pid=${payment.id}&token=${payment.callback_token}`;

    const invoice = await createInvoice({
      senderInvoiceNo: payment.id.replace(/-/g, '').slice(0, 20),
      amount: booking.total_amount,
      description: `LastMinute: ${deal?.title ?? 'Захиалга'}`.slice(0, 100),
      callbackUrl,
    });

    const { data: saved, error: updErr } = await admin
      .from('payments')
      .update({
        invoice_id: invoice.invoice_id,
        qr_text: invoice.qr_text,
        qr_image: invoice.qr_image,
        short_url: invoice.qPay_shortUrl,
        bank_urls: invoice.urls,
      })
      .eq('id', payment.id)
      .select(PAYMENT_COLUMNS)
      .single();
    if (updErr) throw updErr;

    console.log(`Invoice created user=${user.id} booking=${booking.id} amount=${booking.total_amount}`);
    return json({ booking, payment: saved, mode: QPAY_MODE });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Алдаа гарлаа' }, 500);
  }
});
