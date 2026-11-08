import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, RefreshCw, Smartphone, XCircle, Ticket, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, callFunction, QPAY_MODE } from '../lib/supabase';
import { useNow } from '../lib/useNow';
import { bookingCode, cancelPolicy, countdown, fullDate, money } from '../lib/format';
import QrImage from '../components/QrImage';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageLoader, ErrorState, Spinner } from '../components/ui/States';

const PAYMENT_COLUMNS = 'id, invoice_id, qr_text, qr_image, short_url, bank_urls, amount, status, paid_at, created_at';


export default function Checkout() {
  const { bookingId } = useParams();
  const now = useNow();
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('bookings')
      .select('*, deals(title, starts_at, duration_minutes, original_price, cancel_hours, businesses(name, address, district))')
      .eq('id', bookingId)
      .maybeSingle();
    if (err) { setError(err.message); return; }
    if (!data) { setError('Захиалга олдсонгүй.'); return; }
    setBooking(data);

    const { data: p } = await supabase.from('payments').select(PAYMENT_COLUMNS)
      .eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setPayment(p);
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  // Webhook захиалгын төлөвийг өөрчлөхөд Supabase Realtime-ээр шууд мэдэгдэл ирнэ
  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          setBooking((b) => (b ? { ...b, ...payload.new } : b));
          if (payload.new.status === 'paid') toast.success('Төлбөр амжилттай төлөгдлөө!');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  // Realtime тасарсан тохиолдолд 5 секунд тутам төлөвийг дахин уншина
  useEffect(() => {
    if (booking?.status !== 'pending') return;
    const t = setInterval(async () => {
      const { data } = await supabase.from('bookings').select('status, paid_at').eq('id', bookingId).single();
      if (data && data.status !== 'pending') setBooking((b) => ({ ...b, ...data }));
    }, 5000);
    return () => clearInterval(t);
  }, [booking?.status, bookingId]);

  const check = async () => {
    setChecking(true);
    try {
      const res = await callFunction('qpay-check', { booking_id: bookingId });
      if (res.status === 'paid') { toast.success('Төлбөр баталгаажлаа'); load(); }
      else toast('Төлбөр хараахан орж ирээгүй байна');
    } catch (e) { toast.error(e.message); }
    finally { setChecking(false); }
  };

  const simulate = async () => {
    setSimulating(true);
    try {
      await callFunction('qpay-mock-pay', { booking_id: bookingId });
      // Төлөв нь webhook → Realtime-ээр шинэчлэгдэнэ
    } catch (e) { toast.error(e.message); }
    finally { setSimulating(false); }
  };

  const cancel = async () => {
    setCancelling(true);
    const { error: err } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });
    setCancelling(false);
    setConfirmCancel(false);
    if (err) toast.error(err.message);
    else { toast.success('Захиалга цуцлагдлаа'); load(); }
  };

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={load} /></div>;
  if (!booking) return <PageLoader />;

  const deal = booking.deals;
  const expiresIn = Math.max(0, (new Date(booking.expires_at).getTime() - now) / 1000);
  const isExpired = booking.status === 'expired' || (booking.status === 'pending' && expiresIn <= 0);

  // ---------- ТӨЛӨГДСӨН ----------
  if (booking.status === 'paid') {
    return (
      <div className="container-page max-w-lg py-10">
        <div className="overflow-hidden rounded-3xl bg-surface shadow-xl shadow-ink/10">
          <div className="bg-mint px-6 py-8 text-center text-white">
            <CheckCircle2 className="mx-auto h-14 w-14" />
            <h1 className="mt-3 text-2xl font-bold">Захиалга баталгаажлаа</h1>
            <p className="mt-1 text-white/85">Төлбөр {booking.paid_at ? fullDate(booking.paid_at) : ''}-д төлөгдсөн</p>
          </div>
          {/* тасалбарын цоолтуур */}
          <div className="relative h-0 border-t-2 border-dashed border-line">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-paper" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-paper" />
          </div>
          <div className="p-6">
            <p className="text-sm font-bold text-ink-soft">{deal.businesses?.name}</p>
            <h2 className="mt-1 font-sans text-lg font-extrabold">{deal.title}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-ink-mute">Цаг</dt><dd className="font-bold">{fullDate(deal.starts_at)}</dd></div>
              <div><dt className="text-ink-mute">Тоо</dt><dd className="font-bold">{booking.quantity}</dd></div>
              <div><dt className="text-ink-mute">Төлсөн</dt><dd className="font-bold">{money(booking.total_amount)}</dd></div>
              <div><dt className="text-ink-mute">Хэмнэсэн</dt><dd className="font-bold text-mint">{money((deal.original_price - booking.unit_price) * booking.quantity)}</dd></div>
            </dl>
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-paper p-5">
              <QrImage text={`MINUT:${booking.id}`} size={160} />
              <p className="mt-3 font-display text-xl font-bold tracking-widest">{bookingCode(booking.id)}</p>
              {booking.checked_in_at
                ? <p className="mt-1 rounded-lg bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand">{fullDate(booking.checked_in_at)}-д ашигласан</p>
                : <p className="text-xs text-ink-mute">Энэ кодыг газар дээр нь үзүүлнэ үү</p>}
            </div>
            <p className={`mt-5 rounded-xl px-3 py-2.5 text-xs font-semibold ${cancelPolicy(deal.cancel_hours).refundable ? 'bg-mint-tint text-mint' : 'bg-paper text-ink-soft'}`}>
              {cancelPolicy(deal.cancel_hours).long}{cancelPolicy(deal.cancel_hours).refundable && ' Цуцлахдаа «Миний захиалга» хэсгийг ашиглана.'}
            </p>
            <Link to="/account/bookings" className="btn-dark mt-4 w-full"><Ticket className="h-4 w-4" /> Миний захиалгууд</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- ЦУЦЛАГДСАН / ХУГАЦАА ДУУССАН ----------
  if (booking.status === 'refund_requested' || booking.status === 'refunded') {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <XCircle className="mx-auto h-14 w-14 text-ink-mute" />
        <h1 className="mt-4 text-2xl font-bold">{booking.status === 'refunded' ? 'Төлбөр буцаагдсан' : 'Буцаалт хүлээгдэж байна'}</h1>
        <p className="mt-2 text-ink-soft">
          {booking.status === 'refunded'
            ? `${money(booking.total_amount)} таны данс руу буцаагдсан. Энэ тасалбар хүчингүй болсон.`
            : `Захиалгыг цуцалсан. ${money(booking.total_amount)} 1–3 ажлын өдөрт буцаагдана.`}
        </p>
        <Link to="/account/bookings" className="btn-primary mt-6">Миний захиалга</Link>
      </div>
    );
  }

  if (booking.status === 'cancelled' || isExpired) {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <XCircle className="mx-auto h-14 w-14 text-ink-mute" />
        <h1 className="mt-4 text-2xl font-bold">{booking.status === 'cancelled' ? 'Захиалга цуцлагдсан' : 'Төлбөрийн хугацаа дууссан'}</h1>
        <p className="mt-2 text-ink-soft">Суудал бусдад нээгдсэн. Одоогийн үнээр дахин захиалах боломжтой. Магадгүй бүр хямдарсан байх.</p>
        <Link to={`/deals/${booking.deal_id}`} className="btn-primary mt-6">Дахин захиалах</Link>
      </div>
    );
  }

  // ---------- ХҮЛЭЭГДЭЖ БУЙ ----------
  const banks = Array.isArray(payment?.bank_urls) ? payment.bank_urls : [];

  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Төлбөр төлөх</h1>
      <p className="mt-1 text-ink-soft">Банкны аппаараа QR кодыг уншуулна уу. Төлмөгц энэ хуудас автоматаар шинэчлэгдэнэ.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="panel flex flex-col items-center p-6 sm:p-8">
          <div className={`mb-5 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${expiresIn < 180 ? 'bg-rose-tint text-rose' : 'bg-amber-tint text-amber-ink'}`}>
            <Clock className="h-4 w-4" /> Үнэ түгжигдсэн: {countdown(expiresIn)}
          </div>

          {payment ? (
            <QrImage base64={payment.qr_image} text={payment.qr_text} size={240} className="border border-line p-2" />
          ) : (
            <div className="grid h-60 w-60 place-items-center"><Spinner className="h-8 w-8 text-brand" /></div>
          )}

          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Spinner className="h-4 w-4 text-brand" /> Төлбөр хүлээж байна
          </p>

          {banks.length > 0 && (
            <div className="mt-6 w-full md:hidden">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Smartphone className="h-4 w-4" /> Банкны аппаар нээх</p>
              <div className="grid grid-cols-3 gap-2">
                {banks.slice(0, 12).map((b) => (
                  <a key={b.name} href={b.link} className="flex flex-col items-center gap-1 rounded-xl border border-line p-2 text-center text-[11px] font-semibold">
                    <img src={b.logo} alt="" className="h-8 w-8 rounded-lg" loading="lazy" />
                    <span className="line-clamp-1">{b.description}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <button onClick={check} disabled={checking} className="btn-outline flex-1">
              {checking ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Төлбөр шалгах
            </button>
            {QPAY_MODE === 'mock' && (
              <button onClick={simulate} disabled={simulating} className="btn-dark flex-1">
                {simulating ? <Spinner className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />} Төлсөн мэт турших
              </button>
            )}
          </div>
          {QPAY_MODE === 'mock' && (
            <p className="mt-3 text-center text-xs text-ink-mute">
              Туршилтын горим: товч нь банкны оронд webhook URL-ийг дуудна. Захиалгын төлөв webhook-оор шинэчлэгдэнэ.
            </p>
          )}
        </div>

        <aside className="panel h-fit p-6">
          <p className="text-sm font-bold text-ink-soft">{deal.businesses?.name}</p>
          <h2 className="mt-1 font-sans text-base font-extrabold">{deal.title}</h2>
          <p className="mt-1 text-sm text-ink-mute">{fullDate(deal.starts_at)}</p>
          <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Нэгж үнэ</dt><dd className="font-semibold">{money(booking.unit_price)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Тоо</dt><dd className="font-semibold">× {booking.quantity}</dd></div>
            <div className="flex justify-between text-mint"><dt>Хэмнэлт</dt><dd className="font-semibold">−{money((deal.original_price - booking.unit_price) * booking.quantity)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-bold">Төлөх дүн</dt><dd className="font-display font-bold">{money(booking.total_amount)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-ink-mute">Захиалгын код: <b className="text-ink">{bookingCode(booking.id)}</b></p>
          <button onClick={() => setConfirmCancel(true)} className="btn-ghost mt-4 w-full text-rose">Захиалга цуцлах</button>
        </aside>
      </div>

      <ConfirmDialog open={confirmCancel} title="Захиалга цуцлах уу?" busy={cancelling}
                     message="Цуцалсны дараа энэ үнэ түгжигдэхээ болиж, суудал бусдад нээгдэнэ."
                     confirmLabel="Цуцлах" onConfirm={cancel} onCancel={() => setConfirmCancel(false)} />
    </div>
  );
}
