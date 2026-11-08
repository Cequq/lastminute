import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, CalendarClock, Clock, MapPin, Phone, Star, Minus, Plus, Heart, Hourglass, Share2, Store, ShieldCheck, Ban, ListChecks, Ticket } from 'lucide-react';
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { supabase, callFunction } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useChartColors } from '../context/ThemeContext';
import { useNow } from '../lib/useNow';
import { useFavorites } from '../lib/useFavorites';
import { priceAt, nextDropInSeconds } from '../lib/pricing';
import { cancelPolicy, clock, durationLabel, friendlyDate, fullDate, money, timeOfDay, usageWindow } from '../lib/format';
import { iconFor } from '../lib/icons';
import { DealCover, DealTypeBadge, Rating } from '../components/DealCard';
import { DEAL_TYPES } from '../lib/ub';
import { Fuse } from '../components/PriceFuse';
import LocationButton from '../components/LocationButton';
import { distanceKm, kmLabel } from '../lib/geo';
import { useMyLocation } from '../lib/useMyLocation';
import { discountAt } from '../lib/pricing';
import { PageLoader, ErrorState, Spinner } from '../components/ui/States';

// Үнэ цаг хугацаанд хэрхэн буурахыг харуулах жижиг график
function PriceCurve({ deal, now }) {
  const c = useChartColors();
  const data = useMemo(() => {
    const end = new Date(deal.starts_at).getTime();
    const start = end - deal.drop_window_hours * 3600000;
    return Array.from({ length: 25 }, (_, i) => {
      const t = start + ((end - start) * i) / 24;
      return { t, price: priceAt(deal, t) };
    });
  }, [deal]);

  const nowInWindow = now >= data[0].t && now <= data[data.length - 1].t;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fuse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EDB45C" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#EDB45C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={timeOfDay}
                 tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36}
                 tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} domain={['dataMin', 'dataMax']} />
          <Tooltip formatter={(v) => [money(v), 'Үнэ']} labelFormatter={(t) => friendlyDate(t)}
                   contentStyle={c.tooltip} />
          <Area type="monotone" dataKey="price" stroke="#E4684A" strokeWidth={2.5} fill="url(#fuse)" />
          {nowInWindow && <ReferenceDot x={now} y={priceAt(deal, now)} r={6} fill="#E4684A" stroke={c.tooltip.background} strokeWidth={2} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="inline-flex" aria-label={`${value} од`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= value ? 'fill-amber text-amber' : 'text-line'}`} />
      ))}
    </span>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const now = useNow();
  const { pos } = useMyLocation();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [deal, setDeal] = useState(null);
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const [booking, setBooking] = useState(false);

  const load = async () => {
    setError(null);
    const { data, error: err } = await supabase.from('deal_listings').select('*').eq('id', id).maybeSingle();
    if (err) { setError(err.message); return; }
    if (!data) { setError('Энэ хямдрал олдсонгүй эсвэл идэвхгүй болсон байна.'); return; }
    setDeal(data);
    const [b, r] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', data.business_id).single(),
      supabase.from('reviews').select('*').eq('business_id', data.business_id).order('created_at', { ascending: false }).limit(10),
    ]);
    setBusiness(b.data);
    setReviews(r.data ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (error) return <div className="container-page py-10"><ErrorState message={error} onRetry={load} /></div>;
  if (!deal) return <PageLoader />;

  const Icon = iconFor(deal.category_icon);
  const secondsLeft = Math.max(0, (new Date(deal.starts_at).getTime() - now) / 1000);
  const started = secondsLeft <= 0;
  const soldOut = deal.seats_left <= 0;
  const maxQty = Math.min(10, Math.max(1, deal.seats_left));
  const price = priceAt(deal, now);
  const pct = Math.round(discountAt(deal, now));
  const saving = deal.original_price - price;
  const nextDrop = nextDropInSeconds(deal, now);
  const km = distanceKm(pos, deal);
  const policy = cancelPolicy(deal.cancel_hours);
  const freeCancelUntil = policy.refundable ? new Date(new Date(deal.starts_at).getTime() - deal.cancel_hours * 3600000) : null;
  const terms = (deal.terms ?? '').split(/(?<=\.)\s+/).filter(Boolean);
  const isFav = favoriteIds.has(deal.id);
  const urgent = secondsLeft < 3 * 3600;

  const share = async () => {
    const url = window.location.href;
    const text = `${deal.title}, ${deal.business_name}. Одоо ${money(priceAt(deal, Date.now()))}`;
    try {
      if (navigator.share) await navigator.share({ title: 'LastMinute', text, url });
      else { await navigator.clipboard.writeText(url); toast.success('Холбоос хуулагдлаа'); }
    } catch { /* хэрэглэгч хуваалцахаа болисон */ }
  };

  const book = async () => {
    if (!user) {
      toast('Захиалахын тулд нэвтэрнэ үү');
      navigate('/login', { state: { from: `/deals/${id}` } });
      return;
    }
    setBooking(true);
    try {
      const res = await callFunction('qpay-create-invoice', { deal_id: deal.id, quantity: qty });
      toast.success('Захиалга үүслээ. 15 минутын дотор төлнө үү.');
      navigate(`/checkout/${res.booking.id}`);
    } catch (e) {
      toast.error(e.message);
      load(); // үлдсэн суудал өөрчлөгдсөн байж магадгүй
    } finally {
      setBooking(false);
    }
  };

  const bookLabel = soldOut ? 'Дууссан' : started ? 'Цаг өнгөрсөн' : booking ? 'Нэхэмжлэл үүсгэж байна…' : 'Захиалах';

  return (
    <div className="container-page pb-32 pt-4 sm:pt-6 lg:pb-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 overflow-hidden text-sm font-semibold text-ink-mute" aria-label="Зам">
        <Link to="/deals" className="shrink-0 hover:text-ink">Хямдрал</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <Link to={`/deals?category=${deal.category_slug}`} className="shrink-0 hover:text-ink">{deal.category_name}</Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span className="truncate text-ink">{deal.business_name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* Зураг */}
          <div className="group relative overflow-hidden rounded-3xl shadow-card">
            <DealCover deal={deal} className="aspect-[16/10] sm:aspect-[16/8]" />
            <span className="absolute left-4 top-4 rounded-2xl bg-ember px-3.5 py-2 font-display text-2xl font-bold leading-none text-white shadow-xl shadow-ember/30">−{pct}%</span>
            <div className="absolute right-4 top-4 flex gap-2">
              <button onClick={share} aria-label="Хуваалцах" className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-midnight shadow-md backdrop-blur">
                <Share2 className="h-5 w-5" />
              </button>
              <button onClick={() => toggleFavorite(deal.id)} aria-pressed={isFav} aria-label={isFav ? 'Дуртайгаас хасах' : 'Дуртайд нэмэх'}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-midnight shadow-md backdrop-blur">
                <Heart className={`h-5 w-5 ${isFav ? 'fill-rose text-rose' : ''}`} />
              </button>
            </div>
            <div className="absolute bottom-4 left-4"><DealTypeBadge type={deal.deal_type} /></div>
          </div>

          {/* Гарчиг */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link to={`/places/${deal.business_id}`} className="inline-flex items-center gap-1.5 text-base font-extrabold hover:text-brand">
                <Store className="h-4 w-4" /> {deal.business_name}
              </Link>
              <Rating value={deal.avg_rating} count={deal.review_count} />
              <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: deal.category_color }}><Icon className="h-4 w-4" /> {deal.category_name}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[2rem]">{deal.title}</h1>
            {deal.description && <p className="mt-3 max-w-prose text-ink-soft">{deal.description}</p>}
          </div>

          {/* Гол мэдээлэл */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="panel flex gap-3 p-4">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div><dt className="text-xs font-semibold text-ink-mute">Хэрэглэх боломжтой хугацаа</dt>
                <dd className="text-sm font-bold">{usageWindow(deal.starts_at, deal.duration_minutes)}</dd>
                <dd className="text-xs text-ink-mute">{durationLabel(deal.duration_minutes)}</dd></div>
            </div>
            <div className={`panel flex gap-3 p-4 ${urgent ? 'border-ember/40' : ''}`}>
              <Hourglass className={`mt-0.5 h-5 w-5 shrink-0 ${urgent ? 'text-ember' : 'text-brand'}`} />
              <div><dt className="text-xs font-semibold text-ink-mute">Хямдрал дуусах (захиалга хаагдах)</dt>
                <dd className="text-sm font-bold">{fullDate(deal.starts_at)}</dd>
                <dd className={`font-display text-xs font-bold tabular-nums ${urgent ? 'text-ember' : 'text-ink-soft'}`}>{clock(secondsLeft)} үлдсэн</dd></div>
            </div>
            <div className="panel flex gap-3 p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="min-w-0"><dt className="text-xs font-semibold text-ink-mute">Байршил</dt>
                <dd className="text-sm font-bold">{deal.district}{km != null && <span className="text-brand">, {kmLabel(km)}</span>}</dd>
                <dd className="truncate text-xs text-ink-mute">{deal.address}</dd>
                <LocationButton place={{ id: deal.business_id, name: deal.business_name, lat: deal.lat, lng: deal.lng, district: deal.district, address: deal.address, category_color: deal.category_color, category_name: deal.category_name, active_deals: 1 }} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline" iconOnly /></div>
            </div>
            <div className="panel flex gap-3 p-4">
              <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="flex-1"><dt className="text-xs font-semibold text-ink-mute">Үлдсэн тоо</dt>
                <dd className={`text-sm font-bold ${deal.seats_left <= 2 ? 'text-ember' : ''}`}>{soldOut ? 'Дууссан' : `${deal.seats_left} / ${deal.quantity}`}</dd>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${(deal.seats_left / deal.quantity) * 100}%` }} /></div></div>
            </div>
          </dl>

          {deal.business_is_demo && (
            <p className="mt-4 rounded-xl bg-amber-tint px-4 py-3 text-sm font-semibold text-amber-ink">
              Жишээ хямдрал: {deal.business_name} бодит байгууллага боловч LastMinute-тэй хамтран ажиллаагүй. Үнэ, хямдрал нь туршилтын өгөгдөл.
            </p>
          )}

          {/* Нөхцөл */}
          <section className="panel mt-6 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold"><ListChecks className="h-5 w-5 text-brand" /> Хэрэглэх нөхцөл</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {terms.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>)}
              <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />Газар дээр нь тасалбарын 8 оронтой кодоо үзүүлнэ.</li>
              <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />Захиалсан мөчийн үнэ 15 минут түгжигдэнэ. Энэ хугацаанд төлөөгүй бол захиалга автоматаар цуцлагдана.</li>
            </ul>
          </section>

          {/* Цуцлалт, буцаалт */}
          <section className={`mt-4 rounded-2xl border p-5 sm:p-6 ${policy.refundable ? 'border-mint/30 bg-mint-tint/60' : 'border-line bg-surface-2'}`}>
            <h2 className={`flex items-center gap-2 text-lg font-bold ${policy.refundable ? 'text-mint' : ''}`}>
              {policy.refundable ? <ShieldCheck className="h-5 w-5" /> : <Ban className="h-5 w-5 text-ink-mute" />} Цуцлалт, буцаалтын нөхцөл
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{policy.long}</p>
            {policy.refundable && (
              <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <li className="rounded-xl bg-surface p-3"><b className="block text-mint">{freeCancelUntil ? fullDate(freeCancelUntil) : ''} хүртэл</b><span className="text-ink-soft">«Миний захиалга» хэсгээс цуцална</span></li>
                <li className="rounded-xl bg-surface p-3"><b className="block">1–3 ажлын өдөрт</b><span className="text-ink-soft">төлбөр төлсөн данс руу 100% буцна</span></li>
                <li className="rounded-xl bg-surface p-3"><b className="block">Түүнээс хойш</b><span className="text-ink-soft">эсвэл тасалбар ашигласны дараа буцаалтгүй</span></li>
              </ol>
            )}
          </section>

          <section className="panel mt-6 p-5">
            <h2 className="text-lg font-bold">Үнэ хэрхэн буурах вэ</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Эхлэхээс {deal.drop_window_hours} цагийн өмнөөс үнэ жигд буурч, эхлэх мөчид −{deal.max_discount}% хүрнэ.
            </p>
            <div className="mt-4"><PriceCurve deal={deal} now={now} /></div>
          </section>

          <section className="mt-8">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Үнэлгээ</h2>
              {reviews.length > 0 && <Rating value={deal.avg_rating ?? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length} count={reviews.length} />}
            </div>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-ink-mute">Энэ байгууллагад үнэлгээ хараахан алга. Захиалга хийсний дараа анхны үнэлгээг та үлдээгээрэй.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="panel p-4">
                    <div className="flex items-center justify-between"><span className="text-sm font-bold">{r.author_name || 'Хэрэглэгч'}</span><Stars value={r.rating} /></div>
                    {r.comment && <p className="mt-2 text-sm text-ink-soft">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
            {business?.phone && <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft"><Phone className="h-4 w-4" /> {business.phone}</p>}
          </section>
        </div>

        {/* Худалдан авах панел */}
        <aside id="buy">
          <div className="panel overflow-hidden lg:sticky lg:top-24">
            <div className={`flex items-center justify-between px-6 py-3 text-sm font-bold ${urgent ? 'bg-ember text-white' : 'bg-surface-2 text-ink-soft'}`}>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {started ? 'Хямдрал дууссан' : 'Хямдрал дуусахад'}</span>
              <span className="font-display tabular-nums">{clock(secondsLeft)}</span>
            </div>
            <div className="p-6">
              <div className="flex items-end gap-3">
                <span className="font-display text-4xl font-bold leading-none">{money(price)}</span>
                <span className="mb-1 text-sm font-semibold text-ink-mute line-through">{money(deal.original_price)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-ember-tint px-2 py-1 text-xs font-extrabold text-ember">−{pct}%</span>
                <span className="rounded-lg bg-mint-tint px-2 py-1 text-xs font-extrabold text-mint">Хэмнэлт: {money(saving)}</span>
              </div>
              {nextDrop && !started && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <Hourglass className="h-3.5 w-3.5 text-amber" /> {nextDrop < 60 ? `${nextDrop} секундын` : `${Math.ceil(nextDrop / 60)} минутын`} дараа дахин буурна
                </p>
              )}
              <div className="mt-5"><Fuse deal={deal} showLabels /></div>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-bold">Тоо ширхэг</span>
                <div className="flex items-center gap-1 rounded-xl border border-line p-1">
                  <button className="btn-ghost h-8 w-8 p-0" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Хасах"><Minus className="h-4 w-4" /></button>
                  <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">{qty}</span>
                  <button className="btn-ghost h-8 w-8 p-0" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Нэмэх"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Анхны үнэ × {qty}</dt><dd className="line-through text-ink-mute">{money(deal.original_price * qty)}</dd></div>
                <div className="flex justify-between text-mint"><dt>Хэмнэлт</dt><dd className="font-bold">−{money(saving * qty)}</dd></div>
                <div className="flex justify-between pt-1 text-base"><dt className="font-bold">Төлөх дүн</dt><dd className="font-display text-xl font-bold">{money(price * qty)}</dd></div>
              </dl>

              <button onClick={book} disabled={booking || soldOut || started} className="btn-primary mt-5 h-12 w-full text-base">
                {booking && <Spinner className="h-4 w-4" />} {bookLabel}
              </button>
              <p className={`mt-3 flex items-center justify-center gap-1.5 text-xs font-bold ${policy.refundable ? 'text-mint' : 'text-ink-mute'}`}>
                {policy.refundable ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />} {policy.short}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Гар утасны доод захиалах самбар */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-12px_32px_-16px_rgb(0_0_0/0.35)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold">{money(price * qty)}</span>
              <span className="text-xs font-semibold text-ink-mute line-through">{money(deal.original_price * qty)}</span>
            </p>
            <p className="truncate text-xs font-bold text-mint">Хэмнэлт {money(saving * qty)} · <span className={urgent ? 'text-ember' : 'text-ink-soft'}>{clock(secondsLeft)}</span></p>
          </div>
          <button onClick={book} disabled={booking || soldOut || started} className="btn-primary h-12 shrink-0 px-6 text-base">
            {booking && <Spinner className="h-4 w-4" />} {bookLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
