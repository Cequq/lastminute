import { toMinutes, ubNow } from '../lib/ub';

// Google-ийн "Popular times" маягийн цаг тутмын ачааллын график.
// Эрэлт багатай, хаах дөхсөн хямдралтай цагуудыг онцолж, одоогийн цагийг тэмдэглэнэ.
export default function BusyChart({ profile, windows = [], weekday, opensAt, closesAt, compact = false }) {
  const now = ubNow();
  const open = toMinutes(opensAt ?? '00:00');
  let close = toMinutes(closesAt ?? '23:59');
  if (close <= open) close += 1440; // шөнө дундаас хойш хаадаг

  const hours = [];
  for (let m = Math.floor(open / 60) * 60; m < close; m += 60) hours.push((m / 60) % 24);

  const discountAt = (h) => {
    const ws = windows.filter((w) => w.weekday === weekday && toMinutes(w.start_time) < (h + 1) * 60 && toMinutes(w.end_time) > h * 60);
    return ws.length ? Math.max(...ws.map((w) => w.discount)) : null;
  };

  return (
    <div>
      <div className={`flex items-end gap-[3px] ${compact ? 'h-16' : 'h-32'}`} role="img"
           aria-label="Цаг тутмын ачаалал. Хямдралтай цагуудыг шар өнгөөр тэмдэглэсэн.">
        {hours.map((h) => {
          const v = Math.max(6, profile?.[h] ?? 0);
          const d = discountAt(h);
          const isNow = weekday === now.weekday && h === now.hour;
          return (
            <div key={h} className="group relative flex h-full flex-1 flex-col justify-end">
              {d && !compact && (
                <span className="mb-1 text-center text-[9px] font-extrabold text-ember">−{d}</span>
              )}
              <div className={`w-full rounded-t-[4px] transition-colors ${
                     isNow ? 'bg-ink' : d ? 'bg-gradient-to-t from-ember to-amber' : 'bg-brand/20 group-hover:bg-brand/35'}`}
                   style={{ height: `${v}%` }}
                   title={`${String(h).padStart(2, '0')}:00, ачаалал ${v}%${d ? `, −${d}%` : ''}`} />
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-1.5 flex gap-[3px] text-[10px] font-semibold text-ink-mute">
          {hours.map((h, i) => (
            <span key={h} className="flex-1 text-center">{i % 3 === 0 ? String(h).padStart(2, '0') : ''}</span>
          ))}
        </div>
      )}
    </div>
  );
}
