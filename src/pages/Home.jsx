import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, TrendingDown, ArrowUpRight, Store, Map as MapIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNow } from '../lib/useNow';
import { countdown, friendlyDate, money } from '../lib/format';
import { priceAt } from '../lib/pricing';
import { iconFor } from '../lib/icons';
import { useFavorites } from '../lib/useFavorites';
import { activeWindow, nextWindow, inLabel, hhmm, ubNow, toMinutes, DEAL_TYPES, QUIET_KINDS } from '../lib/ub';
import DealCard from '../components/DealCard';
import Skyline from '../components/Skyline';
import BusyChart from '../components/BusyChart';
import { LivePrice, Fuse } from '../components/PriceFuse';
import { CardSkeleton, ErrorState } from '../components/ui/States';

const PlacesMap = lazy(() => import('../components/PlacesMap'));

// Hero-ийн баруун талын карт: хамгийн ойрын хямдралын үнэ нүдэн дээр буурна
function LiveTicker({ deal }) {
  const now = useNow();
  if (!deal) return <div className="h-full min-h-80 animate-pulse rounded-3xl bg-white/10" />;
  const seconds = Math.max(0, (new Date(deal.starts_at).getTime() - now) / 1000);
  const Icon = iconFor(deal.category_icon);
  const saved = deal.original_price - priceAt(deal, now);
  const type = DEAL_TYPES[deal.deal_type];

  return (
    <Link to={`/deals/${deal.id}`} className="block rounded-3xl bg-surface p-6 text-ink shadow-2xl shadow-black/40 transition-transform hover:-translate-y-0.5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: deal.category_color }}>
          <Icon className="h-4 w-4" /> {deal.category_name}
        </span>
        <span className="rounded-lg bg-ember px-2.5 py-1 font-display text-sm font-bold tabular-nums text-white">
          {countdown(seconds)}
        </span>
      </div>
      <p className="mt-5 text-sm font-bold text-ink-soft">{deal.business_name}</p>
      <h2 className="mt-1 font-sans text-xl font-extrabold leading-tight">{deal.title}</h2>
      <p className="mt-1.5 flex items-center gap-1 text-sm text-ink-mute">
        <MapPin className="h-4 w-4" /> {deal.district}, {friendlyDate(deal.starts_at)}
      </p>
      <div className="mt-6"><LivePrice deal={deal} size="lg" /></div>
      <p className="mt-1 text-sm font-bold text-mint">Та {money(saved)} хэмнэнэ</p>
      <div className="mt-6"><Fuse deal={deal} showLabels /></div>
      <p className={`mt-5 inline-flex rounded-lg px-2.5 py-1 text-xs font-extrabold ${type.soft}`}>{type.label}</p>
    </Link>
  );
}

