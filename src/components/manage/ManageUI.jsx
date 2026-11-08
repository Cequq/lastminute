// Админ болон хамтрагчийн самбарт хуваалцан ашиглах элементүүд
export function PageHeader({ title, text, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {text && <p className="mt-1 text-sm text-ink-soft">{text}</p>}
      </div>
      {action}
    </div>
  );
}

// Хүснэгтийн бүрхүүл (гар утсанд хөндлөн гүйлгэнэ)
export function Table({ head, children }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-paper/60 text-xs font-bold text-ink-soft">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
