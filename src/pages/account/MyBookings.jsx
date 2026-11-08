import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Star, Undo2, ShieldCheck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { BOOKING_STATUS, bookingCode, cancelPolicy, fullDate, money } from '../../lib/format';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Badge, EmptyState, ErrorState, PageLoader, Spinner } from '../../components/ui/States';
import Field from '../../components/ui/Field';

const TABS = [['all', 'Бүгд'], ['pending', 'Хүлээгдэж буй'], ['paid', 'Төлөгдсөн'], ['refund', 'Буцаалт'], ['cancelled', 'Цуцлагдсан']];

// Төлөгдсөн захиалгыг үнэгүй цуцлах боломж байгаа эсэх
const refundDeadline = (b) => new Date(new Date(b.deals.starts_at).getTime() - b.deals.cancel_hours * 3600000);
const canRefund = (b) => b.status === 'paid' && !b.checked_in_at && b.deals.cancel_hours > 0 && refundDeadline(b) > new Date();

// Хүлээгдэж буй боловч хугацаа нь өнгөрсөн захиалгыг "Хугацаа дууссан" гэж харуулна
const effectiveStatus = (b) => (b.status === 'pending' && new Date(b.expires_at) < new Date() ? 'expired' : b.status);

function RefundModal({ booking, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('request_refund', { p_booking_id: booking.id, p_reason: reason });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Буцаалтын хүсэлт илгээгдлээ');
    onDone();
  };
  return (
    <Modal open onClose={busy ? undefined : onClose} title="Захиалга цуцалж, төлбөр буцаах">
      <div className="rounded-xl bg-mint-tint p-4 text-sm">
        <p className="flex items-center gap-2 font-bold text-mint"><ShieldCheck className="h-4 w-4" /> {money(booking.total_amount)} буцаагдана</p>
        <p className="mt-1 text-ink-soft">{cancelPolicy(booking.deals.cancel_hours).long}</p>
        <p className="mt-1 text-ink-soft">Төлбөр төлсөн данс руу 1–3 ажлын өдөрт орно.</p>
      </div>
      <div className="mt-4">
        <Field id="reason" as="textarea" label="Шалтгаан" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)}
               hint="Заавал биш. Байгууллагад туслах болно." placeholder="Төлөвлөгөө өөрчлөгдсөн…" />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className="btn-outline">Болих</button>
        <button onClick={submit} disabled={busy} className="btn-danger">{busy && <Spinner className="h-4 w-4" />} Цуцалж, буцаалт авах</button>
      </div>
    </Modal>
  );
}

function ReviewModal({ booking, onClose, onSaved }) {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (comment.length > 500) { toast.error('Сэтгэгдэл 500 тэмдэгтээс ихгүй байна'); return; }
    setBusy(true);
    // RLS: зөвхөн өөрийн ТӨЛӨГДСӨН захиалга дээр бичих боломжтой
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      business_id: booking.deals.business_id,
      booking_id: booking.id,
      rating,
      comment: comment.trim() || null,
      author_name: profile?.full_name || 'Хэрэглэгч',
    });
    setBusy(false);
    if (error) { toast.error(error.code === '23505' ? 'Энэ захиалгад үнэлгээ өгсөн байна' : error.message); return; }
    toast.success('Үнэлгээ хадгалагдлаа. Баярлалаа!');
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Үнэлгээ өгөх">
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm font-bold">{booking.deals.businesses?.name}</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Од">
          {[1, 2, 3, 4, 5].map((i) => (
            <button type="button" key={i} onClick={() => setRating(i)} role="radio" aria-checked={rating === i} aria-label={`${i} од`}>
              <Star className={`h-9 w-9 transition-colors ${i <= rating ? 'fill-amber text-amber' : 'text-line'}`} />
            </button>
          ))}
        </div>
        <Field id="comment" as="textarea" label="Сэтгэгдэл" value={comment} maxLength={500}
               onChange={(e) => setComment(e.target.value)} hint={`${comment.length}/500`} placeholder="Үйлчилгээ ямар байсан бэ?" />
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Үнэлгээ илгээх</button>
      </form>
    </Modal>
  );
}

