import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, SearchX, LocateFixed, ArrowDownUp, Clock, Percent, TrendingDown, TrendingUp, Navigation, PiggyBank } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DISTRICTS } from '../lib/format';
import { DEAL_TYPES } from '../lib/ub';
import { distanceKm } from '../lib/geo';
import { useMyLocation } from '../lib/useMyLocation';
import { useFavorites } from '../lib/useFavorites';
import DealCard from '../components/DealCard';
import Pagination from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton, EmptyState, ErrorState, Spinner } from '../components/ui/States';

const PAGE_SIZE = 12;

// Эрэмбийн сонголтууд. near нь серверт биш, хөтөч дээр зайгаар эрэмбэлнэ.
const SORTS = {
  soon:       { label: 'Удахгүй дуусах', icon: Clock,        column: 'starts_at',        ascending: true },
  discount:   { label: 'Хямдрал %',      icon: Percent,      column: 'current_discount', ascending: false },
  price_asc:  { label: 'Үнэ: бага',      icon: TrendingDown, column: 'current_price',    ascending: true },
  price_desc: { label: 'Үнэ: их',        icon: TrendingUp,   column: 'current_price',    ascending: false },
  saving:     { label: 'Хэмнэлт их',     icon: PiggyBank,    column: 'saving',           ascending: false },
  near:       { label: 'Зай: ойр',       icon: Navigation,   column: 'starts_at',        ascending: true, near: true },
};

const toDateInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// PostgREST-ийн or() шүүлтүүрийг эвдэх тэмдэгтүүдийг цэвэрлэнэ
const sanitize = (s) => s.replace(/[,()%*\\]/g, ' ').trim();

