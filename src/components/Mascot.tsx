import type { MascotMood } from '@/lib/greeting';
import type { PracticeActivity } from '@/lib/practice';

const animations: Record<MascotMood, string> = {
  idle: '',
  happy: '',
  sleepy: '',
  celebrate: 'animate-hop',
};

const activityLabels: Record<PracticeActivity, string> = {
  guitar: 'playing guitar',
  lifting: 'lifting weights',
  singing: 'singing',
};

// How the desk moves for each activity; the lifter stands firm under the bar.
const activityMotion: Record<PracticeActivity, string> = {
  guitar: 'animate-groove',
  lifting: '',
  singing: 'animate-sway',
};

// Lets a part of the drawing move around its own center rather than the SVG's corner.
const part = '[transform-box:fill-box] origin-center';
// Rocks the desk from its base, so it sways on the pole instead of spinning.
const fromBase = '[transform-box:fill-box] origin-bottom';

function Note({ className = '' }: { className?: string }) {
  return (
    <g className={`${part} ${className}`}>
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
  );
}

// Pressed overhead from behind the desk. The arms shrink from the shoulders as the bar comes down.
function Barbell() {
  return (
    <>
      <g
        fill="none"
        className="stroke-brand [transform-box:fill-box] origin-bottom animate-press"
        strokeWidth="16"
        strokeLinecap="round"
      >
        <path d="M150 210L160 60" />
        <path d="M362 210L352 60" />
      </g>
      <g className="animate-press-bar">
        <path d="M96 60H416" className="stroke-text" strokeWidth="10" strokeLinecap="round" />
        <g className="fill-button">
          <rect x="100" y="24" width="20" height="72" rx="6" />
          <rect x="122" y="38" width="12" height="44" rx="4" />
          <rect x="392" y="24" width="20" height="72" rx="6" />
          <rect x="378" y="38" width="12" height="44" rx="4" />
        </g>
        <g className="fill-brand">
          <circle cx="160" cy="60" r="11" />
          <circle cx="352" cy="60" r="11" />
        </g>
      </g>
    </>
  );
}

// Held across the lip, neck up to the right: one hand on the neck, the other strumming.
function Guitar() {
  return (
    <>
      <g transform="rotate(-28 250 300)">
        <rect x="282" y="292" width="128" height="16" rx="4" className="fill-button" />
        <rect x="404" y="284" width="38" height="32" rx="8" className="fill-button" />
        {/* both bouts outlined first, then filled, so the outline traces their union */}
        <g className="stroke-button" strokeWidth="20" fill="none">
          <circle cx="190" cy="300" r="50" />
          <circle cx="252" cy="300" r="38" />
        </g>
        <g className="fill-surface">
          <circle cx="190" cy="300" r="50" />
          <circle cx="252" cy="300" r="38" />
        </g>
        <circle cx="238" cy="300" r="13" className="fill-button" />
        <rect x="168" y="286" width="10" height="28" rx="3" className="fill-button" />
        <path d="M173 300H404" className="stroke-muted" strokeWidth="3" />
      </g>
      <g className="fill-brand stroke-brand" strokeWidth="16" strokeLinecap="round">
        <path d="M376 262Q420 280 392 226" fill="none" />
        <circle cx="392" cy="226" r="10" strokeWidth="0" />
      </g>
      <g
        className="fill-brand stroke-brand [transform-box:fill-box] origin-top-left animate-strum"
        strokeWidth="16"
        strokeLinecap="round"
      >
        <path d="M136 250Q100 320 226 320" fill="none" />
        <circle cx="226" cy="320" r="10" strokeWidth="0" />
      </g>
    </>
  );
}

function Microphone() {
  return (
    <>
      <path d="M340 296L306 256" className="stroke-text" strokeWidth="12" strokeLinecap="round" />
      <circle cx="298" cy="246" r="17" className="fill-muted stroke-text" strokeWidth="5" />
      <g className="fill-brand stroke-brand" strokeWidth="16" strokeLinecap="round">
        <path d="M376 250Q414 300 340 296" fill="none" />
        <circle cx="340" cy="296" r="10" strokeWidth="0" />
      </g>
    </>
  );
}

