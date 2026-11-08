import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, Search, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { iconFor } from '../lib/icons';
import { distanceKm, getMyLocation, kmLabel } from '../lib/geo';
import PlacesMap from '../components/PlacesMap';
import { ErrorState, Spinner } from '../components/ui/States';

export default function MapPage() {
  const [places, setPlaces] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [onlyNow, setOnlyNow] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);

  const load = async () => {
    setError(null);
    const [p, c] = await Promise.all([
      supabase.from('business_listings').select('*').eq('is_active', true),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    if (p.error) { setError(p.error.message); return; }
    setPlaces(p.data);
    setCategories(c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const locate = async () => {
    setLocating(true);
    try { setMe(await getMyLocation()); toast.success('Ойр газруудыг эхэнд харууллаа'); }
    catch (e) { toast.error(e.message); }
    finally { setLocating(false); }
  };

  const list = useMemo(() => {
    if (!places) return [];
    const s = q.trim().toLowerCase();
    return places
      .filter((p) => (!category || p.category_slug === category) && (!onlyNow || p.quiet_discount_now) && (!s || p.name.toLowerCase().includes(s)))
      .map((p) => ({ ...p, _km: distanceKm(me, p) }))
      .sort((a, b) => (me ? (a._km ?? 1e9) - (b._km ?? 1e9) : (b.quiet_discount_now ?? 0) - (a.quiet_discount_now ?? 0) || b.active_deals - a.active_deals));
  }, [places, category, onlyNow, q, me]);

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Газрын зураг</h1>
          <p className="mt-1 text-sm text-ink-soft">Хувиар тэмдэглэгдсэн газрууд яг одоо эрэлт багатай цагаа хямдруулж байна.</p>
        </div>
        <button onClick={locate} disabled={locating} className="btn-outline">
          {locating ? <Spinner className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />} Миний байршил
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button onClick={() => setOnlyNow((v) => !v)} aria-pressed={onlyNow}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${onlyNow ? 'bg-mint text-white' : 'bg-surface text-ink-soft shadow-card'}`}>
          <span className={`h-2 w-2 rounded-full ${onlyNow ? 'bg-surface' : 'bg-mint'}`} /> Яг одоо хямдралтай
        </button>
        <button onClick={() => setCategory('')}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${!category ? 'bg-ink text-paper' : 'bg-surface text-ink-soft shadow-card'}`}>Бүгд</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.slug)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === c.slug ? 'text-white' : 'bg-surface text-ink-soft shadow-card'}`}
                  style={category === c.slug ? { background: c.color } : undefined}>{c.name}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="order-2 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:order-1 lg:h-[640px]">
          <div className="relative border-b border-line p-3">
            <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэрээр хайх" className="input pl-9" aria-label="Нэрээр хайх" />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {!places ? <li className="grid h-40 place-items-center"><Spinner className="h-6 w-6 text-brand" /></li>
              : list.length === 0 ? <li className="p-8 text-center text-sm text-ink-mute">Тохирох газар алга</li>
              : list.map((p) => {
                const Icon = iconFor(p.category_icon);
                return (
                  <li key={p.id}>
                    <button onClick={() => setSelected(p.id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${selected === p.id ? 'bg-brand-tint' : 'hover:bg-paper'}`}>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: p.category_color }}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">{p.name}</span>
                        <span className="flex items-center gap-1.5 text-xs text-ink-mute">
                          {p.district}
                          {p._km != null && <>, {kmLabel(p._km)}</>}
                          {p.avg_rating && <><Star className="h-3 w-3 fill-amber text-amber" /> {p.avg_rating}</>}
                        </span>
                      </span>
                      <span className="text-right">
                        {p.quiet_discount_now ? <span className="block font-display text-sm font-bold text-ember">−{p.quiet_discount_now}%</span> : null}
                        <span className="block text-[11px] font-semibold text-ink-mute">{p.active_deals} хямдрал</span>
                      </span>
                    </button>
                    {selected === p.id && (
                      <div className="bg-brand-tint px-4 pb-3"><Link to={`/places/${p.id}`} className="btn-primary w-full py-2">Дэлгэрэнгүй, хуваарь үзэх</Link></div>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
        <div className="order-1 overflow-hidden rounded-2xl shadow-card lg:order-2">
          <PlacesMap places={list} selectedId={selected} onSelect={setSelected} me={me} className="h-[360px] lg:h-[640px]" />
        </div>
      </div>
    </div>
  );
}
