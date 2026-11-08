import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;

  // 1 … 4 5 6 … 12 хэлбэрийн дугаарууд
  const pages = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Хуудаслалт">
      <button className="btn-outline px-3" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Өмнөх хуудас">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-ink-mute">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}
                  className={`h-10 min-w-10 rounded-xl px-3 text-sm font-bold transition-colors ${
                    p === page ? 'bg-ink text-paper' : 'bg-surface text-ink-soft hover:bg-ink/5'}`}>
            {p}
          </button>
        ),
      )}
      <button className="btn-outline px-3" disabled={page === pageCount} onClick={() => onChange(page + 1)} aria-label="Дараагийн хуудас">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
