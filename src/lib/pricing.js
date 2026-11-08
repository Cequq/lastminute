// Үнэ тооцох томьёо. supabase/migrations дахь deal_discount_at / deal_price_at-тай ЯГ ижил.
// Frontend энэ томьёогоор үнийг секунд тутам шинэчилж харуулна,
// харин төлөх үнийг сервер (create_pending_booking) дахин тооцдог.

export function discountAt(deal, at = Date.now()) {
  const startsAt = new Date(deal.starts_at).getTime();
  const windowMs = deal.drop_window_hours * 3600 * 1000;
  const windowStart = startsAt - windowMs;

  if (at >= startsAt) return deal.max_discount;
  if (at <= windowStart) return deal.start_discount;

  const progress = (at - windowStart) / windowMs; // 0 → 1
  return deal.start_discount + (deal.max_discount - deal.start_discount) * progress;
}

export function priceAt(deal, at = Date.now()) {
  const pct = discountAt(deal, at);
  const price = Math.round((deal.original_price * (100 - pct)) / 100 / 100) * 100;
  return Math.max(100, price);
}

// Буурах цонхны хэдэн хувь өнгөрснийг (0..1) — "гал хамхуул" шугамд ашиглана
export function fuseProgress(deal, at = Date.now()) {
  const startsAt = new Date(deal.starts_at).getTime();
  const windowMs = deal.drop_window_hours * 3600 * 1000;
  return Math.min(1, Math.max(0, (at - (startsAt - windowMs)) / windowMs));
}

// Дараагийн 100₮-ийн бууралт хэдэн секундын дараа болохыг тооцно
export function nextDropInSeconds(deal, at = Date.now()) {
  const current = priceAt(deal, at);
  const startsAt = new Date(deal.starts_at).getTime();
  if (at >= startsAt) return null;
  // 30 секундын алхмаар урагш хайна (хамгийн ихдээ 2 цаг)
  for (let s = 30; s <= 7200; s += 30) {
    const t = at + s * 1000;
    if (t >= startsAt) return null;
    if (priceAt(deal, t) < current) return s;
  }
  return null;
}
