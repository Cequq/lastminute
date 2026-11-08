import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, Handshake, TrendingUp, ScanLine, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DISTRICTS, fullDate } from '../../lib/format';
import { rules, validate } from '../../lib/validation';
import Field from '../../components/ui/Field';
import { PageLoader, Spinner } from '../../components/ui/States';

const BENEFITS = [
  [CalendarClock, 'Эрэлт багатай цагаа тохируул', 'Долоо хоногийн хуваарь тавихад хямдрал автоматаар харагдана.'],
  [TrendingUp, 'Хоосон суудал орлого болно', 'Үнэ нь цаг ойртох тусам буурч, сүүлийн суудал хүртэл зарагдана.'],
  [ScanLine, 'Тасалбар шалгах, тайлан', 'Кодоор үйлчлүүлэгчийг шалгаж, орлогоо график дээр харна.'],
];

export default function PartnerApply() {
  const { user, profile, isBusiness, isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState(null);
  const [form, setForm] = useState({ business_name: '', category_id: '', district: 'Сүхбаатар', address: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [c, r] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order'),
      user ? supabase.from('partner_requests').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    setCategories(c.data ?? []);
    setRequests(r.data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  useEffect(() => { if (profile?.phone) setForm((f) => ({ ...f, phone: f.phone || profile.phone })); }, [profile]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, {
      business_name: [rules.length(2, 80, 'Нэр')],
      category_id: [rules.required('Ангилал')],
      district: [rules.required('Дүүрэг')],
      phone: [rules.required('Утас'), rules.phone],
      message: [(v) => (String(v).length <= 500 ? null : '500 тэмдэгтээс ихгүй')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await supabase.from('partner_requests').insert({
      user_id: user.id, business_name: form.business_name.trim(), category_id: +form.category_id, district: form.district,
      address: form.address.trim() || null, phone: form.phone.replace(/[\s-]/g, ''), message: form.message.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.code === '23505' ? 'Таны өмнөх хүсэлт шийдвэрлэгдэж байна' : error.message); return; }
    toast.success('Хүсэлт илгээгдлээ. Шийдвэрлэгдмэгц мэдэгдэл ирнэ.');
    load();
  };

  if (requests === null) return <PageLoader />;
  const pending = requests.find((r) => r.status === 'pending');

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <Handshake className="h-10 w-10 text-ember" />
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Танай байгууллагад эрэлт багатай үе бий юу?</h1>
        <p className="mt-4 max-w-md text-ink-soft">
          Нэг боломж. Хоёр хожил: таны сул цаг орлого болж, үйлчлүүлэгч хямд авна. Кино театр, ресторан, салон, фитнес гэх мэт цагаар үйлчилдэг бүх байгууллага нэгдэх боломжтой. Бүртгэл үнэгүй.
        </p>
        <ul className="mt-8 space-y-5">
          {BENEFITS.map(([I, t, d]) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand"><I className="h-5 w-5" /></span>
              <span><b className="block">{t}</b><span className="text-sm text-ink-soft">{d}</span></span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {(isBusiness || isAdmin) && (
          <div className="panel mb-4 flex items-center justify-between gap-3 p-5">
            <p className="text-sm font-bold">Та аль хэдийн хамтрагч эрхтэй байна.</p>
            <Link to="/partner" className="btn-primary">Хамтрагчийн самбар</Link>
          </div>
        )}

        {requests.length > 0 && (
          <ul className="mb-4 space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="panel flex items-start gap-3 p-4 text-sm">
                {r.status === 'pending' ? <Clock className="h-5 w-5 shrink-0 text-amber" />
                  : r.status === 'approved' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-mint" /> : <XCircle className="h-5 w-5 shrink-0 text-rose" />}
                <span className="min-w-0">
                  <b>{r.business_name}</b>
                  <span className="block text-ink-soft">
                    {r.status === 'pending' ? 'Шалгагдаж байна' : r.status === 'approved' ? 'Зөвшөөрөгдсөн' : `Татгалзсан${r.admin_note ? `: ${r.admin_note}` : ''}`}
                    , {fullDate(r.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {!user ? (
          <div className="panel p-6 text-center">
            <p className="text-ink-soft">Хүсэлт илгээхийн тулд эхлээд бүртгүүлнэ үү.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/login" state={{ from: '/partner/apply' }} className="btn-outline">Нэвтрэх</Link>
              <Link to="/register" state={{ from: '/partner/apply' }} className="btn-primary">Бүртгүүлэх</Link>
            </div>
          </div>
        ) : !pending && !isBusiness && (
          <form onSubmit={submit} noValidate className="panel grid gap-4 p-6 sm:grid-cols-2">
            <h2 className="font-sans text-lg font-extrabold sm:col-span-2">Байгууллагын мэдээлэл</h2>
            <Field id="business_name" label="Байгууллагын нэр" value={form.business_name} onChange={set('business_name')} error={errors.business_name} className="sm:col-span-2" />
            <Field id="category_id" label="Ангилал" error={errors.category_id}>
              <select id="category_id" value={form.category_id} onChange={set('category_id')} className={`input ${errors.category_id ? 'input-error' : ''}`}>
                <option value="">Сонгох</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="district" label="Дүүрэг">
              <select id="district" value={form.district} onChange={set('district')} className="input">
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field id="address" label="Хаяг" value={form.address} onChange={set('address')} className="sm:col-span-2" />
            <Field id="phone" label="Утас" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <div className="hidden sm:block" />
            <Field id="message" as="textarea" label="Эрэлт багатай цагууд тань хэзээ вэ?" value={form.message} onChange={set('message')}
                   error={errors.message} hint="Заавал биш. Жишээ нь: ажлын өдөр 14-17 цаг хоосон байдаг." className="sm:col-span-2" />
            <button className="btn-primary h-12 sm:col-span-2" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Хүсэлт илгээх</button>
          </form>
        )}
      </div>
    </div>
  );
}
