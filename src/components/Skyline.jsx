import { useMemo } from 'react';

// Hero-ийн доод хэсгийн хотын дүрс. Цонхнууд аажмаар унтарч "хаах дөхсөн цаг"-ийг илэрхийлнэ.
// Санамсаргүй тоо нь seed-тэй тул дүрс үргэлж ижил гарна.
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export default function Skyline({ className = '' }) {
  const { buildings, windows } = useMemo(() => {
    const r = rng(42);
    const bs = [];
    const ws = [];
    let x = -10;
    while (x < 1450) {
      const w = 38 + Math.floor(r() * 70);
      // хотын төв хэсэг илүү өндөр
      const center = 1 - Math.abs(x - 760) / 900;
      const h = 50 + Math.floor(r() * 90 + center * 120);
      const tower = r() > 0.88;
      bs.push({ x, w, h: tower ? h + 60 : h, tower });
      const cols = Math.floor((w - 10) / 11);
      const rows = Math.floor((h - 16) / 14);
      for (let c = 0; c < cols; c++) {
        for (let row = 0; row < rows; row++) {
          const v = r();
          if (v > 0.62) {
            ws.push({
              x: x + 7 + c * 11, y: 240 - h + 10 + row * 14,
              off: v > 0.9, delay: (r() * 14).toFixed(1),
            });
          }
        }
      }
      x += w + 2 + Math.floor(r() * 6);
    }
    return { buildings: bs, windows: ws };
  }, []);

  return (
    <svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sky-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12303F" />
          <stop offset="1" stopColor="#0B1A24" />
        </linearGradient>
      </defs>
      {/* алс уулс (Богд хан уул) */}
      <path d="M0 150 C 180 100, 300 120, 420 95 S 700 70, 860 105 S 1160 80, 1440 120 L1440 240 L0 240 Z" fill="#173A4A" opacity="0.7" />
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={240 - b.h} width={b.w} height={b.h} fill="url(#sky-b)" />
          {b.tower && <path d={`M${b.x + b.w / 2 - 2} ${240 - b.h - 18} h4 v18 h-4z`} fill="#0B1A24" />}
        </g>
      ))}
      {windows.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="5" height="7" rx="1" fill="#EDB45C"
              className={w.off ? 'window-off' : undefined}
              style={w.off ? { animationDelay: `-${w.delay}s` } : { opacity: 0.85 }} />
      ))}
    </svg>
  );
}
