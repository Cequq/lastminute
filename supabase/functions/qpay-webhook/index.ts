// QPay төлбөр орох үед энэ URL-ийг дуудна:
//   .../functions/v1/qpay-webhook?pid=<payment id>&token=<callback_token>
// QPay JWT илгээдэггүй тул энэ функцийг --no-verify-jwt-тэй байршуулна.
// Хамгаалалт: (1) таамаглах боломжгүй token, (2) QPay API-аас төлбөрийг дахин шалгах.
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';
import { verifyAndConfirm } from '../_shared/qpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const pid = url.searchParams.get('pid');
  const token = url.searchParams.get('token');
  if (!pid || !token) return new Response('Bad request', { status: 400 });

  try {
    const admin = adminClient();
    const { data: payment } = await admin
      .from('payments')
      .select('id, invoice_id, amount, status, callback_token')
      .eq('id', pid)
      .maybeSingle();

    if (!payment || payment.callback_token !== token) {
      console.warn('Webhook: буруу pid эсвэл token', pid);
      return new Response('Not found', { status: 404 });
    }

    // mock горимд token зөв байх нь "банк төлбөр хийсэн" гэсэн дохио (qpay-mock-pay дуудна)
    const paid = await verifyAndConfirm(admin, payment, { trustMock: true });
    console.log(`Webhook pid=${pid} paid=${paid}`);

    // QPay хариуд "SUCCESS" хүлээдэг
    return new Response('SUCCESS', { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response('Error', { status: 500 });
  }
});
