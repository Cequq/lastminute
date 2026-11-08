const moneyFmt = new Intl.NumberFormat('mn-MN');

export const money = (n) => `${moneyFmt.format(Math.round(n ?? 0))}₮`;

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const pad = (n) => String(n).padStart(2, '0');

export function timeOfDay(date) {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Өнөөдөр 19:30", "Маргааш 12:00", "Бямба, 11/08 10:00"
export function friendlyDate(date) {
  const d = new Date(date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - startOfToday) / 86400000);
  if (dayDiff === 0) return `Өнөөдөр ${timeOfDay(d)}`;
  if (dayDiff === 1) return `Маргааш ${timeOfDay(d)}`;
  if (dayDiff === -1) return `Өчигдөр ${timeOfDay(d)}`;
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${timeOfDay(d)}`;
}

export function fullDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${timeOfDay(d)}`;
}

// Секундыг "2ц 15м", "14:05" гэх мэт тоолуур болгоно
export function countdown(seconds) {
  if (seconds <= 0) return 'Эхэлсэн';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}ө ${h}ц`;
  if (h > 0) return `${h}ц ${pad(m)}м`;
  return `${pad(m)}:${pad(s)}`;
}

export function durationLabel(min) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} цаг ${m} мин` : `${h} цаг`;
}

export const BOOKING_STATUS = {
  pending:   { label: 'Хүлээгдэж буй', tone: 'amber' },
  paid:      { label: 'Төлөгдсөн',     tone: 'mint' },
  cancelled: { label: 'Цуцлагдсан',    tone: 'mute' },
  expired:   { label: 'Хугацаа дууссан', tone: 'mute' },
  refund_requested: { label: 'Буцаалт хүлээгдэж буй', tone: 'amber' },
  refunded:  { label: 'Буцаагдсан', tone: 'brand' },
};

export const DISTRICTS = [
  'Баянгол', 'Баянзүрх', 'Сонгинохайрхан', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй', 'Налайх', 'Багануур', 'Багахангай',
];

// Захиалгын id-ийн эхний 8 тэмдэгт — тасалбарын код
export const bookingCode = (id) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

// Тоолуур: "08:42:15" (24 цагаас бага), "2 өдөр 04:12" (түүнээс их)
export function clock(seconds) {
  if (seconds <= 0) return '00:00:00';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return d > 0 ? `${d} өдөр ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Хэрэглэх боломжтой хугацаа: "Өнөөдөр 21:30–23:00"
export function usageWindow(startsAt, durationMinutes) {
  const end = new Date(new Date(startsAt).getTime() + durationMinutes * 60000);
  return `${friendlyDate(startsAt)}–${timeOfDay(end)}`;
}

// Цуцлалтын бодлого хэрэглэгчид ойлгомжтой текстээр
export function cancelPolicy(hours) {
  if (!hours) return { short: 'Буцаалтгүй', long: 'Энэ хямдрал буцаалтгүй. Төлсний дараа цуцлах боломжгүй.', refundable: false };
  return {
    short: `${hours} цагийн өмнө хүртэл үнэгүй цуцална`,
    long: `Эхлэхээс ${hours} цагийн өмнө хүртэл цуцалбал төлбөрийн 100%-ийг буцаана. Түүнээс хойш эсвэл ашигласны дараа буцаалтгүй.`,
    refundable: true,
  };
}
