import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { rules, validate, authErrorMessage } from '../../lib/validation';
import Field from '../../components/ui/Field';
import { Spinner } from '../../components/ui/States';
import AuthShell from './AuthShell';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, { email: [rules.email], password: [rules.required('Нууц үг')] });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (error) { toast.error(authErrorMessage(error)); return; }
    toast.success('Тавтай морил!');
    navigate(from, { replace: true });
  };

  return (
    <AuthShell title="Нэвтрэх" subtitle="Захиалга, дуртай хямдралаа харахын тулд нэвтэрнэ үү."
               footer={<>Бүртгэлгүй юу? <Link to="/register" state={location.state} className="font-bold text-brand">Бүртгүүлэх</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="email" label="Имэйл" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="password" label="Нууц үг" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand">Нууц үгээ мартсан?</Link>
        </div>
        <button className="btn-primary h-12 w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Нэвтрэх</button>
      </form>
    </AuthShell>
  );
}
