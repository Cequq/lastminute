import { Link } from 'react-router-dom';

// LastMinute лого: тэнгэрийн хаяанд жаргаж буй нар + нарны цагийн зүү.
// "Өдөр дуусах дөхөж, сүүлийн минутууд үлдэж байна" гэсэн санаа.
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#163847" />
          <stop offset="1" stopColor="#0B1A24" />
        </linearGradient>
        <linearGradient id="lm-sun" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#E4684A" />
          <stop offset="1" stopColor="#EDB45C" />
        </linearGradient>
        <clipPath id="lm-clip"><rect width="64" height="64" rx="18" /></clipPath>
      </defs>
      <g clipPath="url(#lm-clip)">
        <rect width="64" height="64" fill="url(#lm-bg)" />
        {/* жаргаж буй нар */}
        <path d="M14 44 A18 18 0 0 1 50 44 Z" fill="url(#lm-sun)" />
        {/* минутын зураасууд — сүүлийнх нь л үлдсэн */}
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M11.5 31.5 l-3.6 -1.6" opacity="0.25" />
          <path d="M18.6 21.4 l-2.4 -3.1" opacity="0.35" />
          <path d="M32 17.2 v-4" opacity="0.5" />
          <path d="M45.4 21.4 l2.4 -3.1" opacity="0.95" />
        </g>
        {/* зүү */}
        <path d="M32 44 L44 24.5" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="32" cy="44" r="3.4" fill="#fff" />
        {/* тэнгэрийн хаяа */}
        <rect x="0" y="44" width="64" height="20" fill="#0B1A24" />
        <path d="M8 49.5 h48" stroke="#EDB45C" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Logo({ light = false, to = '/' }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5" aria-label="LastMinute нүүр хуудас">
      <LogoMark className="h-9 w-9 transition-transform group-hover:-rotate-6" />
      <span className={`font-display text-[17px] leading-none tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        <span className="font-medium">last</span><span className="font-extrabold">minute</span>
      </span>
    </Link>
  );
}