function Face({
  mood,
  activity,
  still,
  talking,
}: {
  mood: MascotMood;
  activity?: PracticeActivity;
  still: boolean;
  talking: boolean;
}) {
  const loop = (animation: string) => (still ? '' : animation);

  if (activity === 'lifting') {
    // Squeezed shut with effort, teeth gritted.
    return (
      <g fill="none" className="stroke-face" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M202 192L224 202L202 212" />
        <path d="M310 192L288 202L310 212" />
        <path d="M238 234H274" />
      </g>
    );
  }
  if (activity === 'singing') {
    // Eyes closed in the moment, mouth opening and closing on the notes.
    return (
      <>
        <g fill="none" className="stroke-face" strokeWidth="9" strokeLinecap="round">
          <path d="M200 208Q214 190 228 208" />
          <path d="M284 208Q298 190 312 208" />
        </g>
        <ellipse cx="252" cy="240" rx="15" ry="20" className={`fill-face ${part} ${loop('animate-sing')}`} />
      </>
    );
  }

  const asleep = mood === 'sleepy';
  const grinning = activity === 'guitar' || mood === 'happy' || mood === 'celebrate';
  return (
    <>
      {asleep ? (
        <g fill="none" className="stroke-face" strokeWidth="9" strokeLinecap="round">
          <path d="M198 204Q214 216 230 204" />
          <path d="M282 204Q298 216 314 204" />
        </g>
      ) : (
        <g className={`fill-face ${part} ${loop('animate-blink')}`}>
          <circle cx="214" cy="202" r="14" />
          <circle cx="298" cy="202" r="14" />
        </g>
      )}
      <g className={`[transform-box:fill-box] origin-top ${talking ? 'animate-talk' : ''}`}>
        {grinning || talking ? (
          <path
            d="M232 222Q256 258 280 222Z"
            className="fill-face stroke-face"
            strokeWidth="8"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d={asleep ? 'M244 232Q256 238 268 232' : 'M238 226Q256 244 274 226'}
            fill="none"
            className="stroke-face"
            strokeWidth="9"
            strokeLinecap="round"
          />
        )}
      </g>
    </>
  );
}

// The icon's music-stand character (assets/icon.svg), drawn with theme tokens.
export function Mascot({
  mood,
  size = 96,
  decorative = false,
  still = false,
  talking = false,
  activity,
  paused = false,
}: {
  mood: MascotMood;
  size?: number;
  // For a logo mark that sits next to real text: hidden from screen readers.
  decorative?: boolean;
  // No idle bobbing, blinking or floating, for small marks that shouldn't draw the eye.
  still?: boolean;
  // Moves the mouth, while a line of dialogue is appearing.
  talking?: boolean;
  // What it's doing while a practice session runs. Widens the drawing to fit the props.
  activity?: PracticeActivity;
  // Freezes the activity mid-move, for a paused session.
  paused?: boolean;
}) {
  const asleep = mood === 'sleepy' && !activity;
  const loop = (animation: string) => (still ? '' : animation);
  // [x, y, width, height]: the props reach past the plain drawing's edges.
  const box = activity ? [80, 0, 370, 440] : [100, 40, 330, 400];
  const desk = activity ? activityMotion[activity] : asleep ? 'animate-doze' : 'animate-bob';
  const label = activity
    ? activityLabels[activity]
    : asleep
      ? 'sleeping'
      : mood === 'celebrate'
        ? 'celebrating'
        : 'smiling';

  return (
    <svg
      viewBox={box.join(' ')}
      width={size}
      height={(size * box[3]) / box[2]}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `MusicStand mascot, ${label}` })}
      className={`shrink-0 overflow-visible ${activity ? '' : animations[mood]} ${
        paused ? '[&_*]:[animation-play-state:paused]' : ''
      }`}
    >
      {/* pole + legs stay planted while the desk bobs on top */}
      <g fill="none" className="stroke-brand" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 300V372" />
        <path d="M256 372L196 420M256 372L316 420" />
      </g>
      {activity === 'lifting' ? <Barbell /> : null}
      <g className={`${activity ? fromBase : part} ${loop(desk)}`}>
        {/* desk + lip */}
        <rect x="132" y="122" width="248" height="176" rx="40" className="fill-brand" />
        <rect x="112" y="278" width="288" height="38" rx="19" className="fill-button" />
        <Face mood={mood} activity={activity} still={still} talking={talking} />
        <g className="fill-blush" opacity=".6">
          <ellipse cx="184" cy="230" rx="16" ry="10" />
          <ellipse cx="328" cy="230" rx="16" ry="10" />
        </g>
        {activity === 'guitar' ? <Guitar /> : null}
        {activity === 'singing' ? <Microphone /> : null}
      </g>
      {/* floating notes, or sleepy z's */}
      {asleep ? (
        <text x="392" y="96" className={`fill-muted ${part} ${loop('animate-snooze')}`} fontSize="64" fontWeight="700">
          z
        </text>
      ) : activity === 'lifting' ? null : (
        <>
          <Note className={loop('animate-note')} />
          {activity === 'singing' ? (
            <g transform="translate(-290 10)">
              <Note className={`${loop('animate-note')} [animation-delay:-1.2s]`} />
            </g>
          ) : null}
        </>
      )}
    </svg>
  );
}
