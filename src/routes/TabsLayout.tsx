import { House, ListMusic, NotebookPen, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/log', label: 'Log', icon: NotebookPen },
  { to: '/list', label: 'My List', icon: ListMusic },
];

export function TabsLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-[calc(5rem+max(0.75rem,env(safe-area-inset-bottom)))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto max-w-md rounded-3xl border border-border bg-surface shadow-lg">
        <ul className="flex h-16">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'group flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium',
                    isActive ? 'text-on-brand-soft' : 'text-muted',
                  ].join(' ')
                }
              >
                <span className="rounded-full px-4 py-1 group-aria-[current=page]:bg-brand-soft">
                  <Icon className="size-6" aria-hidden />
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
