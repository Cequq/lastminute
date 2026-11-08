import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { rules, authErrorMessage } from '../../lib/validation';
import Field from '../../components/ui/Field';
import { Spinner } from '../../components/ui/States';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const err = rules.email(email);
    setError(err);
    if (err) return;
    setBusy(true);
    const { error: apiErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (apiErr) { toast.error(authErrorMessage(apiErr)); return; }
    setSent(true);
  };

  return (
    <AuthShell title="Нууц үг сэргээх" subtitle="Бүртгэлтэй имэйлээ оруулбал нууц үг шинэчлэх холбоос илгээнэ."
               footer={<Link to="/login" className="font-bold text-brand">Нэвтрэх хуудас руу буцах</Link>}>
      {sent ? (
        <div className="panel p-6 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-mint" />
          <p className="mt-4 text-sm text-ink-soft"><b className="text-ink">{email}</b> хаяг руу холбоос илгээлээ. Spam хавтсаа ч шалгаарай.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field id="email" label="Имэйл" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <button className="btn-primary h-12 w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Холбоос илгээх</button>
        </form>
      )}
    </AuthShell>
  );
}
