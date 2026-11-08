import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Handshake, Shield, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Brand';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import Skyline from './Skyline';
import BottomNav, { useBottomNavVisible } from './BottomNav';

// Демо өгөгдөл ашиглаж буйг хэрэглэгчид ил тод мэдэгдэнэ. Бодит хамтрагчтай болоход .env-д false болгоно.
const SHOW_DEMO_NOTICE = import.meta.env.VITE_DEMO_NOTICE !== 'false';

const navClass = ({ isActive }) =>
  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${isActive ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'}`;

function Navbar() {
  const { user, profile, isAdmin, isBusiness, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = async () => {
    await signOut();
    close();
    toast.success('Системээс гарлаа');
    navigate('/');
  };

  const links = (
    <>
      <NavLink to="/deals" className={navClass} onClick={close}>Хямдрал</NavLink>
      <NavLink to="/map" className={navClass} onClick={close}>Газрын зураг</NavLink>
      {user && <NavLink to="/account/bookings" className={navClass} onClick={close}>Миний захиалга</NavLink>}
      {user && <NavLink to="/account/favorites" className={navClass} onClick={close}>Дуртай</NavLink>}
    </>
  );

  const staffLinks = (
    <>
      {(isBusiness || isAdmin) && (
        <NavLink to="/partner" onClick={close}
                 className={({ isActive }) => `btn py-2 ${isActive ? 'bg-dusk text-white' : 'bg-brand-tint text-brand hover:bg-brand/15'}`}>
          <Handshake className="h-4 w-4" /> Хамтрагч
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin" onClick={close}
                 className={({ isActive }) => `btn py-2 ${isActive ? 'bg-ink text-paper' : 'bg-ink/5 text-ink hover:bg-ink/10'}`}>
          <Shield className="h-4 w-4" /> Админ
        </NavLink>
      )}
    </>
  );

  return (
    <header className={`sticky top-0 z-40 transition-[background-color,box-shadow,border-color] ${
      scrolled || open ? 'border-b border-line/70 bg-paper/80 shadow-[0_8px_24px_-20px_rgb(0_0_0/0.4)] backdrop-blur-xl' : 'border-b border-transparent bg-paper'}`}>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full bg-ink/[0.04] p-1 lg:flex">{links}</nav>

        <div className="flex items-center gap-1">
          <div className="mr-1 hidden items-center gap-1.5 lg:flex">{staffLinks}</div>
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <Link to="/account/profile" className="ml-1 hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-ink/5 lg:flex" title="Профайл">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-ember to-amber text-xs font-extrabold text-midnight">
                  {(profile?.full_name || user.email)?.[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate text-sm font-semibold xl:block">{profile?.full_name || user.email}</span>
              </Link>
              <button onClick={logout} className="btn-ghost hidden p-2.5 lg:inline-flex" aria-label="Гарах" title="Гарах">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="ml-1 hidden items-center gap-1.5 lg:flex">
              <Link to="/login" className="btn-ghost">Нэвтрэх</Link>
              <Link to="/register" className="btn-dark">Бүртгүүлэх</Link>
            </div>
          )}
          <button className="btn-ghost p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Цэс" aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-3 [&>a]:rounded-xl [&>a]:py-2.5">
            {links}
            {(isBusiness || isAdmin) && <div className="mt-2 grid grid-cols-2 gap-2">{staffLinks}</div>}
            <div className="my-2 h-px bg-line" />
            {user ? (
              <>
                <Link to="/account/profile" className="btn-ghost justify-start" onClick={close}><User className="h-4 w-4" /> Профайл</Link>
                <button onClick={logout} className="btn-ghost justify-start text-rose"><LogOut className="h-4 w-4" /> Гарах</button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-outline" onClick={close}>Нэвтрэх</Link>
                <Link to="/register" className="btn-dark" onClick={close}>Бүртгүүлэх</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative mt-36 bg-midnight text-white/65">
      <Skyline className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full -translate-y-[calc(100%-1px)]" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-5 font-display text-2xl font-bold text-white">Нэг боломж. Хоёр хожил.</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Хаах дөхсөн цаг, эрэлт багатай үе, цуцлагдсан суудал. Байгууллага сул цагаа борлуулж, та мөнгөө хэмнэнэ.
          </p>
          <Link to="/partner/apply" className="btn-sunset mt-6">Хамтрагч байгууллага болох</Link>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold text-white">Хямдрал</p>
          <ul className="space-y-2">
            <li><Link to="/deals?type=closing" className="hover:text-white">Хаах дөхсөн</Link></li>
            <li><Link to="/deals?type=off_peak" className="hover:text-white">Эрэлт багатай цаг</Link></li>
            <li><Link to="/deals?type=last_minute" className="hover:text-white">Сүүлчийн минут</Link></li>
            <li><Link to="/map" className="hover:text-white">Газрын зураг</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold text-white">Холбоо барих</p>
          <p>Улаанбаатар хот</p>
          <p className="mt-1">hello@lastminute.mn</p>
          <p className="mt-6 text-xs text-white/40">SWE334 бие даалтын төсөл. Төлбөр QPay sandbox орчинд ажилладаг.</p>
        </div>
      </div>
    </footer>
  );
}

function DemoNotice() {
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('lm.demo') === '1'; } catch { return false; } });
  if (!SHOW_DEMO_NOTICE || hidden) return null;
  const hide = () => { setHidden(true); try { sessionStorage.setItem('lm.demo', '1'); } catch { /* хадгалах боломжгүй */ } };
  return (
    <div className="bg-amber text-midnight">
      <div className="container-page flex items-center gap-2 py-1.5 text-xs font-bold">
        <Info className="h-4 w-4 shrink-0" />
        <span className="flex-1">Туршилтын хувилбар: байгууллагууд бодит боловч хямдрал, үнэ нь жишээ бөгөөд тэд LastMinute-тэй хамтран ажиллаагүй.</span>
        <button onClick={hide} className="rounded p-0.5 hover:bg-black/10" aria-label="Хаах"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const bottomNav = useBottomNavVisible();
  return (
    <div className={`flex min-h-screen flex-col ${bottomNav ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}>
      {pathname === '/' && <DemoNotice />}
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <BottomNav />
    </div>
  );
}
