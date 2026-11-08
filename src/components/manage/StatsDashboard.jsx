import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Receipt, Users, PiggyBank, ScanLine, Inbox } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../../lib/supabase';
import { BOOKING_STATUS, money } from '../../lib/format';
import { DEAL_TYPES } from '../../lib/ub';
import { ErrorState, PageLoader } from '../ui/States';
import { useChartColors } from '../../context/ThemeContext';
import { Table } from './ManageUI';

const STATUS_COLORS = { paid: '#2F8F5B', pending: '#EDB45C', cancelled: '#8c89a6', expired: '#a8a5c2' };
const short = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}сая` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v);

function Kpi({ icon: Icon, label, value, sub, tone = 'text-brand bg-brand-tint' }) {
  return (
    <div className="panel p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-4 text-sm font-semibold text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-mute">{sub}</p>}
    </div>
  );
}

// businessId байхгүй → бүх платформын (админ), байвал тухайн байгууллагын статистик
export default function StatsDashboard({ businessId = null }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(14);
  const global = !businessId;
  const c = useChartColors();
  const axis = { fontSize: 11, fill: c.axis };
  const tooltipStyle = c.tooltip;

  const load = async () => {
    setError(null);
    // dashboard_stats() нь эрхийг дотроо шалгадаг (админ эсвэл байгууллагын эзэн)
    const { data, error: err } = await supabase.rpc('dashboard_stats', { p_business_id: businessId, p_days: days });
    if (err) setError(err.message); else setStats(data);
  };

  useEffect(() => { setStats(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days, businessId]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <PageLoader />;

  const conversion = stats.total_bookings ? Math.round((stats.paid_bookings / stats.total_bookings) * 100) : 0;
  const statusData = (stats.by_status ?? []).map((s) => ({ ...s, label: BOOKING_STATUS[s.status]?.label ?? s.status }));
  const typeData = Object.entries(DEAL_TYPES).map(([k, t]) => {
    const row = (stats.by_type ?? []).find((x) => x.deal_type === k);
    return { name: t.label, color: t.color, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 };
  });
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: String(h).padStart(2, '0'), orders: (stats.by_hour ?? []).find((x) => x.hour === h)?.orders ?? 0 }));

  return (
    <>
      {global && stats.pending_partners > 0 && (
        <Link to="/admin/requests" className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-tint px-4 py-3 text-sm font-bold text-amber-ink">
          <Inbox className="h-5 w-5" /> {stats.pending_partners} хамтрагчийн хүсэлт шийдвэр хүлээж байна
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="Орлого" value={money(stats.total_revenue)} sub={`${stats.paid_bookings} төлөгдсөн захиалга`} />
        <Kpi icon={Receipt} label="Төлбөрийн хувь" value={`${conversion}%`} sub={`${stats.total_bookings} захиалгаас`} tone="text-amber-ink bg-amber-tint" />
        {global
          ? <Kpi icon={Users} label="Хэрэглэгч" value={stats.total_users} sub={`7 хоногт +${stats.new_users_7d}, ${stats.businesses} байгууллага`} tone="text-mint bg-mint-tint" />
          : <Kpi icon={ScanLine} label="Ирсэн үйлчлүүлэгч" value={stats.checked_in} sub="Тасалбар шалгагдсан" tone="text-mint bg-mint-tint" />}
        <Kpi icon={PiggyBank} label="Үйлчлүүлэгчдийн хэмнэлт" value={money(stats.total_saved)} sub={`${stats.active_deals} идэвхтэй хямдрал`} tone="text-ember bg-ember-tint" />
      </div>

      <section className="panel mt-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-base font-extrabold">Өдөр тутмын орлого</h2>
          <div className="flex gap-1 rounded-xl bg-paper p-1">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1 text-xs font-bold ${days === d ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft'}`}>{d} хоног</button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={stats.daily ?? []} margin={{ left: -8, right: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.brand} stopOpacity={0.3} /><stop offset="100%" stopColor={c.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={short} tick={axis} axisLine={false} tickLine={false} width={58} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => (n === 'revenue' ? [money(v), 'Орлого'] : [v, 'Захиалга'])} />
              <Area type="monotone" dataKey="revenue" stroke={c.brand} strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-sans text-base font-extrabold">Хямдралын төрлөөр орлого</h2>
          <p className="mb-4 text-xs text-ink-mute">Аль төрлийн хямдрал хамгийн их үйлчлүүлэгч татаж байна</p>
          <div className="space-y-4">
            {typeData.map((t) => {
              const max = Math.max(1, ...typeData.map((x) => x.revenue));
              return (
                <div key={t.name}>
                  <div className="mb-1.5 flex justify-between text-sm"><span className="font-bold">{t.name}</span><span className="text-ink-soft">{money(t.revenue)}, {t.orders} захиалга</span></div>
                  <div className="h-2.5 rounded-full bg-paper"><div className="h-full rounded-full" style={{ width: `${(t.revenue / max) * 100}%`, background: t.color }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-sans text-base font-extrabold">Захиалсан цагууд</h2>
          <p className="mb-4 text-xs text-ink-mute">Төлөгдсөн захиалгын эхлэх цаг. Эрэлт багатай цагууд дүүрч байна уу?</p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={hourData} margin={{ left: -20, right: 4 }}>
                <XAxis dataKey="hour" tick={axis} axisLine={false} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Захиалга']} labelFormatter={(h) => `${h}:00`} cursor={{ fill: c.cursor }} />
                <Bar dataKey="orders" fill="#E4684A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {global && (
          <section className="panel p-5">
            <h2 className="mb-4 font-sans text-base font-extrabold">Ангиллаар орлого</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={stats.by_category ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tickFormatter={short} tick={axis} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...axis, fill: c.axisStrong }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(v), 'Орлого']} cursor={{ fill: c.cursor }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={18}>
                    {(stats.by_category ?? []).map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="panel p-5">
          <h2 className="mb-4 font-sans text-base font-extrabold">Захиалгын төлөв</h2>
          {statusData.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-mute">Захиалга хараахан алга</p>
          ) : (
            <div className="space-y-4 pt-2">
              {statusData.map((s) => {
                const pct = Math.round((s.count / stats.total_bookings) * 100);
                return (
                  <div key={s.status}>
                    <div className="mb-1.5 flex justify-between text-sm"><span className="font-bold">{s.label}</span><span className="text-ink-soft">{s.count} ({pct}%)</span></div>
                    <div className="h-2.5 rounded-full bg-paper"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLORS[s.status] }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-sans text-base font-extrabold">{global ? 'Шилдэг байгууллагууд' : 'Шилдэг хямдралууд'}</h2>
        <Table head={[global ? 'Байгууллага' : 'Хямдрал', 'Захиалга', 'Орлого']}>
          {(stats.top ?? []).length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-mute">Төлөгдсөн захиалга хараахан алга</td></tr>
          ) : stats.top.map((b) => (
            <tr key={b.name}><td className="px-4 py-3 font-bold">{b.name}</td><td className="px-4 py-3">{b.orders}</td><td className="px-4 py-3 font-bold">{money(b.revenue)}</td></tr>
          ))}
        </Table>
      </section>
    </>
  );
}
