import { Moon, Sun, Timer } from 'lucide-react';

// Эрэлт багатай, хаах дөхсөн цагийг Улаанбаатарын цагаар тооцно (хэрэглэгч гадаадад байсан ч зөв)
const TZ = 'Asia/Ulaanbaatar';
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function ubNow(date = new Date()) {
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return { weekday: WD[parts.weekday], minutes: Number(parts.hour) * 60 + Number(parts.minute), hour: Number(parts.hour) };
}

export const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
export const WEEKDAYS_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
// Долоо хоногийг Даваагаас эхлүүлж харуулна
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const toMinutes = (t) => { const [h, m] = String(t).split(':'); return Number(h) * 60 + Number(m); };
export const hhmm = (t) => String(t ?? '').slice(0, 5);

// Яг одоо идэвхтэй хямдралын цонх (хамгийн их хямдралтайг нь)
export function activeWindow(windows, at = new Date()) {
  const { weekday, minutes } = ubNow(at);
  return windows
    .filter((w) => w.weekday === weekday && minutes >= toMinutes(w.start_time) && minutes <= toMinutes(w.end_time))
    .sort((a, b) => b.discount - a.discount)[0] ?? null;
}

// Дараагийн хямдралын цонх ба хэдэн минутын дараа эхлэх
export function nextWindow(windows, at = new Date()) {
  const { weekday, minutes } = ubNow(at);
  let best = null;
  for (const w of windows) {
    let delta = ((w.weekday - weekday + 7) % 7) * 1440 + toMinutes(w.start_time) - minutes;
    if (delta <= 0) delta += 7 * 1440;
    if (!best || delta < best.inMinutes) best = { window: w, inMinutes: delta };
  }
  return best;
}

export function inLabel(minutes) {
  if (minutes < 60) return `${minutes} минутын дараа`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} цагийн дараа`;
  return `${Math.round(minutes / 1440)} хоногийн дараа`;
}

// Хямдралын гурван төрөл
export const DEAL_TYPES = {
  closing: {
    label: 'Хаах дөхсөн', icon: Moon,
    text: 'Хаахын өмнөх сүүлчийн цаг, өдрийн үлдсэн хоол',
    chip: 'bg-amber text-midnight', soft: 'bg-amber-tint text-amber-ink', color: '#D9963B',
  },
  off_peak: {
    label: 'Эрэлт багатай цаг', icon: Sun,
    text: 'Ажлын өдрийн өдөр, оргил бус цагууд',
    chip: 'bg-sky text-white', soft: 'bg-sky-tint text-sky', color: '#4F8DB5',
  },
  last_minute: {
    label: 'Сүүлчийн минут', icon: Timer,
    text: 'Цуцлагдсан, зарагдаагүй суудал',
    chip: 'bg-ember text-white', soft: 'bg-ember-tint text-ember', color: '#E4684A',
  },
};

export const QUIET_KINDS = {
  off_peak: 'Эрэлт багатай цаг',
  closing: 'Хаах дөхсөн',
};