// "Яг одоо хямдарч байна" хэсгийн жижиг карт
function QuietPlaceCard({ place, window: w, upcomingIn }) {
  const Icon = iconFor(place.category_icon);
  return (
    <Link to={`/places/${place.id}`}
          className="panel group flex w-64 shrink-0 snap-start flex-col p-4 transition-shadow hover:shadow-lift sm:w-auto">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: place.category_color }}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-display text-2xl font-bold text-ember">−{w.discount}%</span>
      </div>
      <p className="mt-3 truncate font-extrabold group-hover:text-brand">{place.name}</p>
      <p className="text-xs text-ink-mute">{place.district}, {QUIET_KINDS[w.kind]}</p>
      <p className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ${upcomingIn == null ? 'bg-mint-tint text-mint' : 'bg-paper text-ink-soft'}`}>
        {upcomingIn == null ? (
          <><span className="live-dot relative h-1.5 w-1.5 rounded-full bg-mint text-mint" /> {hhmm(w.end_time)} хүртэл</>
        ) : (
          <>{hhmm(w.start_time)}-аас, {inLabel(upcomingIn)}</>
        )}
      </p>
    </Link>
  );
}

// Өнөөдрийн 24 цагийн зурвас: цаг бүрт хэдэн газар хямдралтай байхыг харуулна
function CityPulse({ windows, now }) {
  const ub = ubNow(new Date(now));
  const today = windows.filter((w) => w.weekday === ub.weekday);
  const hours = Array.from({ length: 17 }, (_, i) => i + 8); // 08:00 – 24:00
  const data = hours.map((h) => {
    const ws = today.filter((w) => toMinutes(w.start_time) < (h + 1) * 60 && toMinutes(w.end_time) > h * 60);
    return { h, places: new Set(ws.map((w) => w.business_id)).size, max: ws.length ? Math.max(...ws.map((w) => w.discount)) : 0 };
  });
  const peak = Math.max(1, ...data.map((d) => d.places));
  const nowPos = ((ub.minutes / 60 - 8) / 17) * 100;

  return (
    <div className="relative">
      <div className="flex h-28 items-end gap-1 sm:gap-1.5">
        {data.map((d) => {
          const past = d.h < ub.hour;
          const current = d.h === ub.hour;
          return (
            <div key={d.h} className="group relative flex h-full flex-1 flex-col justify-end">
              {d.max > 0 && <span className={`mb-1 text-center text-[10px] font-extrabold ${past ? 'text-white/30' : 'text-amber'}`}>−{d.max}</span>}
              <div className={`w-full rounded-t-md transition-all ${current ? 'bg-gradient-to-t from-ember to-amber shadow-[0_0_24px_rgb(255_93_58/0.6)]' : past ? 'bg-white/10' : 'bg-gradient-to-t from-brand/60 to-brand'}`}
                   style={{ height: `${Math.max(6, (d.places / peak) * 100)}%` }}
                   title={`${String(d.h).padStart(2, '0')}:00 — ${d.places} газар хямдралтай`} />
            </div>
          );
        })}
      </div>
      {nowPos >= 0 && nowPos <= 100 && (
        <div className="pointer-events-none absolute -top-2 bottom-0 w-px bg-white/60" style={{ left: `${nowPos}%` }}>
          <span className="absolute -top-5 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-midnight">Одоо</span>
        </div>
      )}
      <div className="mt-2 flex gap-1 text-[10px] font-semibold text-white/45 sm:gap-1.5">
        {hours.map((h) => <span key={h} className="flex-1 text-center">{h % 2 === 0 ? String(h).padStart(2, '0') : ''}</span>)}
      </div>
    </div>
  );
}

// Тэнгэрийн одод (байрлал тогтмол)
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37.7) % 100, y: (i * 23.3) % 55, s: i % 5 === 0 ? 2 : 1, d: (i % 7) * 0.6,
}));

// Тайлбар хэсгийн жишээ: ресторанд нэг өдрийн ачаалал
const DEMO_PROFILE = [0,0,0,0,0,0,0,0,0,0,10,55,90,85,45,20,20,35,70,90,85,60,30,10];
const DEMO_WINDOWS = [
  { weekday: 9, start_time: '15:00', end_time: '17:30', discount: 25 },
  { weekday: 9, start_time: '21:30', end_time: '23:00', discount: 40 },
];

const HOW = [
  ['Хямдралтай цагаа олно', 'Хаахын өмнөх, эрэлт багатай цагуудыг газрын зураг, ангиллаар хайна.'],
  ['Үнэ буурахыг ажиглана', 'Эхлэх цаг ойртох тусам үнэ автоматаар буурна. Хүлээх үү, одоо авах уу, та шийднэ.'],
  ['QPay-ээр төлөөд очно', 'QR уншуулж төлмөгц тасалбар гарна. Газар дээр нь кодоо үзүүлнэ.'],
];

export default function Home() {
  const navigate = useNavigate();
  const now = useNow();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState(null);
  const [places, setPlaces] = useState([]);
  const [windows, setWindows] = useState([]);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    const [cats, d, p, w] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('deal_listings').select('*').eq('is_active', true)
        .gt('starts_at', new Date().toISOString()).gt('seats_left', 0).order('starts_at').limit(40),
      supabase.from('business_listings').select('*').eq('is_active', true),
      supabase.from('quiet_hours').select('*'),
    ]);
    const err = cats.error || d.error || p.error || w.error;
    if (err) { setError(err.message); return; }
    setCategories(cats.data);
    setDeals(d.data);
    setPlaces(p.data);
    setWindows(w.data);
  };

  useEffect(() => { load(); }, []);

  // Минут тутам дахин тооцно (секунд тутам биш)
  const minuteKey = Math.floor(now / 60000);
  const quiet = useMemo(() => {
    const at = new Date(minuteKey * 60000);
    const active = [];
    const upcoming = [];
    for (const p of places) {
      const ws = windows.filter((w) => w.business_id === p.id);
      const a = activeWindow(ws, at);
      if (a) { active.push({ place: p, window: a }); continue; }
      const n = nextWindow(ws, at);
      if (n) upcoming.push({ place: p, window: n.window, upcomingIn: n.inMinutes });
    }
    active.sort((a, b) => b.window.discount - a.window.discount);
    upcoming.sort((a, b) => a.upcomingIn - b.upcomingIn);
    return { active, upcoming };
  }, [places, windows, minuteKey]);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/deals${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  const featured = deals?.[0];
  const tabbed = deals?.filter((d) => tab === 'all' || d.deal_type === tab).slice(0, 6);
  const ub = ubNow(new Date(now));
  const clock = `${String(ub.hour).padStart(2, '0')}:${String(ub.minutes % 60).padStart(2, '0')}`;
  const quietList = quiet.active.length ? quiet.active : quiet.upcoming;

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="grain relative overflow-hidden bg-night-sky text-white">
        {STARS.map((st, i) => (
          <span key={i} className="twinkle pointer-events-none absolute rounded-full bg-white" aria-hidden="true"
                style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />
        ))}
        <div className="pointer-events-none absolute right-[8%] top-10 h-16 w-16 rounded-full bg-[#F6EBD3] shadow-[0_0_70px_rgb(246_235_211/0.3)]" aria-hidden="true">
          <span className="absolute -left-3 -top-2 h-16 w-16 rounded-full bg-midnight" />
        </div>
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full sm:h-52" />

        <div className="container-page relative grid items-center gap-10 pb-48 pt-12 sm:pb-60 md:grid-cols-[1.15fr_1fr] md:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur">
              <span className="live-dot relative h-2 w-2 rounded-full bg-amber text-amber" />
              Улаанбаатар {clock}, {quiet.active.length} газар яг одоо хямдарч байна
            </p>
            <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
              <span className="block">Нэг боломж.</span>
              <span className="block">Хоёр хожил.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Хаах дөхсөн, эрэлт багатай цагт газрууд сул суудал, ширээ, цагаа хямдруулна.
              Цаг ойртох тусам үнэ буурна.
            </p>
            {/* Хоёр хожил: хэрэглэгч ба байгууллага */}
            <div className="mt-6 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
                <p className="font-display text-xl font-bold text-amber">−60%</p>
                <p className="mt-0.5 text-xs font-semibold text-white/70">хүртэл та хэмнэнэ</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
                <p className="font-display text-xl font-bold text-[#7fd6cc]">+орлого</p>
                <p className="mt-0.5 text-xs font-semibold text-white/70">байгууллага сул цагаа борлуулна</p>
              </div>
            </div>
            <form onSubmit={submit} className="mt-8 flex max-w-lg gap-2 rounded-2xl bg-surface p-1.5 shadow-2xl shadow-black/30">
              <label htmlFor="hero-search" className="sr-only">Хайх</label>
              <div className="flex flex-1 items-center gap-2 pl-3 text-ink">
                <Search className="h-5 w-5 shrink-0 text-ink-mute" />
                <input id="hero-search" value={q} onChange={(e) => setQ(e.target.value)}
                       placeholder="Кино, суши, массаж…" className="w-full bg-transparent py-2 text-sm font-semibold outline-none placeholder:text-ink-mute" />
              </div>
              <button className="btn-primary">Хайх</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2">
              {Object.entries(DEAL_TYPES).map(([key, t]) => {
                const Icon = t.icon;
                return (
                  <Link key={key} to={`/deals?type=${key}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-bold text-white/90 backdrop-blur transition-colors hover:bg-white/15">
                    <Icon className="h-4 w-4 text-amber" /> {t.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/70">
              <TrendingDown className="h-4 w-4 text-amber" /> Яг одоо үнэ нь буурч байна
            </p>
            <LiveTicker deal={featured} />
          </div>
        </div>
      </section>

      {/* ---------------- ЯГ ОДОО ХЯМДАРЧ БАЙНА ---------------- */}
      <section className="container-page relative z-10 -mt-24 sm:-mt-28">
        <div className="rounded-3xl border border-line/70 bg-surface/95 p-5 shadow-lift backdrop-blur sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">{quiet.active.length ? 'Яг одоо хямдарч байна' : 'Удахгүй хямдрах газрууд'}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {quiet.active.length
                  ? 'Эдгээр газарт яг одоо эрэлт багатай үе тул очвол хямд.'
                  : 'Яг одоо хямдралтай цаг алга. Дараагийн хямдралууд:'}
              </p>
            </div>
            <Link to="/map" className="btn-outline"><MapIcon className="h-4 w-4" /> Газрын зураг дээр</Link>
          </div>
          {quietList.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-mute">Ойрын хугацаанд хямдралтай цаг алга. Доорх хямдралуудыг үзээрэй.</p>
          ) : (
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-2 lg:grid-cols-4">
              {quietList.slice(0, 8).map((x) => <QuietPlaceCard key={x.place.id} {...x} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- ХОТЫН ХЯМДРАЛЫН ИМПУЛЬС ---------------- */}
      <section className="container-page mt-12">
        <div className="grain relative overflow-hidden rounded-3xl bg-gradient-to-br from-night via-midnight to-midnight p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[280px_1fr] lg:items-end">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Өнөөдрийн хямдралын хэмнэл</h2>
              <p className="mt-2 text-sm text-white/60">
                Багана бүр нэг цаг. Өндөр байх тусам тэр цагт олон газар хямдралтай. Дээрх тоо нь хамгийн их хямдрал.
              </p>
              <Link to="/map" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-amber hover:underline">
                Газрын зураг дээр үзэх <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <CityPulse windows={windows} now={now} />
          </div>
        </div>
      </section>

      {/* ---------------- АНГИЛАЛ ---------------- */}
      <section className="container-page mt-12">
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((c) => {
            const Icon = iconFor(c.icon);
            return (
              <Link key={c.id} to={`/deals?category=${c.slug}`}
                    className="group flex min-w-32 shrink-0 flex-col items-start gap-3 rounded-2xl p-4 transition-colors hover:bg-surface">
                <span className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-card transition-transform group-hover:-rotate-6"
                      style={{ background: c.color }}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-extrabold">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {error ? (
        <div className="container-page mt-10"><ErrorState message={error} onRetry={load} /></div>
      ) : (
        <section className="container-page mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Удахгүй эхэлнэ</h2>
              <p className="mt-1 text-sm text-ink-soft">Хамгийн ойрын цагууд. Тэдний үнэ яг одоо хамгийн хурдан буурч байна.</p>
            </div>
            <Link to="/deals" className="btn-outline">Бүх хямдрал <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist">
            {[['all', 'Бүгд'], ...Object.entries(DEAL_TYPES).map(([k, t]) => [k, t.label])].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${tab === k ? 'bg-ink text-paper' : 'bg-surface text-ink-soft shadow-card hover:text-ink'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="grid gap-4 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tabbed
              ? tabbed.map((d) => <DealCard key={d.id} deal={d} isFavorite={favoriteIds.has(d.id)} onToggleFavorite={toggleFavorite} />)
              : Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
          {tabbed?.length === 0 && <p className="panel p-8 text-center text-sm text-ink-mute">Энэ төрлийн ойрын хямдрал алга.</p>}
        </section>
      )}

      {/* ---------------- ЯАГААД ХЯМД ВЭ ---------------- */}
      <section className="container-page mt-20">
        <div className="grid items-center gap-10 rounded-3xl bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Яагаад хямд байдаг вэ?</h2>
            <p className="mt-4 max-w-md text-ink-soft">
              Ресторан үдэд, оройд дүүрдэг ч үдээс хойш эрэлт багатай. Хаах дөхөхөд гал тогоонд хоол үлддэг. Кино театрын
              өглөөний сеанс бараг хоосон гардаг. Борлогдоогүй суудал байгууллагад зардал л авчирдаг тул тэд эдгээр
              цагаа хямдруулах сонирхолтой.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {Object.entries(DEAL_TYPES).map(([k, t]) => {
                const Icon = t.icon;
                return (
                  <li key={k} className="flex items-start gap-3">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.soft}`}><Icon className="h-4 w-4" /></span>
                    <span><b>{t.label}.</b> <span className="text-ink-soft">{t.text}.</span></span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl bg-paper p-5 sm:p-6">
            <p className="text-sm font-extrabold">Жишээ: рестораны нэг өдөр</p>
            <p className="mb-5 text-xs text-ink-mute">Багана өндөр байх тусам хүн их. Шар нь хямдралтай цаг.</p>
            <BusyChart profile={DEMO_PROFILE} windows={DEMO_WINDOWS} weekday={9} opensAt="10:00" closesAt="23:59" />
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand/20" /> Ердийн үнэ</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gradient-to-t from-ember to-amber" /> Хямдралтай</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ГАЗРЫН ЗУРАГ ---------------- */}
      <section className="container-page mt-16">
        <div className="relative overflow-hidden rounded-3xl shadow-card">
          <Suspense fallback={<div className="h-80 animate-pulse bg-line" />}>
            <PlacesMap places={places} className="h-80 sm:h-96" interactive={false} zoom={12} />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 z-[400] bg-gradient-to-r from-midnight/90 via-midnight/50 to-transparent" />
          <div className="absolute inset-y-0 left-0 z-[401] flex max-w-md flex-col justify-center p-6 text-white sm:p-10">
            <h2 className="text-2xl font-bold sm:text-3xl">Ойролцоох хямдралаа ол</h2>
            <p className="mt-3 text-white/75">{places.length} байгууллага газрын зураг дээр. Яг одоо хямдарч буй газрууд хувиараа тэмдэглэгдсэн.</p>
            <Link to="/map" className="btn-sunset mt-6 w-fit">Газрын зураг нээх</Link>
          </div>
        </div>
      </section>

      {/* ---------------- ХЭРХЭН АЖИЛЛАДАГ (алхам дараалалтай) ---------------- */}
      <section className="container-page mt-16">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <h2 className="text-2xl font-bold sm:text-3xl">Гурван алхмаар захиална</h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {HOW.map(([title, text], i) => (
              <li key={title} className="border-t-2 border-ink pt-4">
                <span className="font-display text-sm font-bold text-ember">{i + 1}</span>
                <h3 className="mt-2 font-sans text-base font-extrabold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- ТҮНШ ---------------- */}
      <section className="container-page mt-20">
        <div className="grain relative overflow-hidden rounded-3xl bg-gradient-to-br from-dusk via-night to-midnight p-8 text-white sm:p-12">
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(255_93_58/0.55),transparent_65%)]" aria-hidden="true" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <Store className="h-9 w-9 text-amber" />
              <h2 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">Танай байгууллагад эрэлт багатай үе бий юу?</h2>
              <p className="mt-3 max-w-lg text-white/70">
                Борлогдохгүй үлдэх суудал, ширээ, цагаа орлого болго. Эрэлт багатай болон хаах дөхсөн цагаа
                тохируулахад хямдрал автоматаар харагдаж, захиалга, тасалбар шалгалт, орлогын тайлан нэг дор байна.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link to="/partner/apply" className="btn-sunset h-12 px-6 text-base">Хамтрагч болох хүсэлт илгээх</Link>
              <p className="text-xs text-white/50">Бүртгэл үнэгүй. Админ хүсэлтийг шалгаад зөвшөөрнө.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
