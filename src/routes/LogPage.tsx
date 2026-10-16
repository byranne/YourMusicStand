import { History } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { AccountButton } from '@/components/AccountButton';
import { AllTimeStats } from '@/components/AllTimeStats';
import { SessionCard } from '@/components/SessionCard';
import { SessionSheet } from '@/components/SessionSheet';
import { LoadError, Screen, Skeleton } from '@/components/ui';
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
          <div aria-label="Loading your sessions" className="flex flex-col gap-6">
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : sessions.isError ? (
          <LoadError
            message="Couldn't load your sessions."
            onRetry={() => sessions.refetch()}
            retrying={sessions.isFetching}
          />
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center text-muted">
            <History className="size-10 animate-bob text-brand" aria-hidden />
            <p>Every practice session you save is kept here.</p>
          </div>
        ) : (
          <>
            <AllTimeStats sessions={all} />
            {groupSessions(all, new Date()).map((group) => (
              <section key={group.label} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{group.label}</h2>
                {group.sessions.map((session, index) => (
                  <SessionCard
                    key={session.id}
                    index={index}
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
