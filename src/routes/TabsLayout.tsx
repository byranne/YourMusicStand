import { House, ListMusic, NotebookPen, Plus, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { SessionBar } from '@/components/SessionBar';
import { SessionWatcher } from '@/components/SessionWatcher';
import { useActiveSession } from '@/lib/activeSession';

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/log', label: 'My Log', icon: NotebookPen },
  { to: '/list', label: 'My List', icon: ListMusic },
  { to: '/add', label: 'Add', icon: Plus },
];

export function TabsLayout() {
  const { session } = useActiveSession();
  const { pathname } = useLocation();
  // Home shows the timer itself; the other tabs get a bar that leads back to it.
  const showSessionBar = session !== null && pathname !== '/';

  return (
    <div className="flex min-h-dvh flex-col">
      <main
        className={
          showSessionBar
            ? 'flex-1 pb-[calc(8.5rem+max(0.75rem,env(safe-area-inset-bottom)))]'
            : 'flex-1 pb-[calc(5rem+max(0.75rem,env(safe-area-inset-bottom)))]'
        }
      >
        <Outlet />
      </main>
      <SessionWatcher />
      {showSessionBar ? <SessionBar session={session} /> : null}
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