function Filters({ f, update, clearAll, activeCount }) {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  return (
    <div className="space-y-6">
      <div>
        <span className="label">Хямдралын төрөл</span>
        <div className="grid gap-2">
          {Object.entries(DEAL_TYPES).map(([k, t]) => {
            const Icon = t.icon;
            const on = f.type === k;
            return (
              <button key={k} onClick={() => update({ type: on ? '' : k })} aria-pressed={on}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-colors ${on ? 'border-brand bg-brand-tint text-brand' : 'border-line text-ink-soft hover:border-ink/30'}`}>
                <Icon className="h-4 w-4 shrink-0" style={{ color: t.color }} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="f-date">Огноо</label>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {[['Өнөөдөр', toDateInput(today)], ['Маргааш', toDateInput(tomorrow)]].map(([l, v]) => (
            <button key={l} onClick={() => update({ date: f.date === v ? '' : v })}
                    className={`rounded-lg px-2 py-2 text-xs font-bold ${f.date === v ? 'bg-ink text-paper' : 'bg-paper text-ink-soft'}`}>
              {l}
            </button>
          ))}
        </div>
        <input id="f-date" type="date" value={f.date} min={toDateInput(today)} onChange={(e) => update({ date: e.target.value })} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="f-district">Дүүрэг</label>
        <select id="f-district" value={f.district} onChange={(e) => update({ district: e.target.value })} className="input">
          <option value="">Бүх дүүрэг</option>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <span className="label">Одоогийн үнэ (₮)</span>
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="1000" placeholder="Доод" aria-label="Доод үнэ" defaultValue={f.minPrice}
                 key={`min-${f.minPrice}`} onBlur={(e) => update({ min: e.target.value })} className="input" />
          <span className="text-ink-mute">–</span>
          <input type="number" min="0" step="1000" placeholder="Дээд" aria-label="Дээд үнэ" defaultValue={f.maxPrice}
                 key={`max-${f.maxPrice}`} onBlur={(e) => update({ max: e.target.value })} className="input" />
        </div>
      </div>

      {(activeCount > 0 || f.q) && (
        <button onClick={clearAll} className="btn-ghost w-full whitespace-nowrap px-2 text-rose"><X className="h-4 w-4" /> Цэвэрлэх</button>
      )}
    </div>
  );
}

export default function Deals() {
  const [params, setParams] = useSearchParams();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { pos, loading: locating, request: requestLocation } = useMyLocation();
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [qInput, setQInput] = useState(params.get('q') ?? '');

  // URL нь шүүлтүүрийн цорын ганц эх сурвалж → холбоосыг хуваалцахад шүүлтүүр хадгалагдана
  const f = useMemo(() => ({
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    type: DEAL_TYPES[params.get('type')] ? params.get('type') : '',
    district: params.get('district') ?? '',
    minPrice: params.get('min') ?? '',
    maxPrice: params.get('max') ?? '',
    date: params.get('date') ?? '',
    sort: SORTS[params.get('sort')] ? params.get('sort') : 'soon',
    page: Math.max(1, Number(params.get('page')) || 1),
  }), [params]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, v)));
    if (!('page' in patch)) next.delete('page'); // шүүлтүүр өөрчлөгдвөл 1-р хуудас руу
    setParams(next);
  };

  const chooseSort = async (key) => {
    if (SORTS[key].near && !pos) {
      const p = await requestLocation();
      if (!p) return; // зөвшөөрөл өгөөгүй бол эрэмбийг өөрчлөхгүй
    }
    update({ sort: key });
  };

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => setCategories(data ?? []));
  }, []);

  // Хайлт бичих үед хүсэлт бүрт биш, 350мс зогссоны дараа хайна (debounce)
  useEffect(() => {
    const t = setTimeout(() => { if (qInput !== f.q) update({ q: qInput.trim() }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const load = async () => {
    setRows(null);
    setError(null);

    let query = supabase
      .from('deal_listings')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .gt('starts_at', new Date().toISOString());

    if (f.q) {
      const s = sanitize(f.q);
      if (s) query = query.or(`title.ilike.%${s}%,business_name.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (f.category) query = query.eq('category_slug', f.category);
    if (f.type) query = query.eq('deal_type', f.type);
    if (f.district) query = query.eq('district', f.district);
    if (f.minPrice) query = query.gte('current_price', Number(f.minPrice));
    if (f.maxPrice) query = query.lte('current_price', Number(f.maxPrice));
    if (f.date) {
      const start = new Date(`${f.date}T00:00:00`);
      const end = new Date(start.getTime() + 86400000);
      query = query.gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString());
    }

    const sort = SORTS[f.sort];
    const from = (f.page - 1) * PAGE_SIZE;

    // Зайгаар: байршил хэрэгтэй. Зайг хөтөч дээр тооцож, хуудаслана.
    if (sort.near) {
      if (!pos) { update({ sort: 'soon' }); return; }
      const { data, error: err } = await query.order('starts_at').limit(300);
      if (err) { setError(err.message); return; }
      const sorted = data.map((d) => ({ ...d, _km: distanceKm(pos, d) })).sort((a, b) => (a._km ?? 1e9) - (b._km ?? 1e9));
      setRows(sorted.slice(from, from + PAGE_SIZE));
      setTotal(sorted.length);
      return;
    }

    const { data, error: err, count } = await query
      .order(sort.column, { ascending: sort.ascending })
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (err) { setError(err.message); return; }
    setRows(data);
    setTotal(count ?? 0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [f, pos]);

  const activeCount = [f.category, f.type, f.district, f.minPrice, f.maxPrice, f.date].filter(Boolean).length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const clearAll = () => { setQInput(''); setParams(new URLSearchParams()); };

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Хямдрал</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {rows && !error ? <><b className="text-ink">{total}</b> идэвхтэй санал. Үнэ нь эхлэх цаг ойртох тусам буурна.</> : 'Ачаалж байна…'}
          </p>
        </div>
        {!pos && (
          <button onClick={requestLocation} disabled={locating} className="btn-outline">
            {locating ? <Spinner className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />} Зай харуулах
          </button>
        )}
      </div>

      {/* Хайлт */}
      <div className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} aria-label="Нэрээр хайх" type="search"
                 placeholder="Ресторан, кино, саун…" className="input h-12 rounded-2xl pl-12 text-[15px] shadow-card" />
        </div>
        <button onClick={() => setShowFilters(true)} className="btn-outline relative h-12 shrink-0 rounded-2xl lg:hidden" aria-label="Шүүлтүүр">
          <SlidersHorizontal className="h-5 w-5" />
          {activeCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] text-white">{activeCount}</span>}
        </button>
      </div>

      {/* Ангилал */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button onClick={() => update({ category: '' })}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${!f.category ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-soft hover:text-ink'}`}>
          Бүгд
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => update({ category: f.category === c.slug ? '' : c.slug })}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${f.category === c.slug ? 'border-transparent text-white' : 'border-line bg-surface text-ink-soft hover:text-ink'}`}
                  style={f.category === c.slug ? { background: c.color } : undefined}>
            <span className="h-2 w-2 rounded-full" style={{ background: f.category === c.slug ? '#fff' : c.color }} /> {c.name}
          </button>
        ))}
      </div>

      {/* Эрэмбэ */}
      <div className="sticky top-16 z-20 -mx-4 mt-3 border-b border-line/60 bg-paper/90 px-4 py-2.5 backdrop-blur-lg sm:mx-0 sm:rounded-2xl sm:border sm:px-2">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label="Эрэмбэлэх">
          <ArrowDownUp className="mx-1 h-4 w-4 shrink-0 text-ink-mute" aria-hidden="true" />
          {Object.entries(SORTS).map(([k, s]) => {
            const Icon = s.icon;
            const on = f.sort === k;
            return (
              <button key={k} role="radio" aria-checked={on} onClick={() => chooseSort(k)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors sm:text-sm ${on ? 'bg-brand text-white' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'}`}>
                <Icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="panel p-5 lg:sticky lg:top-36">
            <Filters f={f} update={update} clearAll={clearAll} activeCount={activeCount} />
          </div>
        </aside>

        <section aria-live="polite">
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : !rows ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={SearchX} title="Тохирох хямдрал олдсонгүй"
                        text={f.q ? `"${f.q}" гэсэн хайлтад тохирох идэвхтэй хямдрал алга. Өөр үгээр хайх эсвэл шүүлтүүрээ багасгаж үзнэ үү.` : 'Шүүлтүүрээ өөрчилж эсвэл цэвэрлэж үзнэ үү.'}
                        action={<button onClick={clearAll} className="btn-primary">Шүүлтүүр цэвэрлэх</button>} />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((d) => <DealCard key={d.id} deal={d} isFavorite={favoriteIds.has(d.id)} onToggleFavorite={toggleFavorite} />)}
              </div>
              <Pagination page={f.page} pageCount={pageCount} onChange={(p) => { update({ page: p }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </section>
      </div>

      {/* Гар утсанд шүүлтүүр доороос гарч ирнэ */}
      <Modal open={showFilters} onClose={() => setShowFilters(false)} title="Шүүлтүүр">
        <Filters f={f} update={update} clearAll={() => { clearAll(); setShowFilters(false); }} activeCount={activeCount} />
        <button onClick={() => setShowFilters(false)} className="btn-primary mt-6 h-12 w-full">{total} илэрц харах</button>
      </Modal>
    </div>
  );
}
