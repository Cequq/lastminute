import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { rules, validate, authErrorMessage } from '../../lib/validation';
import Field from '../../components/ui/Field';
import { PageLoader, Spinner } from '../../components/ui/States';
import AuthShell from './AuthShell';

// Имэйлийн холбоосоор ирэхэд Supabase түр session үүсгэдэг (PASSWORD_RECOVERY)
export default function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;

  if (!user) {
    return (
      <AuthShell title="Холбоос хүчингүй байна" subtitle="Холбоосын хугацаа дууссан эсвэл аль хэдийн ашиглагдсан байна.">
        <Link to="/forgot-password" className="btn-primary w-full">Шинэ холбоос авах</Link>
      </AuthShell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, {
      password: [rules.password],
      confirm: [(v, all) => (v === all.password ? null : 'Нууц үг таарахгүй байна')],
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setBusy(false);
    if (error) { toast.error(authErrorMessage(error)); return; }
    toast.success('Нууц үг шинэчлэгдлээ');
    navigate('/', { replace: true });
  };

  return (
    <AuthShell title="Шинэ нууц үг" subtitle={user.email}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="password" label="Шинэ нууц үг" type="password" autoComplete="new-password" value={form.password}
               onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <Field id="confirm" label="Давтах" type="password" autoComplete="new-password" value={form.confirm}
               onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
        <button className="btn-primary h-12 w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Нууц үг хадгалах</button>
      </form>
    </AuthShell>
  );
}
