import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { rules, validate, authErrorMessage } from '../../lib/validation';
import Field from '../../components/ui/Field';
import { Spinner } from '../../components/ui/States';
import AuthShell from './AuthShell';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, {
      full_name: [rules.length(2, 60, 'Нэр')],
      phone: [rules.phone],
      email: [rules.email],
      password: [rules.password],
      confirm: [(v, all) => (v === all.password ? null : 'Нууц үг таарахгүй байна')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    // full_name, phone нь raw_user_meta_data-д орж, handle_new_user trigger профайлд хуулна
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.full_name.trim(), phone: form.phone.replace(/[\s-]/g, '') },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setBusy(false);
    if (error) { toast.error(authErrorMessage(error)); return; }

    if (data.session) {
      toast.success('Бүртгэл амжилттай үүслээ!');
      navigate(location.state?.from ?? '/', { replace: true });
    } else {
      setSentTo(form.email.trim()); // имэйл баталгаажуулалт асаалттай үед
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Имэйлээ шалгана уу">
        <div className="panel p-6 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-mint" />
          <p className="mt-4 text-sm text-ink-soft"><b className="text-ink">{sentTo}</b> хаяг руу баталгаажуулах холбоос илгээлээ. Холбоос дээр дарсны дараа нэвтэрнэ үү.</p>
          <Link to="/login" className="btn-primary mt-6 w-full">Нэвтрэх хуудас руу</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Бүртгүүлэх" subtitle="Нэг минутад бүртгүүлээд хямдралтай цагаа захиал."
               footer={<>Бүртгэлтэй юу? <Link to="/login" state={location.state} className="font-bold text-brand">Нэвтрэх</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="full_name" label="Нэр" autoComplete="name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
        <Field id="phone" label="Утас" type="tel" inputMode="numeric" autoComplete="tel" placeholder="9911xxxx" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Заавал биш" />
        <Field id="email" label="Имэйл" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="password" label="Нууц үг" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="8-аас дээш тэмдэгт" />
        <Field id="confirm" label="Нууц үг давтах" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <button className="btn-primary h-12 w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Бүртгүүлэх</button>
      </form>
    </AuthShell>
  );
}
