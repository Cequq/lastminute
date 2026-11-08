import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { friendlyDate } from '../lib/format';

// Мэдэгдлийн хонх. Шинэ мэдэгдлийг Supabase Realtime-ээр шууд хүлээн авна.
export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setItems(data ?? []));

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new, ...prev].slice(0, 20)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Гадна талд дарахад хаах
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  };

  const markOne = (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    supabase.from('notifications').update({ is_read: true }).eq('id', id).then(() => {});
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label={`Мэдэгдэл${unread ? `, ${unread} шинэ` : ''}`} aria-expanded={open}
              className="btn-ghost relative p-2.5">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ember px-1 text-[10px] font-extrabold text-white ring-2 ring-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">Мэдэгдэл</p>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-bold text-brand">
                <CheckCheck className="h-4 w-4" /> Бүгдийг уншсан
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-ink-mute">Мэдэгдэл алга. Захиалга баталгаажихад энд гарна.</li>
            ) : items.map((n) => (
              <li key={n.id}>
                <Link to={n.link || '#'} onClick={() => markOne(n.id)}
                      className={`flex gap-3 border-b border-line/60 px-4 py-3 hover:bg-paper ${n.is_read ? '' : 'bg-brand-tint/40'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-ember'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-ink-soft">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-ink-mute">{friendlyDate(n.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
