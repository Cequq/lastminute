import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Ticket, Handshake, Shield, LogOut, ChevronRight } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { rules, validate } from '../../lib/validation';
import Field from '../../components/ui/Field';
import { Badge, Spinner } from '../../components/ui/States';

export default function Profile() {
  const { user, profile, isAdmin, isBusiness, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '' });
  }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    const errs = validate(form, { full_name: [rules.length(2, 60, 'Нэр')], phone: [rules.phone] });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    // RLS "profiles: own update" — зөвхөн өөрийн мөрийг засна. role-ийг trigger хамгаална.
    const { error } = await supabase.from('profiles')
      .update({ full_name: form.full_name.trim(), phone: form.phone.replace(/[\s-]/g, '') || null })
      .eq('id', user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success('Профайл хадгалагдлаа');
  };

  return (
    <div className="container-page max-w-xl py-8">
      <h1 className="text-3xl font-bold">Профайл</h1>
      <div className="panel mt-6 p-6">
        <div className="mb-6 flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand font-display text-xl font-bold text-white">
            {(profile?.full_name || user.email)[0].toUpperCase()}
          </span>
          <div>
            <p className="font-bold">{user.email}</p>
            <Badge tone={isAdmin ? 'brand' : isBusiness ? 'amber' : 'mute'}>{isAdmin ? 'Администратор' : isBusiness ? 'Хамтрагч байгууллага' : 'Хэрэглэгч'}</Badge>
          </div>
        </div>
        <form onSubmit={save} noValidate className="space-y-4">
          <Field id="full_name" label="Нэр" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={errors.full_name} />
          <Field id="phone" label="Утас" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link to="/reset-password" className="text-sm font-semibold text-brand">Нууц үг солих</Link>
            <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Хадгалах</button>
          </div>
        </form>
      </div>
      {/* Хурдан холбоос (гар утсанд доод цэсний "Профайл"-аас орно) */}
      <nav className="panel mt-4 divide-y divide-line overflow-hidden">
        {[
          ['/account/bookings', 'Миний захиалга', Ticket, true],
          ['/account/favorites', 'Дуртай', Heart, true],
          ['/partner', 'Хамтрагчийн самбар', Handshake, isBusiness || isAdmin],
          ['/admin', 'Админ самбар', Shield, isAdmin],
        ].filter((x) => x[3]).map(([to, label, I]) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-paper">
            <I className="h-5 w-5 text-brand" /> <span className="flex-1">{label}</span> <ChevronRight className="h-4 w-4 text-ink-mute" />
          </Link>
        ))}
        <div className="flex items-center gap-3 px-5 py-2 text-sm font-bold">
          <span className="flex-1 text-ink-soft">Харагдах горим</span> <ThemeToggle />
        </div>
        <button onClick={async () => { await signOut(); toast.success('Системээс гарлаа'); navigate('/'); }}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm font-bold text-rose hover:bg-paper">
          <LogOut className="h-5 w-5" /> Гарах
        </button>
      </nav>

      {!isBusiness && !isAdmin && (
        <Link to="/partner/apply" className="panel mt-4 flex items-center justify-between gap-3 p-5 hover:shadow-lift">
          <span><b className="block">Байгууллагатай юу?</b><span className="text-sm text-ink-soft">Эрэлт багатай цагаа LastMinute дээр хямдруулж зараарай.</span></span>
          <span className="btn-sunset shrink-0">Хамтрагч болох</span>
        </Link>
      )}
    </div>
  );
}
