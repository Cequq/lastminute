import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { BOOKING_STATUS, fullDate, money } from '../../lib/format';
import { bookingCode } from '../../lib/format';
import Pagination from '../ui/Pagination';
import { ConfirmDialog } from '../ui/Modal';
import { Badge, EmptyState, ErrorState, Spinner } from '../ui/States';
import { PageHeader, Table } from './ManageUI';

const PAGE = 15;

// businessId байвал зөвхөн тухайн байгууллагын захиалга (хамтрагчийн самбар)
export default function BookingsManager({ businessId = null }) {
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState(null);
  const [refunding, setRefunding] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    // Админы хувьд RLS бүх захиалгыг харуулна. profiles-ийг FK-ээр нэгтгэнэ.
    let query = supabase.from('bookings')
      .select(`*, profiles(full_name, phone), deals${businessId ? '!inner' : ''}(title, starts_at, business_id, businesses(name)), payments(status, invoice_id, paid_at)`, { count: 'exact' })
      .order('created_at', { ascending: false });
    if (businessId) query = query.eq('deals.business_id', businessId);
    if (status === 'checked_in') query = query.not('checked_in_at', 'is', null);
    else if (status) query = query.eq('status', status);
    const from = (page - 1) * PAGE;
    const { data, error: err, count: c } = await query.range(from, from + PAGE - 1);
    if (err) { setError(err.message); return; }
    setRows(data);
    setCount(c ?? 0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, page, businessId]);

  // Мөнгийг QPay merchant портал эсвэл банкаар буцаасны дараа баталгаажуулна
  const markRefunded = async () => {
    setBusy(true);
    const { error: err } = await supabase.rpc('mark_refunded', { p_booking_id: refunding.id });
    setBusy(false);
    setRefunding(null);
    if (err) toast.error(err.message); else { toast.success('Буцаалт баталгаажлаа. Хэрэглэгчид мэдэгдэл очлоо.'); load(); }
  };

  const cancel = async () => {
    setBusy(true);
    const { error: err } = await supabase.rpc('cancel_booking', { p_booking_id: cancelling.id });
    setBusy(false);
    setCancelling(null);
    if (err) toast.error(err.message); else { toast.success('Захиалга цуцлагдлаа'); load(); }
  };

  return (
    <>
      <PageHeader title={businessId ? 'Захиалга' : 'Захиалга, төлбөр'} text={`${count} захиалга`}
                   action={
                     <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-48" aria-label="Төлөв">
                       <option value="">Бүх төлөв</option>
                       {Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                       <option value="checked_in">Ирсэн (шалгагдсан)</option>
                     </select>
                   } />
      {error ? <ErrorState message={error} onRetry={load} />
        : !rows ? <div className="panel grid h-60 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>
        : rows.length === 0 ? <EmptyState icon={Receipt} title="Захиалга алга" />
        : (
          <Table head={['Код', 'Хэрэглэгч', 'Хямдрал', 'Дүн', 'Төлөв', businessId ? 'Ирсэн' : 'QPay', 'Үүссэн', '']}>
            {rows.map((b) => {
              const st = BOOKING_STATUS[b.status];
              const pay = [...(b.payments ?? [])].sort((x, y) => (x.paid_at ? -1 : 1) - (y.paid_at ? -1 : 1))[0];
              return (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-display text-xs font-bold">{bookingCode(b.id)}</td>
                  <td className="px-4 py-3"><p className="font-semibold">{b.profiles?.full_name ?? '—'}</p><p className="text-xs text-ink-mute">{b.profiles?.phone}</p></td>
                  <td className="max-w-56 px-4 py-3"><p className="truncate font-semibold">{b.deals?.title}</p><p className="truncate text-xs text-ink-mute">{b.deals?.businesses?.name}</p></td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold">{money(b.total_amount)}</td>
                  <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td className="px-4 py-3 text-xs">{businessId ? (b.checked_in_at ? <span className="font-bold text-mint">{fullDate(b.checked_in_at)}</span> : <span className="text-ink-mute">—</span>) : pay ? <span className={pay.status === 'paid' ? 'font-bold text-mint' : 'text-ink-mute'}>{pay.status === 'paid' ? 'Төлсөн' : 'Нэхэмжилсэн'}</span> : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{fullDate(b.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {b.status === 'pending' && <button onClick={() => setCancelling(b)} className="btn-ghost px-2 py-1 text-xs text-rose">Цуцлах</button>}
                    {b.status === 'refund_requested' && <button onClick={() => setRefunding(b)} className="btn-primary whitespace-nowrap px-2.5 py-1 text-xs">Буцаасан</button>}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      <Pagination page={page} pageCount={Math.ceil(count / PAGE)} onChange={setPage} />
      <ConfirmDialog open={!!refunding} busy={busy} title="Төлбөр буцаасныг баталгаажуулах уу?" confirmLabel="Буцаасан"
                     message={`${refunding ? money(refunding.total_amount) : ''}-ийг QPay merchant портал эсвэл банкаар хэрэглэгчид буцаасны дараа дарна уу.${refunding?.cancel_reason ? ` Шалтгаан: ${refunding.cancel_reason}` : ''}`}
                     onConfirm={markRefunded} onCancel={() => setRefunding(null)} />
      <ConfirmDialog open={!!cancelling} busy={busy} title="Захиалга цуцлах уу?" confirmLabel="Цуцлах"
                     message="Хэрэглэгчийн хүлээгдэж буй захиалга цуцлагдаж, суудал нээгдэнэ." onConfirm={cancel} onCancel={() => setCancelling(null)} />
    </>
  );
}
