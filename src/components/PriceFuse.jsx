import { useEffect, useRef, useState } from 'react';
import { useNow } from '../lib/useNow';
import { priceAt, discountAt, fuseProgress } from '../lib/pricing';
import { money } from '../lib/format';

// Шууд буурч буй үнэ — үнэ өөрчлөгдөх мөчид тоо дээрээс доош "унана"
export function LivePrice({ deal, size = 'md' }) {
  const now = useNow();
  const price = priceAt(deal, now);
  const prev = useRef(price);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (price !== prev.current) { prev.current = price; setTick((t) => t + 1); }
  }, [price]);

  const big = size === 'lg';
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span key={tick} className={`price-tick font-display font-bold text-ink ${big ? 'text-4xl sm:text-5xl' : 'text-xl'}`}>
        {money(price)}
      </span>
      <span className={`font-semibold text-ink-mute line-through ${big ? 'text-base' : 'text-xs'}`}>
        {money(deal.original_price)}
      </span>
    </div>
  );
}

// "Гал хамхуул" шугам: хямдрал эхлэх → дээд хэмжээ. Цэг нь одоогийн байрлал.
export function Fuse({ deal, showLabels = false }) {
  const now = useNow();
  const progress = fuseProgress(deal, now);
  const pct = Math.round(discountAt(deal, now));
  const burning = progress > 0 && progress < 1;

  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber to-ember"
             style={{ width: `${progress * 100}%` }} />
        <div className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ember ${burning ? 'fuse-spark' : ''}`}
             style={{ left: `${progress * 100}%` }} />
      </div>
      {showLabels && (
        <div className="mt-2 flex justify-between text-xs font-semibold text-ink-mute">
          <span>−{deal.start_discount}%</span>
          <span className="text-ember">Одоо −{pct}%</span>
          <span>−{deal.max_discount}%</span>
        </div>
      )}
    </div>
  );
}

export function DiscountChip({ deal }) {
  const now = useNow();
  return (
    <span className="rounded-lg bg-amber px-2 py-1 font-display text-xs font-bold text-ink">
      −{Math.round(discountAt(deal, now))}%
    </span>
  );
}
