import { useEffect, useState } from 'react';
import { Plus, Trash2, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER, hhmm, toMinutes } from '../../lib/ub';
import BusyChart from '../BusyChart';
import Field from '../ui/Field';
import { Spinner, ErrorState } from '../ui/States';

const EMPTY = { days: [1, 2, 3, 4, 5], start_time: '14:00', end_time: '17:00', discount: 30, kind: 'off_peak' };

// Байгууллагын долоо хоног бүр давтагдах хямдралтай цагуудыг удирдана
export default function QuietHoursManager({ business }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewDay, setPreviewDay] = useState(1);

  const load = async () => {
    setError(null);
    const { data, error: err } = await supabase.from('quiet_hours').select('*')
      .eq('business_id', business.id).order('weekday').order('start_time');
    if (err) setError(err.message); else setRows(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [business.id]);

  const toggleDay = (d) => setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

  const add = async (e) => {
    e.preventDefault();
    if (form.days.length === 0) { setFormError('Дор хаяж нэг гараг сонгоно уу'); return; }
    if (toMinutes(form.end_time) <= toMinutes(form.start_time)) { setFormError('Дуусах цаг эхлэх цагаас хойш байна'); return; }
    const d = Number(form.discount);
    if (!(d >= 5 && d <= 90)) { setFormError('Хямдрал 5-90% хооронд байна'); return; }
    // Давхцал шалгах: нэг гарагт хоёр цонх давхцахгүй
    const clash = rows.find((r) => form.days.includes(r.weekday)
      && toMinutes(form.start_time) < toMinutes(r.end_time) && toMinutes(form.end_time) > toMinutes(r.start_time));
    if (clash) { setFormError(`${WEEKDAYS[clash.weekday]} гарагийн ${hhmm(clash.start_time)}–${hhmm(clash.end_time)} цагтай давхцаж байна`); return; }

    setFormError(null);
    setBusy(true);
    const payload = form.days.map((wd) => ({
      business_id: business.id, weekday: wd, start_time: form.start_time, end_time: form.end_time, discount: d, kind: form.kind,
    }));
    const { error: err } = await supabase.from('quiet_hours').insert(payload);
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    toast.success(`${payload.length} гарагт хямдралтай цаг нэмэгдлээ`);
    load();
  };

  const remove = async (id) => {
    setRows((r) => r.filter((x) => x.id !== id));
    const { error: err } = await supabase.from('quiet_hours').delete().eq('id', id);
    if (err) { toast.error(err.message); load(); } else toast.success('Устгагдлаа');
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="panel space-y-4 p-5">
        <h2 className="font-sans text-base font-extrabold">Шинэ хямдралтай цаг</h2>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Төрөл">
          {[['off_peak', 'Эрэлт багатай цаг', Sun, 'Оргил бус, хоосон үе'], ['closing', 'Хаах дөхсөн', Moon, 'Хаахын өмнөх сүүлийн цаг']].map(([k, l, I, t]) => (
            <button type="button" key={k} role="radio" aria-checked={form.kind === k} onClick={() => setForm({ ...form, kind: k })}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left ${form.kind === k ? 'border-brand bg-brand-tint' : 'border-line'}`}>
              <I className="h-5 w-5 text-brand" />
              <span><span className="block text-sm font-bold">{l}</span><span className="block text-xs text-ink-mute">{t}</span></span>
            </button>
          ))}
        </div>
        <div>
          <span className="label">Гарагууд</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => (
              <button type="button" key={d} onClick={() => toggleDay(d)} aria-pressed={form.days.includes(d)}
                      className={`h-10 w-12 rounded-xl text-sm font-bold ${form.days.includes(d) ? 'bg-ink text-paper' : 'bg-paper text-ink-soft'}`}>
                {WEEKDAYS_SHORT[d]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field id="qh-start" label="Эхлэх" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <Field id="qh-end" label="Дуусах" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          <Field id="qh-discount" label="Хямдрал %" type="number" min="5" max="90" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Нэмэх</button>
      </form>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-base font-extrabold">Ачаалал ба хямдралтай цаг</h2>
          <div className="flex gap-1">
            {WEEK_ORDER.map((d) => (
              <button key={d} onClick={() => setPreviewDay(d)} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${previewDay === d ? 'bg-ink text-paper' : 'bg-paper text-ink-soft'}`}>{WEEKDAYS_SHORT[d]}</button>
            ))}
          </div>
        </div>
        <BusyChart profile={business.busy_profile} windows={rows ?? []} weekday={previewDay} opensAt={business.opens_at} closesAt={business.closes_at} />
        <p className="mt-3 text-xs text-ink-mute">Цэнхэр багана намхан цагууд нь хямдрал тавихад хамгийн тохиромжтой.</p>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="px-5 pt-5 font-sans text-base font-extrabold">Долоо хоногийн хуваарь</h2>
        {!rows ? <div className="grid h-32 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div> : (
          <ul className="mt-3 divide-y divide-line">
            {WEEK_ORDER.map((wd) => {
              const ws = rows.filter((r) => r.weekday === wd);
              return (
                <li key={wd} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <span className="w-20 text-sm font-bold">{WEEKDAYS[wd]}</span>
                  {ws.length === 0 && <span className="text-sm text-ink-mute">Хямдралгүй</span>}
                  {ws.map((w) => (
                    <span key={w.id} className={`inline-flex items-center gap-1.5 rounded-lg py-1 pl-2.5 pr-1 text-xs font-bold ${w.kind === 'closing' ? 'bg-amber-tint text-amber-ink' : 'bg-sky-tint text-sky'}`}>
                      {hhmm(w.start_time)}–{hhmm(w.end_time)} −{w.discount}%
                      <button onClick={() => remove(w.id)} className="rounded p-0.5 hover:bg-black/10" aria-label="Устгах"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
