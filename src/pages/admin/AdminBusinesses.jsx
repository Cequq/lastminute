import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Building2, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/storage';
import { DISTRICTS } from '../../lib/format';
import { rules, validate } from '../../lib/validation';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import ImageUpload from '../../components/ImageUpload';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { AdminHeader, Table } from './AdminLayout';

const EMPTY = { name: '', category_id: '', description: '', district: 'Сүхбаатар', address: '', phone: '', cover_url: '', is_active: true };

function BusinessForm({ initial, categories, onClose, onSaved }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, {
      name: [rules.length(2, 80, 'Нэр')],
      category_id: [rules.required('Ангилал')],
      district: [rules.required('Дүүрэг')],
      phone: [(v) => (!v || /^[\d\s-]{6,12}$/.test(v) ? null : 'Утасны дугаар буруу')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      let cover_url = form.cover_url || null;
      if (file) cover_url = await uploadImage(file, 'businesses');
      const payload = {
        name: form.name.trim(), category_id: +form.category_id, description: form.description?.trim() || null,
        district: form.district, address: form.address?.trim() || null, phone: form.phone?.trim() || null,
        cover_url, is_active: form.is_active,
      };
      const { error } = initial
        ? await supabase.from('businesses').update(payload).eq('id', initial.id)
        : await supabase.from('businesses').insert(payload);
      if (error) throw error;
      toast.success(initial ? 'Байгууллага шинэчлэгдлээ' : 'Байгууллага нэмэгдлээ');
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open wide onClose={busy ? undefined : onClose} title={initial ? 'Байгууллага засах' : 'Шинэ байгууллага'}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Нэр" value={form.name} onChange={set('name')} error={errors.name} />
        <Field id="category_id" label="Ангилал" error={errors.category_id}>
          <select id="category_id" value={form.category_id} onChange={set('category_id')} className={`input ${errors.category_id ? 'input-error' : ''}`}>
            <option value="">Сонгох</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="district" label="Дүүрэг" error={errors.district}>
          <select id="district" value={form.district} onChange={set('district')} className="input">
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field id="phone" label="Утас" value={form.phone ?? ''} onChange={set('phone')} error={errors.phone} />
        <Field id="address" label="Хаяг" value={form.address ?? ''} onChange={set('address')} className="sm:col-span-2" />
        <Field id="description" as="textarea" label="Тайлбар" value={form.description ?? ''} onChange={set('description')} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <ImageUpload currentUrl={form.cover_url} file={file} onFileChange={setFile} error={errors.image} onError={(m) => setErrors((x) => ({ ...x, image: m }))} />
        </div>
        <label className="flex items-center gap-3 sm:col-span-2">
          <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="h-4 w-4 accent-brand" />
          <span className="text-sm font-semibold">Идэвхтэй</span>
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-outline" disabled={busy}>Болих</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Хадгалах</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminBusinesses() {
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const load = async () => {
    setError(null);
    // businesses → categories (N:1) болон deals (1:N)-ийн тоог нэг query-гээр
    const [b, c] = await Promise.all([
      supabase.from('businesses').select('*, categories(name, color), deals(count), owner:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    if (b.error) { setError(b.error.message); return; }
    setRows(b.data);
    setCategories(c.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const remove = async () => {
    setBusyDelete(true);
    const { error: err } = await supabase.from('businesses').delete().eq('id', deleting.id);
    setBusyDelete(false);
    setDeleting(null);
    if (err) toast.error(err.code === '23503' ? 'Захиалгатай хямдрал байгаа тул устгах боломжгүй. Идэвхгүй болгоно уу.' : err.message);
    else { toast.success('Байгууллага устгагдлаа'); load(); }
  };

  const filtered = rows?.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <AdminHeader title="Байгууллага" text="Хямдрал санал болгодог кино театр, ресторан, салон…"
                   action={<button onClick={() => setEditing('new')} className="btn-primary"><Plus className="h-4 w-4" /> Шинэ байгууллага</button>} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэрээр хайх" className="input pl-9" aria-label="Хайх" />
      </div>
      {error ? <ErrorState message={error} onRetry={load} />
        : !filtered ? <div className="panel grid h-60 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>
        : filtered.length === 0 ? <EmptyState icon={Building2} title="Байгууллага олдсонгүй" />
        : (
          <Table head={['Нэр', 'Ангилал', 'Дүүрэг', 'Хамтрагч', 'Хямдрал', 'Төлөв', '']}>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3"><p className="font-bold">{b.name}</p><p className="text-xs text-ink-mute">{b.phone}</p></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: b.categories?.color }} />{b.categories?.name}</span></td>
                <td className="px-4 py-3">{b.district}</td>
                <td className="px-4 py-3 text-xs">{b.owner?.full_name ?? <span className="text-ink-mute">—</span>}</td>
                <td className="px-4 py-3">{b.deals?.[0]?.count ?? 0}</td>
                <td className="px-4 py-3">{b.is_active ? <Badge tone="mint">Идэвхтэй</Badge> : <Badge>Идэвхгүй</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link to={`/partner?b=${b.id}`} className="btn-ghost p-2" title="Хуваарь, хямдрал, байршил" aria-label="Хамтрагчийн самбараар удирдах"><CalendarClock className="h-4 w-4" /></Link>
                    <button onClick={() => setEditing(b)} className="btn-ghost p-2" aria-label="Засах"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleting(b)} className="btn-ghost p-2 text-rose" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      {editing && <BusinessForm initial={editing === 'new' ? null : editing} categories={categories}
                                onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmDialog open={!!deleting} busy={busyDelete} title="Байгууллага устгах уу?"
                     message={`"${deleting?.name}" болон түүний бүх хямдрал устна. Буцаах боломжгүй.`}
                     onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
