// Delays that keep the bars out of step, like a level meter.
const bars = ['0s', '-0.45s', '-0.2s', '-0.65s'];

// Bouncing level bars while a session runs; they freeze in place when it's paused.
// Takes its color from the text color, so it works on a surface or on a button fill.
export function Equalizer({ paused, className = 'h-4 gap-0.5' }: { paused: boolean; className?: string }) {
  return (
    <span aria-hidden className={`flex items-end ${className}`}>
      {bars.map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className={`h-full w-1 origin-bottom animate-eq rounded-full bg-current ${
            paused ? '[animation-play-state:paused] opacity-60' : ''
          }`}
        />
      ))}
    </span>
  );
}
