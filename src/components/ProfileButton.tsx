import { User } from 'lucide-react';
import { Link } from 'react-router';

export function ProfileButton() {
  return (
    <Link
      to="/profile"
      aria-label="Profile"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted"
    >
      <User className="size-5" aria-hidden />
    </Link>
  );
}
