// POST { booking_id } → "Төлбөр шалгах" товч.
// Webhook ирэхгүй тохиолдолд (жишээ нь сүлжээний алдаа) QPay-ээс гараар шалгана.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { verifyAndConfirm } from '../_shared/qpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { client } = await requireUser(req);
    const { booking_id } = await req.json();

    // RLS: өөрийн захиалга мөн эсэхийг хэрэглэгчийн эрхээр шалгана
    const { data: booking } = await client.from('bookings').select('id, status').eq('id', booking_id).single();
    if (!booking) return json({ error: 'Захиалга олдсонгүй' }, 404);
    if (booking.status === 'paid') return json({ status: 'paid' });

    const admin = adminClient();
    const { data: payment } = await admin
      .from('payments')
      .select('id, invoice_id, amount, status')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment) return json({ status: booking.status });

    const paid = await verifyAndConfirm(admin, payment);
    return json({ status: paid ? 'paid' : booking.status });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Алдаа гарлаа' }, 500);
  }
});
