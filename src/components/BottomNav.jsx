import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Map, Ticket, User, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Гар утасны доод навигаци. Хямдралын дэлгэрэнгүй, төлбөрийн хуудсанд өөрийн доод самбартай тул нуугдана.
export const HIDE_BOTTOM_NAV = [/^\/deals\/[^/]+$/, /^\/checkout\//];

export function useBottomNavVisible() {
  const { pathname } = useLocation();
  return !HIDE_BOTTOM_NAV.some((re) => re.test(pathname));
}

export default function BottomNav() {
  const { user } = useAuth();
  const visible = useBottomNavVisible();
  if (!visible) return null;

  const items = [
    ['/', 'Нүүр', Home, true],
    ['/deals', 'Хямдрал', Search],
    ['/map', 'Газрын зураг', Map],
    ['/account/bookings', 'Захиалга', Ticket],
    user ? ['/account/profile', 'Профайл', User] : ['/login', 'Нэвтрэх', LogIn],
  ];

  return (
    <nav aria-label="Үндсэн цэс"
         className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(([to, label, Icon, end]) => (
          <li key={to}>
            <NavLink to={to} end={end}
                     className={({ isActive }) => `group flex flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[10.5px] font-bold transition-colors ${isActive ? 'text-brand' : 'text-ink-mute hover:text-ink'}`}>
              {({ isActive }) => (
                <>
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${isActive ? 'bg-brand-tint' : ''}`}>
                    <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