export default function MyBookings() {
  const [rows, setRows] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [reviewFor, setReviewFor] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [refundFor, setRefundFor] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setError(null);
    // RLS-ийн ачаар зөвхөн өөрийн захиалга ирнэ — user_id-ээр шүүх шаардлагагүй
    const [b, r] = await Promise.all([
      supabase.from('bookings')
        .select('*, deals(id, title, starts_at, business_id, original_price, cancel_hours, businesses(name, district))')
        .order('created_at', { ascending: false }),
      supabase.from('reviews').select('booking_id'),
    ]);
    if (b.error) { setError(b.error.message); return; }
    setRows(b.data);
    setReviewed(new Set((r.data ?? []).map((x) => x.booking_id)));
  };

  useEffect(() => { load(); }, []);

  const cancel = async () => {
    setCancelling(true);
    const { error: err } = await supabase.rpc('cancel_booking', { p_booking_id: cancelId });
    setCancelling(false);
    setCancelId(null);
    if (err) toast.error(err.message); else { toast.success('Захиалга цуцлагдлаа'); load(); }
  };

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={load} /></div>;
  if (!rows) return <PageLoader />;

  const filtered = rows.filter((b) => {
    const s = effectiveStatus(b);
    return tab === 'all' || s === tab || (tab === 'cancelled' && s === 'expired') || (tab === 'refund' && s.startsWith('refund'));
  });
  const totalSaved = rows.filter((b) => b.status === 'paid')
    .reduce((s, b) => s + (b.deals.original_price - b.unit_price) * b.quantity, 0);

  return (
    <div className="container-page max-w-4xl py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Миний захиалга</h1>
        {totalSaved > 0 && (
          <p className="rounded-xl bg-mint-tint px-4 py-2 text-sm font-bold text-mint">Нийт {money(totalSaved)} хэмнэсэн</p>
        )}
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === k ? 'bg-ink text-paper' : 'bg-surface text-ink-soft'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={Ticket} title="Энд захиалга алга"
                      text="Ойрын цагуудаас хямдралтайг нь сонгоод захиалаарай."
                      action={<Link to="/deals" className="btn-primary">Хямдрал үзэх</Link>} />
        ) : filtered.map((b) => {
          const s = effectiveStatus(b);
          const st = BOOKING_STATUS[s];
          return (
            <article key={b.id} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {b.checked_in_at && <Badge tone="brand">Ашигласан</Badge>}
                  <span className="text-xs font-semibold text-ink-mute">#{bookingCode(b.id)}</span>
                </div>
                <h2 className="mt-2 truncate font-sans text-base font-extrabold">
                  <Link to={`/deals/${b.deals.id}`} className="hover:text-brand">{b.deals.title}</Link>
                </h2>
                <p className="text-sm text-ink-soft">{b.deals.businesses?.name}, {fullDate(b.deals.starts_at)}</p>
                {s === 'paid' && !b.checked_in_at && (
                  <p className={`mt-1.5 flex items-center gap-1 text-xs font-bold ${canRefund(b) ? 'text-mint' : 'text-ink-mute'}`}>
                    {canRefund(b) ? <><ShieldCheck className="h-3.5 w-3.5" /> {fullDate(refundDeadline(b))} хүртэл үнэгүй цуцлах боломжтой</>
                      : <><Ban className="h-3.5 w-3.5" /> {b.deals.cancel_hours ? 'Үнэгүй цуцлах хугацаа өнгөрсөн' : 'Буцаалтгүй хямдрал'}</>}
                  </p>
                )}
                {s === 'refund_requested' && <p className="mt-1.5 text-xs font-bold text-amber-ink">Байгууллага төлбөрийг 1–3 ажлын өдөрт буцаана.</p>}
                {s === 'refunded' && <p className="mt-1.5 text-xs font-bold text-brand">{b.refunded_at ? fullDate(b.refunded_at) : ''} буцаагдсан</p>}
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <span className="font-display text-lg font-bold">{money(b.total_amount)}</span>
                <div className="flex gap-2">
                  {s === 'pending' && <>
                    <button onClick={() => setCancelId(b.id)} className="btn-ghost px-3 py-2 text-rose">Цуцлах</button>
                    <Link to={`/checkout/${b.id}`} className="btn-primary px-3 py-2">Төлөх</Link>
                  </>}
                  {canRefund(b) && <button onClick={() => setRefundFor(b)} className="btn-ghost px-3 py-2 text-rose"><Undo2 className="h-4 w-4" /> Цуцлах</button>}
                  {s === 'paid' && <Link to={`/checkout/${b.id}`} className="btn-outline px-3 py-2">Тасалбар</Link>}
                  {s === 'paid' && !reviewed.has(b.id) && (
                    <button onClick={() => setReviewFor(b)} className="btn-dark px-3 py-2"><Star className="h-4 w-4" /> Үнэлэх</button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {refundFor && <RefundModal booking={refundFor} onClose={() => setRefundFor(null)} onDone={() => { setRefundFor(null); load(); }} />}
      {reviewFor && <ReviewModal booking={reviewFor} onClose={() => setReviewFor(null)} onSaved={() => { setReviewFor(null); load(); }} />}
      <ConfirmDialog open={!!cancelId} title="Захиалга цуцлах уу?" busy={cancelling} confirmLabel="Цуцлах"
                     message="Төлбөр хийгдээгүй тул мөнгө суутгагдахгүй. Цуцалсны дараа суудал бусдад нээгдэнэ."
                     onConfirm={cancel} onCancel={() => setCancelId(null)} />
    </div>
  );
}
