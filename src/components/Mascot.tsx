import type { MascotMood } from '@/lib/greeting';

const animations: Record<MascotMood, string> = {
  idle: '',
  happy: '',
  sleepy: '',
  celebrate: 'animate-hop',
};

// Lets a part of the drawing move around its own center rather than the SVG's corner.
const part = '[transform-box:fill-box] origin-center';

// The icon's music-stand character (assets/icon.svg), drawn with theme tokens.
export function Mascot({
  mood,
  size = 96,
  decorative = false,
  still = false,
  talking = false,
}: {
  mood: MascotMood;
  size?: number;
  // For a logo mark that sits next to real text: hidden from screen readers.
  decorative?: boolean;
  // No idle bobbing, blinking or floating, for small marks that shouldn't draw the eye.
  still?: boolean;
  // Moves the mouth, while a line of dialogue is appearing.
  talking?: boolean;
}) {
  const asleep = mood === 'sleepy';
  const grinning = mood === 'happy' || mood === 'celebrate';
  const loop = (animation: string) => (still ? '' : animation);

  return (
    <svg
      viewBox="100 40 330 400"
      width={size}
      height={(size * 400) / 330}
      {...(decorative
        ? { 'aria-hidden': true }
        : {
            role: 'img',
            'aria-label': `MusicStand mascot, ${asleep ? 'sleeping' : mood === 'celebrate' ? 'celebrating' : 'smiling'}`,
          })}
      className={`shrink-0 overflow-visible ${animations[mood]}`}
    >
      {/* pole + legs stay planted while the desk bobs on top */}
      <g fill="none" className="stroke-brand" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 300V372" />
        <path d="M256 372L196 420M256 372L316 420" />
      </g>
      <g className={`${part} ${loop(asleep ? 'animate-doze' : 'animate-bob')}`}>
        {/* desk + lip */}
        <rect x="132" y="122" width="248" height="176" rx="40" className="fill-brand" />
        <rect x="112" y="278" width="288" height="38" rx="19" className="fill-button" />
        {/* face */}
        {asleep ? (
          <g fill="none" className="stroke-on-button" strokeWidth="9" strokeLinecap="round">
            <path d="M198 204Q214 216 230 204" />
            <path d="M282 204Q298 216 314 204" />
          </g>
        ) : (
          <g className={`fill-on-button ${part} ${loop('animate-blink')}`}>
            <circle cx="214" cy="202" r="14" />
            <circle cx="298" cy="202" r="14" />
          </g>
        )}
        <g className={`[transform-box:fill-box] origin-top ${talking ? 'animate-talk' : ''}`}>
          {grinning || talking ? (
            <path
              d="M232 222Q256 258 280 222Z"
              className="fill-on-button stroke-on-button"
              strokeWidth="8"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d={asleep ? 'M244 232Q256 238 268 232' : 'M238 226Q256 244 274 226'}
              fill="none"
              className="stroke-on-button"
              strokeWidth="9"
              strokeLinecap="round"
            />
          )}
        </g>
        <g className="fill-blush" opacity=".6">
          <ellipse cx="184" cy="230" rx="16" ry="10" />
          <ellipse cx="328" cy="230" rx="16" ry="10" />
        </g>
      </g>
      {/* floating note, or sleepy z's */}
      {asleep ? (
        <text x="392" y="96" className={`fill-muted ${part} ${loop('animate-snooze')}`} fontSize="64" fontWeight="700">
          z
        </text>
      ) : (
        <g className={`${part} ${loop('animate-note')}`}>
          <g transform="rotate(10 410 90)">
            <ellipse cx="398" cy="112" rx="19" ry="14.5" transform="rotate(-20 398 112)" className="fill-brand" />
            <path
              d="M410 108V54q6 20 26 28"
              fill="none"
              className="stroke-brand"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
