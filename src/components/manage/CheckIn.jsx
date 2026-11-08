import { useRef, useState } from 'react';
import { ScanLine, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { fullDate, money } from '../../lib/format';
import { Spinner } from '../ui/States';
import { PageHeader } from './ManageUI';

// Үйлчлүүлэгч ирэхэд тасалбарын 8 тэмдэгт кодыг оруулж шалгана.
// lookup_booking / check_in_booking функцууд зөвхөн тухайн байгууллагын эзэн эсвэл админд ажиллана.
export default function CheckIn() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const lookup = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[0-9A-F]{8}$/.test(c)) { setError('Код 8 тэмдэгттэй (0-9, A-F) байна'); setResult(null); return; }
    setBusy(true); setError(null); setResult(null);
    const { data, error: err } = await supabase.rpc('lookup_booking', { p_code: c });
    setBusy(false);
    if (err) setError(err.message); else setResult(data);
  };

  const confirm = async () => {
    setBusy(true);
    const { data, error: err } = await supabase.rpc('check_in_booking', { p_booking_id: result.id });
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    setResult({ ...result, checked_in_at: data });
    toast.success('Үйлчлүүлэгч ирснийг бүртгэлээ');
    setTimeout(() => { setCode(''); inputRef.current?.focus(); }, 300);
  };

  const canCheckIn = result && result.status === 'paid' && !result.checked_in_at;

  return (
    <div className="max-w-xl">
      <PageHeader title="Тасалбар шалгах" text="Үйлчлүүлэгчийн тасалбар дээрх 8 тэмдэгт кодыг оруулна уу." />
      <form onSubmit={lookup} className="panel flex gap-2 p-3">
        <label htmlFor="ticket-code" className="sr-only">Тасалбарын код</label>
        <input id="ticket-code" ref={inputRef} autoFocus value={code} maxLength={8} autoComplete="off"
               onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))}
               placeholder="A1B2C3D4" className="input h-14 flex-1 text-center font-display text-2xl font-bold tracking-[0.3em]" />
        <button className="btn-primary h-14 px-5" disabled={busy || code.length < 8}>
          {busy ? <Spinner className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />} Шалгах
        </button>
      </form>

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-rose-tint p-4 text-sm font-bold text-rose">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className={`panel mt-4 overflow-hidden ${result.checked_in_at ? 'border-brand/40' : ''}`}>
          <div className={`flex items-center gap-3 px-5 py-4 font-extrabold ${
            result.checked_in_at ? 'bg-brand-tint text-brand' : result.status === 'paid' ? 'bg-mint-tint text-mint' : 'bg-rose-tint text-rose'}`}>
            {result.checked_in_at ? <><CheckCircle2 className="h-5 w-5" /> {fullDate(result.checked_in_at)}-д ирсэн гэж бүртгэгдсэн</>
              : result.status === 'paid' ? <><CheckCircle2 className="h-5 w-5" /> Хүчинтэй тасалбар</>
              : <><AlertTriangle className="h-5 w-5" /> Төлбөр төлөгдөөгүй ({result.status})</>}
          </div>
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div className="col-span-2"><dt className="text-ink-mute">Хямдрал</dt><dd className="font-bold">{result.deal_title}</dd></div>
            <div><dt className="text-ink-mute">Цаг</dt><dd className="font-bold">{fullDate(result.starts_at)}</dd></div>
            <div><dt className="text-ink-mute">Тоо</dt><dd className="font-bold">{result.quantity}</dd></div>
            <div><dt className="text-ink-mute">Үйлчлүүлэгч</dt><dd className="flex items-center gap-1.5 font-bold"><User className="h-4 w-4" /> {result.customer_name || '—'}</dd></div>
            <div><dt className="text-ink-mute">Төлсөн</dt><dd className="font-bold">{money(result.total_amount)}</dd></div>
          </dl>
          {canCheckIn && (
            <div className="border-t border-line p-5">
              <button onClick={confirm} disabled={busy} className="btn-primary h-12 w-full text-base">
                {busy && <Spinner className="h-4 w-4" />} Ирснийг баталгаажуулах
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
