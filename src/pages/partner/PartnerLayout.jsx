import { useEffect, useState } from 'react';
import { Outlet, useSearchParams, Link } from 'react-router-dom';
import { LayoutDashboard, Ticket, CalendarClock, Receipt, ScanLine, Store, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SideNav } from '../admin/AdminLayout';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/States';

const LINKS = [
  ['/partner', 'Самбар', LayoutDashboard, true],
  ['/partner/schedule', 'Эрэлт багатай цаг', CalendarClock],
  ['/partner/deals', 'Хямдрал', Ticket],
  ['/partner/bookings', 'Захиалга', Receipt],
  ['/partner/check-in', 'Тасалбар шалгах', ScanLine],
  ['/partner/profile', 'Байгууллагын мэдээлэл', Store],
];

const STORAGE_KEY = 'lm.partner.business';

// Хамтрагчийн самбар. Хамтрагч өөрийн байгууллага(ууд)-ыг, админ бүх байгууллагыг сонгож удирдана.
export default function PartnerLayout() {
  const { user, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [businesses, setBusinesses] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(() => {
    try { return params.get('b') || localStorage.getItem(STORAGE_KEY); } catch { return params.get('b'); }
  });

  const load = async () => {
    setError(null);
    let q = supabase.from('business_listings').select('*').order('name');
    if (!isAdmin) q = q.eq('owner_id', user.id);
    const { data, error: err } = await q;
    if (err) { setError(err.message); return; }
    setBusinesses(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user.id, isAdmin]);

  const select = (id) => {
    setSelectedId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* хадгалах боломжгүй орчин */ }
    if (params.get('b')) { params.delete('b'); setParams(params, { replace: true }); }
  };

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={load} /></div>;
  if (!businesses) return <PageLoader />;
  if (businesses.length === 0) {
    return (
      <div className="container-page py-10">
        <EmptyState icon={Store} title="Танд холбогдсон байгууллага алга"
                    text="Хамтрагчийн хүсэлт зөвшөөрөгдсөний дараа байгууллага тань энд гарна."
                    action={<Link to="/partner/apply" className="btn-primary">Хүсэлт илгээх</Link>} />
      </div>
    );
  }

  const business = businesses.find((b) => b.id === selectedId) ?? businesses[0];

  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[250px_1fr] lg:py-8">
      <aside className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-dusk to-midnight p-4 text-white shadow-card">
          <p className="text-xs font-bold text-white/60">Хамтрагчийн самбар</p>
          {businesses.length > 1 ? (
            <select value={business.id} onChange={(e) => select(e.target.value)} aria-label="Байгууллага сонгох"
                    className="mt-1 w-full rounded-lg bg-white/10 px-2 py-1.5 text-sm font-bold text-white outline-none [&>option]:text-ink">
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          ) : <p className="mt-1 font-extrabold">{business.name}</p>}
          <Link to={`/places/${business.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber">
            Нийтэд харагдах хуудас <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <SideNav links={LINKS} />
      </aside>
      <div className="min-w-0"><Outlet context={{ business, reload: load }} /></div>
    </div>
  );
}
