import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/storage';
import { priceAt } from '../../lib/pricing';
import { friendlyDate, money } from '../../lib/format';
import { rules, validate } from '../../lib/validation';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import ImageUpload from '../../components/ImageUpload';
import Pagination from '../../components/ui/Pagination';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { DEAL_TYPES } from '../../lib/ub';
import { PageHeader, Table } from './ManageUI';

const PAGE = 10;

// <input type="datetime-local"> нь локал цагийг "YYYY-MM-DDTHH:mm" хэлбэрээр авдаг
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const EMPTY = {
  business_id: '', deal_type: 'off_peak', title: '', description: '', image_url: '',
  starts_at: toLocalInput(Date.now() + 6 * 3600000), duration_minutes: 60,
  original_price: 50000, start_discount: 10, max_discount: 50, drop_window_hours: 12, quantity: 2, is_active: true,
  terms: '', cancel_hours: 2,
};

function DealForm({ initial, businesses, fixedBusinessId, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? { ...initial, starts_at: toLocalInput(initial.starts_at) } : { ...EMPTY, business_id: fixedBusinessId ?? '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  // Тохиргоог өөрчлөх бүрт үнэ хэрхэн буурахыг шууд харуулна
  const preview = (() => {
    const startMs = new Date(form.starts_at).getTime();
    if (!+form.original_price || Number.isNaN(startMs)) return null;
    const d = {
      starts_at: startMs, original_price: +form.original_price, start_discount: +form.start_discount,
      max_discount: +form.max_discount, drop_window_hours: Math.max(1, +form.drop_window_hours),
    };
    return { now: priceAt(d), end: priceAt(d, startMs) };
  })();

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, {
      business_id: [rules.required('Байгууллага')],
      title: [rules.length(3, 120, 'Гарчиг')],
      starts_at: [rules.required('Эхлэх цаг'), (v) => (!initial && new Date(v) <= new Date() ? 'Ирээдүйн цаг сонгоно уу' : null)],
      duration_minutes: [rules.min(5, 'Хугацаа'), rules.max(1440, 'Хугацаа')],
      original_price: [rules.min(100, 'Үнэ')],
      start_discount: [rules.min(0, 'Хямдрал'), rules.max(90, 'Хямдрал')],
      max_discount: [rules.min(0, 'Хямдрал'), rules.max(90, 'Хямдрал'),
        (v, all) => (+v >= +all.start_discount ? null : 'Эхлэх хямдралаас бага байж болохгүй')],
      drop_window_hours: [rules.min(1, 'Цонх'), rules.max(168, 'Цонх')],
      quantity: [rules.min(1, 'Тоо'), rules.max(500, 'Тоо')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Формын алдааг засна уу'); return; }

    setBusy(true);
    try {
      let image_url = form.image_url || null;
      if (file) image_url = await uploadImage(file, 'deals');

      const payload = {
        business_id: form.business_id, deal_type: form.deal_type, title: form.title.trim(), description: form.description?.trim() || null, image_url,
        starts_at: new Date(form.starts_at).toISOString(), duration_minutes: +form.duration_minutes,
        original_price: +form.original_price, start_discount: +form.start_discount, max_discount: +form.max_discount,
        drop_window_hours: +form.drop_window_hours, quantity: +form.quantity, is_active: form.is_active,
        terms: form.terms?.trim() || null, cancel_hours: +form.cancel_hours,
      };
      const { error } = initial
        ? await supabase.from('deals').update(payload).eq('id', initial.id)
        : await supabase.from('deals').insert(payload);
      if (error) throw error;
      toast.success(initial ? 'Хямдрал шинэчлэгдлээ' : 'Хямдрал нэмэгдлээ');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open wide onClose={busy ? undefined : onClose} title={initial ? 'Хямдрал засах' : 'Шинэ хямдрал'}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {!fixedBusinessId && (
          <Field id="business_id" label="Байгууллага" error={errors.business_id} className="sm:col-span-2">
            <select id="business_id" value={form.business_id} onChange={set('business_id')} className={`input ${errors.business_id ? 'input-error' : ''}`}>
              <option value="">Сонгох</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <span className="label">Хямдралын төрөл</span>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {Object.entries(DEAL_TYPES).map(([k, t]) => {
              const Icon = t.icon;
              return (
                <button type="button" key={k} role="radio" aria-checked={form.deal_type === k} onClick={() => setForm({ ...form, deal_type: k })}
                        className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${form.deal_type === k ? 'border-brand bg-brand-tint' : 'border-line hover:border-ink/30'}`}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} />
                  <span><span className="block text-sm font-bold">{t.label}</span><span className="block text-xs text-ink-mute">{t.text}</span></span>
                </button>
              );
            })}
          </div>
        </div>
        <Field id="title" label="Гарчиг" value={form.title} onChange={set('title')} error={errors.title} className="sm:col-span-2" placeholder="IMAX 2D: оройн сеанс, 8 суудал" />
        <Field id="description" as="textarea" label="Тайлбар" value={form.description ?? ''} onChange={set('description')} className="sm:col-span-2" />
        <Field id="terms" as="textarea" label="Хэрэглэх нөхцөл" value={form.terms ?? ''} onChange={set('terms')} maxLength={500}
               className="sm:col-span-2" placeholder="Ширээг 15 минут хүлээнэ. Ундаа тусдаа тооцогдоно." hint="Өгүүлбэр бүр картанд тусдаа мөр болж харагдана." />
        <Field id="cancel_hours" label="Цуцлалт, буцаалт" className="sm:col-span-2">
          <select id="cancel_hours" value={form.cancel_hours ?? 2} onChange={set('cancel_hours')} className="input">
            <option value={0}>Буцаалтгүй</option>
            {[1, 2, 3, 6, 12, 24].map((h) => <option key={h} value={h}>Эхлэхээс {h} цагийн өмнө хүртэл үнэгүй цуцална (100% буцаалт)</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <ImageUpload currentUrl={form.image_url} file={file} onFileChange={setFile} error={errors.image} onError={(m) => setErrors((x) => ({ ...x, image: m }))} />
        </div>
        <Field id="starts_at" label="Эхлэх цаг" type="datetime-local" value={form.starts_at} onChange={set('starts_at')} error={errors.starts_at} />
        <Field id="duration_minutes" label="Үргэлжлэх (мин)" type="number" value={form.duration_minutes} onChange={set('duration_minutes')} error={errors.duration_minutes} />
        <Field id="original_price" label="Анхны үнэ (₮)" type="number" step="100" value={form.original_price} onChange={set('original_price')} error={errors.original_price} />
        <Field id="quantity" label="Суудал / цагийн тоо" type="number" value={form.quantity} onChange={set('quantity')} error={errors.quantity} />
        <Field id="start_discount" label="Эхлэх хямдрал (%)" type="number" value={form.start_discount} onChange={set('start_discount')} error={errors.start_discount} />
        <Field id="max_discount" label="Дээд хямдрал (%)" type="number" value={form.max_discount} onChange={set('max_discount')} error={errors.max_discount} />
        <Field id="drop_window_hours" label="Буурж эхлэх (эхлэхээс өмнөх цаг)" type="number" value={form.drop_window_hours} onChange={set('drop_window_hours')} error={errors.drop_window_hours} />
        <label className="flex items-center gap-3 self-end rounded-xl border border-line px-4 py-2.5">
          <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="h-4 w-4 accent-brand" />
          <span className="text-sm font-semibold">Хэрэглэгчдэд харагдана</span>
        </label>

        {preview && (
          <div className="rounded-xl bg-amber-tint p-4 text-sm sm:col-span-2">
            Одоо захиалбал <b>{money(preview.now)}</b>, эхлэх мөчид <b>{money(preview.end)}</b> болж буурна.
          </div>
        )}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-outline" disabled={busy}>Болих</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Хадгалах</button>
        </div>
      </form>
    </Modal>
  );
}

export default function DealsManager({ businessId = null, title = 'Хямдрал' }) {
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | deal
  const [deleting, setDeleting] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    if (businessId) return;
    supabase.from('businesses').select('id, name').order('name').then(({ data }) => setBusinesses(data ?? []));
  }, [businessId]);

  const load = async () => {
    setError(null);
    let query = supabase.from('deal_listings').select('*', { count: 'exact' });
    if (businessId) query = query.eq('business_id', businessId);
    const nowIso = new Date().toISOString();
    if (status === 'upcoming') query = query.gt('starts_at', nowIso).eq('is_active', true);
    if (status === 'past') query = query.lte('starts_at', nowIso);
    if (status === 'inactive') query = query.eq('is_active', false);
    if (q.trim()) {
      const s = q.trim().replace(/[,()%*\\]/g, ' ');
      query = query.or(`title.ilike.%${s}%,business_name.ilike.%${s}%`);
    }
    const from = (page - 1) * PAGE;
    const { data, error: err, count: c } = await query
      .order('starts_at', { ascending: status !== 'past' })
      .range(from, from + PAGE - 1);
    if (err) { setError(err.message); return; }
    setRows(data);
    setCount(c ?? 0);
  };

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, status, page, businessId]);

  const toggleActive = async (d) => {
    const { error: err } = await supabase.from('deals').update({ is_active: !d.is_active }).eq('id', d.id);
    if (err) toast.error(err.message); else { toast.success(d.is_active ? 'Нуугдлаа' : 'Нийтлэгдлээ'); load(); }
  };

  const remove = async () => {
    setBusyDelete(true);
    const { error: err } = await supabase.from('deals').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (err) {
      // 23503 = foreign key: захиалгатай deal-ийг устгахгүй (on delete restrict)
      toast.error(err.code === '23503' ? 'Энэ хямдралд захиалга байгаа тул устгах боломжгүй. Оронд нь нууна уу.' : err.message);
    } else {
      toast.success('Хямдрал устгагдлаа');
      load();
    }
    setDeleting(null);
  };

  return (
    <>
      <PageHeader title={title} text={`${count} илэрц`}
                   action={<button onClick={() => setEditing('new')} className="btn-primary"><Plus className="h-4 w-4" /> Шинэ хямдрал</button>} />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Гарчиг, байгууллагаар хайх" className="input pl-9" aria-label="Хайх" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input sm:w-48" aria-label="Төлөв">
          <option value="upcoming">Идэвхтэй, ирээдүйн</option>
          <option value="past">Өнгөрсөн</option>
          <option value="inactive">Нуусан</option>
          <option value="all">Бүгд</option>
        </select>
      </div>

      {error ? <ErrorState message={error} onRetry={load} />
        : !rows ? <div className="panel grid h-60 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>
        : rows.length === 0 ? <EmptyState title="Хямдрал олдсонгүй" text="Шүүлтүүрээ өөрчлөх эсвэл шинэ хямдрал нэмнэ үү." />
        : (
          <Table head={['Хямдрал', 'Төрөл', 'Эхлэх', 'Одоогийн үнэ', 'Үлдсэн', 'Төлөв', '']}>
            {rows.map((d) => (
              <tr key={d.id} className="align-middle">
                <td className="max-w-72 px-4 py-3">
                  <p className="truncate font-bold">{d.title}</p>
                  <p className="truncate text-xs text-ink-mute">{d.business_name}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${DEAL_TYPES[d.deal_type].soft}`}>{DEAL_TYPES[d.deal_type].label}</span></td>
                <td className="whitespace-nowrap px-4 py-3">{friendlyDate(d.starts_at)}</td>
                <td className="whitespace-nowrap px-4 py-3"><b>{money(d.current_price)}</b> <span className="text-xs text-ink-mute">−{d.current_discount}%</span></td>
                <td className="px-4 py-3">{d.seats_left}/{d.quantity}</td>
                <td className="px-4 py-3">{d.is_active ? <Badge tone="mint">Нийтэлсэн</Badge> : <Badge>Нуусан</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => toggleActive(d)} className="btn-ghost p-2" title={d.is_active ? 'Нуух' : 'Нийтлэх'} aria-label={d.is_active ? 'Нуух' : 'Нийтлэх'}>
                      {d.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditing(d)} className="btn-ghost p-2" aria-label="Засах"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleting(d)} className="btn-ghost p-2 text-rose" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      <Pagination page={page} pageCount={Math.ceil(count / PAGE)} onChange={setPage} />

      {editing && (
        <DealForm initial={editing === 'new' ? null : editing} businesses={businesses} fixedBusinessId={businessId}
                  onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      <ConfirmDialog open={!!deleting} busy={busyDelete} title="Хямдрал устгах уу?"
                     message={`"${deleting?.title}" бүр мөсөн устна. Энэ үйлдлийг буцаах боломжгүй.`}
                     onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
