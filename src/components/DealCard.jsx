import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, Clock, CalendarClock, Info, ShieldCheck, Ban } from 'lucide-react';
import { useNow } from '../lib/useNow';
import { priceAt, discountAt } from '../lib/pricing';
import { clock, money, usageWindow, cancelPolicy } from '../lib/format';
import { iconFor } from '../lib/icons';
import { DEAL_TYPES } from '../lib/ub';
import { distanceKm, kmLabel } from '../lib/geo';
import { useMyLocation } from '../lib/useMyLocation';

// Хямдралын төрлөөр хавтасны "цагийн уур амьсгал"
const MOODS = {
  closing: 'linear-gradient(to top, rgb(11 26 36 / 0.8), rgb(237 180 92 / 0.12) 70%, transparent)',
  off_peak: 'linear-gradient(to top, rgb(11 26 36 / 0.55), transparent 60%)',
  last_minute: 'linear-gradient(to top, rgb(11 26 36 / 0.7), rgb(228 104 74 / 0.18) 60%, transparent 85%)',
};

// Ангиллын өнгөнөөс уусгасан gradient + тал нутгийн өндөршлийн шугам (contour) маягийн хээ
export function coverBackground(color) {
  return [
    'repeating-radial-gradient(circle at 88% 18%, rgb(255 255 255 / 0.09) 0 1px, transparent 1.5px 20px)',
    'radial-gradient(110% 80% at 0% 0%, rgb(255 255 255 / 0.18), transparent 55%)',
    `linear-gradient(150deg, ${color} 0%, color-mix(in oklab, ${color} 62%, #0b1a24) 100%)`,
  ].join(', ');
}

export function DealCover({ deal, className = 'aspect-[16/10] sm:aspect-[4/3]' }) {
  const Icon = iconFor(deal.category_icon);
  const img = deal.image_url || deal.business_cover;
  return (
    <div className={`${className} relative w-full overflow-hidden`} style={img ? undefined : { background: coverBackground(deal.category_color) }}>
      {img ? (
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      ) : (
        <Icon className="absolute -right-[4%] top-[10%] h-[72%] w-auto text-white/20 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3"
              strokeWidth={1} aria-hidden="true" />
      )}
      <div className="absolute inset-0" style={{ background: MOODS[deal.deal_type] }} aria-hidden="true" />
    </div>
  );
}

export function DealTypeBadge({ type, className = '' }) {
  const t = DEAL_TYPES[type] ?? DEAL_TYPES.last_minute;
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ${t.chip} ${className}`}>
      <Icon className="h-3 w-3" /> {t.label}
    </span>
  );
}

export function Rating({ value, count, className = '' }) {
  if (!count) return <span className={`rounded-md bg-brand-tint px-1.5 py-0.5 text-[11px] font-extrabold text-brand ${className}`}>Шинэ</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${className}`} title={`${count} үнэлгээ`}>
      <Star className="h-3.5 w-3.5 fill-amber text-amber" /> {Number(value).toFixed(1)}
      <span className="font-semibold text-ink-mute">({count})</span>
    </span>
  );
}

// Маркетплейсийн бүтээгдэхүүний карт
export default function DealCard({ deal, isFavorite, onToggleFavorite }) {
  const now = useNow();
  const { pos } = useMyLocation();
  const secondsLeft = Math.max(0, (new Date(deal.starts_at).getTime() - now) / 1000);
  const urgent = secondsLeft < 3 * 3600;
  const price = priceAt(deal, now);
  const pct = Math.round(discountAt(deal, now));
  const saving = deal.original_price - price;
  const soldOut = deal.seats_left <= 0;
  const km = deal._km ?? distanceKm(pos, deal);
  const stockPct = Math.max(6, Math.min(100, (deal.seats_left / deal.quantity) * 100));
  const policy = cancelPolicy(deal.cancel_hours);
  const type = DEAL_TYPES[deal.deal_type] ?? DEAL_TYPES.last_minute;
  const TypeIcon = type.icon;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={`/deals/${deal.id}`} className="flex flex-1 flex-col focus-visible:outline-none" aria-label={`${deal.business_name}: ${deal.title}`}>
        <div className="relative">
          <DealCover deal={deal} />
          {/* Хямдралын хувь */}
          <span className="absolute left-3 top-3 rounded-xl bg-ember px-2.5 py-1.5 font-display text-base font-bold leading-none text-white shadow-lg shadow-ember/30">
            −{pct}%
          </span>
          {/* Тоолуур, төрөл */}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums backdrop-blur-md ${
              urgent ? 'bg-ember text-white' : 'bg-white/90 text-midnight'}`}>
              <Clock className="h-3.5 w-3.5" /> {clock(secondsLeft)} үлдсэн
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-extrabold text-ink">{deal.business_name}</p>
            <Rating value={deal.avg_rating} count={deal.review_count} className="shrink-0" />
          </div>
          <h3 className="mt-1 line-clamp-2 font-sans text-[15px] font-semibold leading-snug text-ink-soft group-hover:text-brand">
            {deal.title}
          </h3>

          <ul className="mt-3 space-y-1.5 text-xs text-ink-soft">
            <li className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
              <span className="truncate">{usageWindow(deal.starts_at, deal.duration_minutes)}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: type.color }} />
              <span className="truncate font-semibold" style={{ color: type.color }}>{type.label}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
              <span className="truncate">{deal.district}</span>
              {km != null && <span className="shrink-0 font-bold text-ink">· {kmLabel(km)}</span>}
            </li>
            {deal.terms && (
              <li className="flex items-start gap-1.5">
                <Info className="mt-px h-3.5 w-3.5 shrink-0 text-ink-mute" />
                <span className="line-clamp-1">{deal.terms}</span>
              </li>
            )}
          </ul>

          <div className="mt-auto pt-4">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink-mute line-through">{money(deal.original_price)}</p>
                <p className="font-display text-[22px] font-bold leading-tight text-ink">{money(price)}</p>
              </div>
              <span className="mb-1 whitespace-nowrap rounded-lg bg-mint-tint px-2 py-1 text-[11px] font-extrabold text-mint">
                Хэмнэлт: {money(saving)}
              </span>
            </div>

            <div className="mt-3 border-t border-line/70 pt-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={soldOut ? 'text-rose' : deal.seats_left <= 2 ? 'text-ember' : 'text-ink-soft'}>
                  {soldOut ? 'Дууссан' : `${deal.seats_left} / ${deal.quantity} үлдсэн`}
                </span>
                <span className={`inline-flex items-center gap-1 ${policy.refundable ? 'text-mint' : 'text-ink-mute'}`}>
                  {policy.refundable ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                  {policy.refundable ? 'Үнэгүй цуцлалт' : 'Буцаалтгүй'}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                <div className={`h-full rounded-full ${deal.seats_left <= 2 ? 'bg-ember' : 'bg-brand'}`} style={{ width: `${stockPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {onToggleFavorite && (
        <button onClick={() => onToggleFavorite(deal.id)}
                aria-label={isFavorite ? 'Дуртайгаас хасах' : 'Дуртайд нэмэх'} aria-pressed={isFavorite}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-midnight shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-90">
          <Heart className={`h-[18px] w-[18px] ${isFavorite ? 'fill-rose text-rose' : ''}`} />
        </button>
      )}
    </article>
  );
}
