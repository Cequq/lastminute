import { Logo } from '../../components/Brand';
import Skyline from '../../components/Skyline';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden grain bg-night-sky p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full" />
        <Logo light />
        <div className="relative mb-44">
          <p className="font-display text-5xl font-bold leading-tight">Нэг боломж.<br />Хоёр хожил.</p>
          <p className="mt-4 max-w-sm text-white/60">Хаахын өмнөх цаг, эрэлт багатай үе, цуцлагдсан суудал нэг дор.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
