import { useEffect, useState } from 'react';
import { Search, Shield, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { fullDate } from '../../lib/format';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Badge, ErrorState, Spinner } from '../../components/ui/States';
import { AdminHeader, Table } from './AdminLayout';

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [changing, setChanging] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    const { data, error: err } = await supabase.from('profiles').select('*, bookings(count)').order('created_at', { ascending: false });
    if (err) setError(err.message); else setRows(data);
  };
  useEffect(() => { load(); }, []);

  const changeRole = async () => {
    setBusy(true);
    // Админ эрх хасахад хэрэглэгч болно. Хамтрагчийг админ болгож болно.
    const role = changing.role === 'admin' ? 'user' : 'admin';
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', changing.id);
    setBusy(false);
    setChanging(null);
    if (err) toast.error(err.message); else { toast.success('Эрх өөрчлөгдлөө'); load(); }
  };

  const filtered = rows?.filter((p) => `${p.full_name ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <AdminHeader title="Хэрэглэгч" text={rows ? `${rows.length} бүртгэлтэй хэрэглэгч` : ''} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр, утсаар хайх" className="input pl-9" aria-label="Хайх" />
      </div>
      {error ? <ErrorState message={error} onRetry={load} />
        : !filtered ? <div className="panel grid h-60 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>
        : (
          <Table head={['Нэр', 'Утас', 'Эрх', 'Захиалга', 'Бүртгүүлсэн', '']}>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-bold">{p.full_name || '—'}{p.id === user.id && <span className="ml-2 text-xs font-semibold text-ink-mute">(та)</span>}</td>
                <td className="px-4 py-3">{p.phone || '—'}</td>
                <td className="px-4 py-3">{p.role === 'admin' ? <Badge tone="brand">Админ</Badge> : p.role === 'business' ? <Badge tone="amber">Хамтрагч</Badge> : <Badge>Хэрэглэгч</Badge>}</td>
                <td className="px-4 py-3">{p.bookings?.[0]?.count ?? 0}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{fullDate(p.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {p.id !== user.id && (
                    <button onClick={() => setChanging(p)} className="btn-ghost px-2 py-1 text-xs">
                      {p.role === 'admin' ? <><ShieldOff className="h-4 w-4" /> Админ эрх хасах</> : <><Shield className="h-4 w-4" /> Админ болгох</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      <ConfirmDialog open={!!changing} busy={busy} title="Эрх өөрчлөх үү?" confirmLabel="Өөрчлөх"
                     message={changing?.role === 'admin'
                       ? `${changing?.full_name || 'Энэ хэрэглэгч'}-ийн админ эрхийг хасна.`
                       : `${changing?.full_name || 'Энэ хэрэглэгч'} бүх хямдрал, захиалга, хэрэглэгчийг удирдах эрхтэй болно.`}
                     onConfirm={changeRole} onCancel={() => setChanging(null)} />
    </>
  );
}
