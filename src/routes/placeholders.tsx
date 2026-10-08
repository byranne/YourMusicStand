import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { ProfileButton } from '@/components/ProfileButton';
import { Screen } from '@/components/ui';

export function HomePage() {
  return <Screen title="Home" action={<ProfileButton />} />;
}

export function SongPage() {
  const { id } = useParams();

  return (
    <Screen>
      <Link to="/" className="mb-4 flex items-center gap-1 text-muted">
        <ChevronLeft className="size-5" aria-hidden />
        Home
      </Link>
      <p className="text-muted">Song {id}</p>
    </Screen>
  );
}
