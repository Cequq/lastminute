import { Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} aria-hidden="true" />;
}

export function PageLoader({ label = 'Ачаалж байна…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-mute" role="status">
      <Spinner className="h-7 w-7 text-brand" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// Карт ачаалах үеийн skeleton
export function CardSkeleton() {
  return (
    <div className="panel animate-pulse overflow-hidden">
      <div className="h-36 bg-line/60" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-line" />
        <div className="h-4 w-4/5 rounded bg-line" />
        <div className="h-2 w-full rounded bg-line/70" />
        <div className="h-6 w-1/2 rounded bg-line" />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-tint text-brand">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="panel flex flex-col items-center border-rose/30 px-6 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-tint text-rose">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">Мэдээлэл ачаалж чадсангүй</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-5">
          <RefreshCw className="h-4 w-4" /> Дахин оролдох
        </button>
      )}
    </div>
  );
}

const TONES = {
  amber: 'bg-amber-tint text-amber-ink',
  mint: 'bg-mint-tint text-mint',
  rose: 'bg-rose-tint text-rose',
  brand: 'bg-brand-tint text-brand',
  mute: 'bg-ink/5 text-ink-mute',
};

export function Badge({ tone = 'mute', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
