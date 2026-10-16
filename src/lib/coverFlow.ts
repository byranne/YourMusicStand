// Geometry for the cover arc: the front cover big and flat in the middle,
// neighbours smaller, slightly turned in and fading toward the sides, like
// ". \ | / .". `rotation` counts covers turned (fractional while dragging,
// unbounded both ways so it loops), and cover i is in front when rotation is
// i (mod count).

export type CoverPose = { x: number; y: number; rotateY: number; scale: number; opacity: number; zIndex: number };

const NEAR = 126; // px from the middle to the first cover on each side
const FAR = 62; // px further for each cover after that
const TILT = 16; // degrees, reached one cover out
const SHRINK = 0.17; // per cover out, up to two
const DROP = 6; // px lower per cover out, up to two

// Covers this far out or more are fully faded, so they needn't be drawn.
export const VISIBLE_SPAN = 2.75;

// `offset` is how many covers from the front: negative to the left.
export function arcPose(offset: number): CoverPose {
  const distance = Math.abs(offset);
  const side = Math.sign(offset);
  const near = Math.min(distance, 1);
  const out = Math.min(distance, 2);
  return {
    x: side * (near * NEAR + Math.max(distance - 1, 0) * FAR),
    y: out * DROP,
    // The left side turns to face right and vice versa, just a little.
    rotateY: -side * near * TILT || 0,
    scale: 1 - out * SHRINK,
    opacity: Math.max(0, Math.min(1, 1 - (distance - 1) / (VISIBLE_SPAN - 1))),
    zIndex: 100 - Math.round(distance * 10),
  };
}

// The arc shows up to this many covers at once (front, two each side).
export const ARC_COVERS = 5;

// One cover in the arc. `key` names the element that draws it, so a cover
// keeps its element (and its loaded image) while it slides along.
export type ArcSlot = { key: number; index: number; offset: number };

// Every list of two or more goes round endlessly, so the front cover is always
// in the middle. A long list is an endless row keyed by position: covers only
// mount and unmount at the faded edges. A short one shows each song once,
// keyed by song: the cover leaving one side slides round behind the others to
// the far side, so no song appears twice.
export function arcSlots(rotation: number, count: number): ArcSlot[] {
  if (count < 1) return [];
  if (count === 1) return [{ key: 0, index: 0, offset: 0 - rotation || 0 }];
  const slots: ArcSlot[] = [];
  if (count >= ARC_COVERS) {
    for (let key = Math.floor(rotation - VISIBLE_SPAN); key <= Math.ceil(rotation + VISIBLE_SPAN); key++) {
      slots.push({ key, index: wrap(key, count), offset: key - rotation });
    }
  } else {
    for (let index = 0; index < count; index++) {
      slots.push({ key: index, index, offset: shortOffset(index - rotation, count) });
    }
  }
  return slots.filter((slot) => Math.abs(slot.offset) < VISIBLE_SPAN);
}

// The same position the short way round: within (-count/2, count/2].
function shortOffset(offset: number, count: number): number {
  let short = wrap(offset, count);
  if (short > count / 2) short -= count;
  return short;
}

// Where a turn of `delta` covers lands. Rotation is unbounded, so the list never jumps back to the start.
export function turnTo(rotation: number, delta: number, count: number): number {
  return count > 1 ? Math.round(rotation) + delta : 0;
}

// A single cover can't be dragged far off the middle.
export function clampDrag(rotation: number, count: number): number {
  return count > 1 ? rotation : Math.max(-0.4, Math.min(0.4, rotation));
}

function wrap(value: number, count: number): number {
  return ((value % count) + count) % count;
}

// The cover at the front for a rotation.
export function frontIndex(rotation: number, count: number): number {
  if (count < 1) return 0;
  return wrap(Math.round(rotation), count);
}
