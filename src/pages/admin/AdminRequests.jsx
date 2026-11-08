import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Inbox, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { fullDate } from '../../lib/format';
import { Modal } from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { AdminHeader } from './AdminLayout';

const STATUS = { pending: ['Хүлээгдэж буй', 'amber'], approved: ['Зөвшөөрсөн', 'mint'], rejected: ['Татгалзсан', 'mute'] };

export default function AdminRequests() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  const load = async () => {
    setError(null);
    let q = supabase.from('partner_requests').select('*, categories(name), profiles(full_name)').order('created_at', { ascending: false });
    if (filter) q = q.eq('status', filter);
    const { data, error: err } = await q;
    if (err) setError(err.message); else setRows(data);
  };
  useEffect(() => { setRows(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  // Зөвшөөрөхөд: байгууллага үүсч, хэрэглэгч "business" эрхтэй болж, мэдэгдэл очно (бүгд нэг SQL функцэд)
  const approve = async (r) => {
    setBusyId(r.id);
    const { error: err } = await supabase.rpc('approve_partner_request', { p_request_id: r.id });
    setBusyId(null);
    if (err) toast.error(err.message); else { toast.success(`${r.business_name} хамтрагч боллоо`); load(); }
  };

  const reject = async () => {
    setBusyId(rejecting.id);
    const { error: err } = await supabase.rpc('reject_partner_request', { p_request_id: rejecting.id, p_note: note });
    setBusyId(null);
    setRejecting(null);
    setNote('');
    if (err) toast.error(err.message); else { toast.success('Хүсэлт татгалзагдлаа'); load(); }
  };

  return (
    <>
      <AdminHeader title="Хамтрагчийн хүсэлт" text="Платформд нэгдэх хүсэлт илгээсэн байгууллагууд"
        action={
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-48" aria-label="Төлөв">
            <option value="pending">Хүлээгдэж буй</option>
            <option value="approved">Зөвшөөрсөн</option>
            <option value="rejected">Татгалзсан</option>
            <option value="">Бүгд</option>
          </select>
        } />
      {error ? <ErrorState message={error} onRetry={load} />
        : !rows ? <div className="panel grid h-60 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>
        : rows.length === 0 ? <EmptyState icon={Inbox} title="Хүсэлт алга" text="Шинэ хүсэлт ирэхэд энд харагдана." />
        : (
          <div className="space-y-3">
            {rows.map((r) => {
              const [label, tone] = STATUS[r.status];
              return (
                <article key={r.id} className="panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-sans text-base font-extrabold">{r.business_name}</h2>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{r.categories?.name}, илгээсэн: {r.profiles?.full_name || '—'}, {fullDate(r.created_at)}</p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-ink-mute" /> {r.district}{r.address ? `, ${r.address}` : ''}</span>
                        <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-ink-mute" /> {r.phone}</span>
                      </p>
                      {r.message && <p className="mt-3 rounded-xl bg-paper p-3 text-sm text-ink-soft">{r.message}</p>}
                      {r.admin_note && <p className="mt-2 text-xs text-ink-mute">Тэмдэглэл: {r.admin_note}</p>}
                    </div>
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => setRejecting(r)} disabled={busyId === r.id} className="btn-outline text-rose"><X className="h-4 w-4" /> Татгалзах</button>
                        <button onClick={() => approve(r)} disabled={busyId === r.id} className="btn-primary">
                          {busyId === r.id ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Зөвшөөрөх
                        </button>
                      </div>
                    ) : r.business_id && (
                      <Link to={`/partner?b=${r.business_id}`} className="btn-outline">Байгууллагыг удирдах</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Хүсэлт татгалзах">
        <p className="mb-4 text-sm text-ink-soft">Шалтгааныг бичвэл хэрэглэгчид мэдэгдлээр очно.</p>
        <Field id="note" as="textarea" label="Шалтгаан" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setRejecting(null)} className="btn-outline">Болих</button>
          <button onClick={reject} disabled={busyId} className="btn-danger">{busyId && <Spinner className="h-4 w-4" />} Татгалзах</button>
        </div>
      </Modal>
    </>
  );
}
