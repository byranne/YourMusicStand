import { Button } from './Button';

type LoadErrorProps = {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
};

// Shown in place of a page's content when its data couldn't be loaded, so a
// failed request never looks like an empty account.
export function LoadError({ message, onRetry, retrying = false }: LoadErrorProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 pt-16 text-center">
      <p className="text-muted">{message}</p>
      <Button label="Try again" onClick={onRetry} loading={retrying} />
    </div>
  );
}
