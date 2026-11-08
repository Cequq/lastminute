import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Ticket, Building2, Tag, Receipt, Users, Inbox, ScanLine } from 'lucide-react';

export { PageHeader as AdminHeader, Table } from '../../components/manage/ManageUI';

const LINKS = [
  ['/admin', 'Самбар', LayoutDashboard, true],
  ['/admin/requests', 'Хамтрагчийн хүсэлт', Inbox],
  ['/admin/deals', 'Хямдрал', Ticket],
  ['/admin/businesses', 'Байгууллага', Building2],
  ['/admin/categories', 'Ангилал', Tag],
  ['/admin/bookings', 'Захиалга, төлбөр', Receipt],
  ['/admin/check-in', 'Тасалбар шалгах', ScanLine],
  ['/admin/users', 'Хэрэглэгч', Users],
];

export function SideNav({ links, dark = false }) {
  return (
    <nav className={`flex gap-1 overflow-x-auto rounded-2xl p-2 shadow-card [scrollbar-width:none] lg:sticky lg:top-24 lg:flex-col ${dark ? 'bg-ink' : 'bg-surface'}`}>
      {links.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end}
                 className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                   isActive
                     ? (dark ? 'bg-surface text-ink' : 'bg-ink text-paper')
                     : (dark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-ink-soft hover:bg-paper hover:text-ink')}`}>
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[230px_1fr] lg:py-8">
      <aside><SideNav links={LINKS} /></aside>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
