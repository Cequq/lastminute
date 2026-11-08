import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { CATEGORY_ICONS, iconFor } from '../../lib/icons';
import { rules, validate } from '../../lib/validation';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { ErrorState, Spinner } from '../../components/ui/States';
import { AdminHeader } from './AdminLayout';

const EMPTY = { name: '', slug: '', icon: 'Tag', color: '#2f7a63', sort_order: 0 };

function CategoryForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, {
      name: [rules.length(2, 40, 'Нэр')],
      slug: [(v) => (/^[a-z0-9-]{2,30}$/.test(v) ? null : 'Зөвхөн латин жижиг үсэг, тоо, зураас (2-30)')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const payload = { name: form.name.trim(), slug: form.slug, icon: form.icon, color: form.color, sort_order: +form.sort_order || 0 };
    const { error } = initial
      ? await supabase.from('categories').update(payload).eq('id', initial.id)
      : await supabase.from('categories').insert(payload);
    setBusy(false);
    if (error) { toast.error(error.code === '23505' ? 'Ийм нэр эсвэл slug аль хэдийн байна' : error.message); return; }
    toast.success('Ангилал хадгалагдлаа');
    onSaved();
  };

  return (
    <Modal open onClose={busy ? undefined : onClose} title={initial ? 'Ангилал засах' : 'Шинэ ангилал'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="name" label="Нэр" value={form.name} onChange={set('name')} error={errors.name} />
        <Field id="slug" label="Slug (URL-д)" value={form.slug} onChange={set('slug')} error={errors.slug} placeholder="cinema" />
        <div>
          <span className="label">Icon</span>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => (
              <button type="button" key={name} onClick={() => setForm({ ...form, icon: name })} aria-label={name} aria-pressed={form.icon === name}
                      className={`grid h-9 place-items-center rounded-lg border ${form.icon === name ? 'border-brand bg-brand-tint text-brand' : 'border-line'}`}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field id="color" label="Өнгө">
            <input id="color" type="color" value={form.color} onChange={set('color')} className="h-11 w-full cursor-pointer rounded-xl border border-line bg-surface p-1" />
          </Field>
          <Field id="sort_order" label="Дараалал" type="number" value={form.sort_order} onChange={set('sort_order')} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline" disabled={busy}>Болих</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Хадгалах</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCategories() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const load = async () => {
    setError(null);
    const { data, error: err } = await supabase.from('categories').select('*, businesses(count)').order('sort_order');
    if (err) setError(err.message); else setRows(data);
  };
  useEffect(() => { load(); }, []);

  const remove = async () => {
    setBusyDelete(true);
    const { error: err } = await supabase.from('categories').delete().eq('id', deleting.id);
    setBusyDelete(false);
    setDeleting(null);
    if (err) toast.error(err.code === '23503' ? 'Энэ ангилалд байгууллага байгаа тул устгах боломжгүй' : err.message);
    else { toast.success('Ангилал устгагдлаа'); load(); }
  };

  return (
    <>
      <AdminHeader title="Ангилал" action={<button onClick={() => setEditing('new')} className="btn-primary"><Plus className="h-4 w-4" /> Шинэ ангилал</button>} />
      {error ? <ErrorState message={error} onRetry={load} />
        : !rows ? <div className="panel grid h-60 place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>
        : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => {
              const Icon = iconFor(c.icon);
              return (
                <div key={c.id} className="panel flex items-center gap-4 p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ background: c.color }}><Icon className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="text-xs text-ink-mute">/{c.slug}, {c.businesses?.[0]?.count ?? 0} байгууллага</p>
                  </div>
                  <button onClick={() => setEditing(c)} className="btn-ghost p-2" aria-label="Засах"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleting(c)} className="btn-ghost p-2 text-rose" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      {editing && <CategoryForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmDialog open={!!deleting} busy={busyDelete} title="Ангилал устгах уу?"
                     message={`"${deleting?.name}" ангиллыг устгана. Буцаах боломжгүй.`}
                     onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
