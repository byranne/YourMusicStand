import { History } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { AccountButton } from '@/components/AccountButton';
import { AllTimeStats } from '@/components/AllTimeStats';
import { SessionCard } from '@/components/SessionCard';
import { SessionSheet } from '@/components/SessionSheet';
import { Screen } from '@/components/ui';
import { useSessions } from '@/lib/queries';
import { groupSessions } from '@/lib/stats';

// The My Log tab: the all-time stats, then every saved practice session, newest first.
export function LogPage() {
  const [params, setParams] = useSearchParams();
  const sessions = useSessions();
  const all = sessions.data ?? [];
  // The session whose details are open, from the URL so Home can link straight to one.
  const openId = params.get('session');

  return (
    <Screen title="My Log" action={<AccountButton />}>
      <div className="flex flex-col gap-6 pb-6">
        {sessions.isPending ? (
          <p className="pt-16 text-center text-muted">Loading your sessions…</p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center text-muted">
            <History className="size-10 text-brand" aria-hidden />
            <p>Every practice session you save is kept here.</p>
          </div>
        ) : (
          <>
            <AllTimeStats sessions={all} />
            {groupSessions(all, new Date()).map((group) => (
              <section key={group.label} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{group.label}</h2>
                {group.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => setParams({ session: session.id }, { replace: true })}
                  />
                ))}
              </section>
            ))}
          </>
        )}

        <SessionSheet
          session={all.find((session) => session.id === openId) ?? null}
          onClose={() => setParams({}, { replace: true })}
        />
      </div>
    </Screen>
  );
}
