import { lazy, Suspense, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/storage';
import { DISTRICTS } from '../../lib/format';
import { hhmm } from '../../lib/ub';
import { rules, validate } from '../../lib/validation';
import { PageHeader } from '../../components/manage/ManageUI';
import StatsDashboard from '../../components/manage/StatsDashboard';
import DealsManager from '../../components/manage/DealsManager';
import BookingsManager from '../../components/manage/BookingsManager';
import QuietHoursManager from '../../components/manage/QuietHoursManager';
import CheckIn from '../../components/manage/CheckIn';
import Field from '../../components/ui/Field';
import ImageUpload from '../../components/ImageUpload';
import { Spinner } from '../../components/ui/States';

const LocationPicker = lazy(() => import('../../components/LocationPicker'));

// PartnerLayout-оос сонгосон байгууллагыг авна
const useBusiness = () => useOutletContext();

export function PartnerDashboard() {
  const { business } = useBusiness();
  return (
    <>
      <PageHeader title="Самбар" text={`${business.name}: орлого, захиалга, ирсэн үйлчлүүлэгч`} />
      <StatsDashboard businessId={business.id} />
    </>
  );
}

export function PartnerDeals() {
  const { business } = useBusiness();
  return <DealsManager businessId={business.id} title="Хямдрал" />;
}

export function PartnerBookings() {
  const { business } = useBusiness();
  return <BookingsManager businessId={business.id} />;
}

export function PartnerSchedule() {
  const { business } = useBusiness();
  return (
    <>
      <PageHeader title="Эрэлт багатай цаг" text="Долоо хоног бүр давтагдах хямдралтай цагуудаа тохируулна. Хэрэглэгчид эдгээрийг газрын зураг, таны хуудсан дээр харна." />
      <QuietHoursManager business={business} />
    </>
  );
}

export function PartnerCheckIn() {
  return <CheckIn />;
}

export function PartnerProfile() {
  const { business, reload } = useBusiness();
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: business.name, description: business.description ?? '', district: business.district,
      address: business.address ?? '', phone: business.phone ?? '', opens_at: hhmm(business.opens_at),
      closes_at: hhmm(business.closes_at), lat: business.lat, lng: business.lng, cover_url: business.cover_url,
    });
    setFile(null);
  }, [business]);

  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const errs = validate(form, { name: [rules.length(2, 80, 'Нэр')], district: [rules.required('Дүүрэг')] });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      let cover_url = form.cover_url ?? null;
      if (file) cover_url = await uploadImage(file, 'businesses');
      // RLS: эзэн зөвхөн өөрийн байгууллагыг засна
      const { error } = await supabase.from('businesses').update({
        name: form.name.trim(), description: form.description.trim() || null, district: form.district,
        address: form.address.trim() || null, phone: form.phone.trim() || null,
        opens_at: form.opens_at, closes_at: form.closes_at, lat: form.lat, lng: form.lng, cover_url,
      }).eq('id', business.id);
      if (error) throw error;
      toast.success('Мэдээлэл хадгалагдлаа');
      await reload();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Байгууллагын мэдээлэл" text="Хэрэглэгчдэд харагдах нэр, хаяг, цагийн хуваарь, байршил" />
      <form onSubmit={save} noValidate className="panel grid gap-4 p-6 sm:grid-cols-2">
        <Field id="name" label="Нэр" value={form.name} onChange={set('name')} error={errors.name} />
        <Field id="phone" label="Утас" value={form.phone} onChange={set('phone')} />
        <Field id="description" as="textarea" label="Тайлбар" value={form.description} onChange={set('description')} className="sm:col-span-2" />
        <Field id="district" label="Дүүрэг" error={errors.district}>
          <select id="district" value={form.district} onChange={set('district')} className="input">
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field id="address" label="Хаяг" value={form.address} onChange={set('address')} />
        <Field id="opens_at" label="Нээх цаг" type="time" value={form.opens_at} onChange={set('opens_at')} />
        <Field id="closes_at" label="Хаах цаг" type="time" value={form.closes_at} onChange={set('closes_at')} hint="Шөнө дундаас хойш хаадаг бол жишээ нь 02:00" />
        <div className="sm:col-span-2">
          <span className="label">Байршил</span>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-line" />}>
            <LocationPicker value={{ lat: form.lat, lng: form.lng }} onChange={(p) => setForm({ ...form, ...p })} />
          </Suspense>
        </div>
        <div className="sm:col-span-2">
          <ImageUpload currentUrl={form.cover_url} file={file} onFileChange={setFile} error={errors.image}
                       onError={(m) => setErrors((x) => ({ ...x, image: m }))} />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Хадгалах</button>
        </div>
      </form>
    </>
  );
}
