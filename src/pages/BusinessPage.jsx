import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Phone, Star, Moon, Sun } from 'lucide-react';
import LocationButton from '../components/LocationButton';
import { supabase } from '../lib/supabase';
import { iconFor } from '../lib/icons';
import { useNow } from '../lib/useNow';
import { useFavorites } from '../lib/useFavorites';
import { activeWindow, nextWindow, inLabel, hhmm, ubNow, WEEKDAYS, WEEK_ORDER } from '../lib/ub';
import DealCard, { coverBackground } from '../components/DealCard';
import BusyChart from '../components/BusyChart';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/States';

const PlacesMap = lazy(() => import('../components/PlacesMap'));

function Stars({ value }) {
  return (
    <span className="inline-flex" aria-label={`${value} од`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= value ? 'fill-amber text-amber' : 'text-line'}`} />)}
    </span>
  );
}

export default function BusinessPage() {
  const { id } = useParams();
  const now = useNow();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [place, setPlace] = useState(null);
  const [windows, setWindows] = useState([]);
  const [deals, setDeals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [day, setDay] = useState(ubNow().weekday);

  const load = async () => {
    setError(null);
    const { data, error: err } = await supabase.from('business_listings').select('*').eq('id', id).maybeSingle();
    if (err) { setError(err.message); return; }
    if (!data) { setError('Байгууллага олдсонгүй эсвэл идэвхгүй байна.'); return; }
    setPlace(data);
    const [w, d, r] = await Promise.all([
      supabase.from('quiet_hours').select('*').eq('business_id', id).order('start_time'),
      supabase.from('deal_listings').select('*').eq('business_id', id).eq('is_active', true)
        .gt('starts_at', new Date().toISOString()).order('starts_at'),
      supabase.from('reviews').select('*').eq('business_id', id).order('created_at', { ascending: false }).limit(20),
    ]);
    setWindows(w.data ?? []);
    setDeals(d.data ?? []);
    setReviews(r.data ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={load} /></div>;
  if (!place) return <PageLoader />;

  const Icon = iconFor(place.category_icon);
  const today = ubNow(new Date(now)).weekday;
  const active = activeWindow(windows, new Date(now));
  const next = active ? null : nextWindow(windows, new Date(now));

  return (
    <div className="pb-8">
      {/* Толгой хэсэг */}
      <section className="relative overflow-hidden text-white" style={{ background: coverBackground(place.category_color) }}>
        {place.cover_url && <img src={place.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/40 to-midnight/10" />
        {!place.cover_url && <Icon className="absolute -right-6 -top-6 h-72 w-72 text-white/15" strokeWidth={1} aria-hidden="true" />}
        <div className="container-page relative pb-8 pt-6">
          <Link to="/map" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur hover:bg-white/25">
            <ArrowLeft className="h-4 w-4" /> Газрын зураг
          </Link>
          <div className="mt-16 sm:mt-24">
            <p className="flex items-center gap-2 text-sm font-bold text-white/80"><Icon className="h-4 w-4" /> {place.category_name}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{place.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-white/85">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {place.district}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {hhmm(place.opens_at)}–{hhmm(place.closes_at)}</span>
              {place.avg_rating && <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber text-amber" /> {place.avg_rating} ({place.review_count})</span>}
            </div>
            <div className="mt-5">
              {active ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2 text-sm font-extrabold text-ink">
                  <span className="live-dot relative h-2 w-2 rounded-full bg-mint text-mint" />
                  Яг одоо −{active.discount}%, {hhmm(active.end_time)} хүртэл
                </span>
              ) : next ? (
                <span className="inline-flex rounded-xl bg-white/15 px-3.5 py-2 text-sm font-bold backdrop-blur">
                  Дараагийн хямдрал −{next.window.discount}%: {WEEKDAYS[next.window.weekday]} {hhmm(next.window.start_time)} ({inLabel(next.inMinutes)})
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {place.is_demo && (
            <p className="rounded-xl bg-amber-tint px-4 py-3 text-sm font-semibold text-amber-ink">
              Энэ байгууллага бодитоор байдаг боловч LastMinute-тэй хамтран ажиллаагүй. Ачаалал, хуваарь, хямдрал нь туршилтын жишээ өгөгдөл.
            </p>
          )}
          {/* Ачааллын график */}
          <section className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Ихэвчлэн хэр завгүй вэ</h2>
                <p className="text-sm text-ink-soft">Шар баганатай цагт ирвэл хямд. Хар багана нь одоогийн цаг.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Гараг">
              {WEEK_ORDER.map((wd) => (
                <button key={wd} role="tab" aria-selected={day === wd} onClick={() => setDay(wd)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${day === wd ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:text-ink'}`}>
                  {WEEKDAYS[wd]}{wd === today ? ' (өнөөдөр)' : ''}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <BusyChart profile={place.busy_profile} windows={windows} weekday={day} opensAt={place.opens_at} closesAt={place.closes_at} />
            </div>
          </section>

          {/* Долоо хоногийн хуваарь */}
          <section className="panel overflow-hidden">
            <h2 className="px-5 pt-5 text-lg font-bold sm:px-6">Хямдралтай цагийн хуваарь</h2>
            <ul className="mt-3 divide-y divide-line">
              {WEEK_ORDER.map((wd) => {
                const ws = windows.filter((w) => w.weekday === wd);
                return (
                  <li key={wd} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6 ${wd === today ? 'bg-brand-tint/50' : ''}`}>
                    <span className={`w-20 text-sm font-bold ${wd === today ? 'text-brand' : ''}`}>{WEEKDAYS[wd]}</span>
                    {ws.length === 0 ? <span className="text-sm text-ink-mute">Хямдралгүй</span> : ws.map((w) => (
                      <span key={w.id} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${w.kind === 'closing' ? 'bg-amber-tint text-amber-ink' : 'bg-sky-tint text-sky'}`}>
                        {w.kind === 'closing' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                        {hhmm(w.start_time)}–{hhmm(w.end_time)} <span className="font-extrabold">−{w.discount}%</span>
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Хямдралууд */}
          <section>
            <h2 className="mb-4 text-lg font-bold">Захиалах боломжтой ({deals.length})</h2>
            {deals.length === 0 ? (
              <EmptyState title="Одоогоор захиалах хямдрал алга" text="Хуваарьт байгаа хямдралтай цагт очоод газар дээр нь хямдралаа аваарай." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {deals.map((d) => <DealCard key={d.id} deal={d} isFavorite={favoriteIds.has(d.id)} onToggleFavorite={toggleFavorite} />)}
              </div>
            )}
          </section>

          {/* Үнэлгээ */}
          <section>
            <h2 className="mb-4 text-lg font-bold">Үнэлгээ</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink-mute">Үнэлгээ хараахан алга. Захиалга хийсний дараа анхны үнэлгээг та үлдээгээрэй.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="panel p-4">
                    <div className="flex items-center justify-between"><span className="text-sm font-bold">{r.author_name || 'Хэрэглэгч'}</span><Stars value={r.rating} /></div>
                    {r.comment && <p className="mt-2 text-sm text-ink-soft">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {place.lat && (
            <div className="overflow-hidden rounded-2xl shadow-card">
              <Suspense fallback={<div className="h-56 animate-pulse bg-line" />}>
                <PlacesMap places={[place]} selectedId={place.id} className="h-56" zoom={15} center={[place.lat, place.lng]} interactive={false} />
              </Suspense>
            </div>
          )}
          <div className="panel space-y-3 p-5 text-sm">
            {place.description && <p className="text-ink-soft">{place.description}</p>}
            <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {place.district}, {place.address}</p>
            {place.phone && <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <a href={`tel:${place.phone}`} className="font-bold">{place.phone}</a></p>}
            <LocationButton place={place} className="btn-dark mt-2 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}
