/*
 * The arrangements of the order-flow drawing behind the sections (OrderFlowBackdrop.tsx), and the
 * scroll maths that blends them. Like the cake story on the bakery site: the scroll position becomes a
 * continuous stage number (2.5 is halfway between the third and fourth arrangement), and the drawing
 * is posed from it. Same parts as the hero's 3D scene: the core (the order management system), six
 * sales channels (rings) and six warehouses (diamonds).
 */

export type Point = readonly [number, number];

export interface Stage {
  /** Centre of the figure, in % of the viewport's width and height. */
  readonly x: number;
  readonly y: number;
  /** Scale of the 480px figure, its turn in degrees, and its strength (0 hides it). */
  readonly scale: number;
  readonly turn: number;
  readonly alpha: number;
  /** How much it turns with the scroll (0 keeps it square: the timeline, the map). */
  readonly spin: number;
  /** Size of the core; 0 hides it. */
  readonly core: number;
  /** Six sales channels, then six warehouses, in figure units (centre 0,0, about ±200). */
  readonly hubs: readonly Point[];
  /** Routes (orders' paths) and guide lines (orbits, axis), as SVG path data. */
  readonly routes: readonly string[];
  readonly guides: readonly string[];
}

const HUB_GAP = 11;
const round = (value: number) => Math.round(value * 10) / 10;
const polar = (radius: number, degrees: number): Point => {
  const angle = (degrees * Math.PI) / 180;
  return [round(radius * Math.cos(angle)), round(radius * Math.sin(angle))];
};
/** Six points on a circle, the first at the top, turned by `offset` degrees. */
const six = (radius: number, offset = 0) =>
  Array.from({ length: 6 }, (_, i) => polar(radius, -90 + offset + i * 60));
const angles = (offset = 0) => Array.from({ length: 6 }, (_, i) => -90 + offset + i * 60);
const ellipse = (rx: number, ry: number) =>
  `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
const circle = (radius: number) => ellipse(radius, radius);
const pt = ([x, y]: Point) => `${x} ${y}`;
/** A line from `a` to `b` that stops short of both hubs. */
function segment(a: Point, b: Point): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const k = HUB_GAP / Math.hypot(dx, dy);
  return `M ${pt([round(a[0] + dx * k), round(a[1] + dy * k)])} L ${pt([round(b[0] - dx * k), round(b[1] - dy * k)])}`;
}
/** A gentle arc from `a` to `b`, bowed sideways by `bend` units. */
function arc(a: Point, b: Point, bend: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  const control: Point = [
    round((a[0] + b[0]) / 2 - (dy / length) * bend),
    round((a[1] + b[1]) / 2 + (dx / length) * bend),
  ];
  const k = HUB_GAP / length;
  return `M ${pt([round(a[0] + dx * k), round(a[1] + dy * k)])} Q ${pt(control)} ${pt([round(b[0] - dx * k), round(b[1] - dy * k)])}`;
}

// Hero: the network as the sphere shows it. Parked above the viewport, invisible: leaving the
// hero, the drawing comes down from where the sphere went.
const heroChannels = six(150);
const heroWarehouses = six(150, 30);

// About: a cross-section of the core, channels on an inner orbit, each feeding a warehouse outside.
const aboutChannels = six(102, 15);
const aboutWarehouses = six(168, 15);

// Skills: two orbits around a smaller core, like the skills around the frontend.
const skillsChannels = six(118);
const skillsWarehouses = six(182, 30);

// Experience: the hubs line up into an axis, a timeline the core sits in the middle of.
const timeline = (k: number): Point => [0, k < 6 ? -200 + 28 * k : 60 + 28 * (k - 6)];

// Projects: the network unfolded into a map of routes between channels and warehouses.
const mapChannels: Point[] = [
  [-168, -118],
  [-52, -172],
  [92, -146],
  [176, -34],
  [-158, 64],
  [34, 30],
];
const mapWarehouses: Point[] = [
  [-88, -36],
  [22, -92],
  [132, 46],
  [-36, 140],
  [150, 156],
  [-176, 178],
];
const [c0, c1, c2, c3, c4, c5] = mapChannels as [Point, Point, Point, Point, Point, Point];
const [w0, w1, w2, w3, w4, w5] = mapWarehouses as [Point, Point, Point, Point, Point, Point];

// Writing: the whole network on one flat orbit.
const orbit = (degrees: number): Point => {
  const angle = (degrees * Math.PI) / 180;
  return [round(175 * Math.cos(angle)), round(72 * Math.sin(angle))];
};

// Contact: everything gathers close around the core, with one ring going out.
const contactChannels = six(88);
const contactWarehouses = six(88, 30);

const STAGE_LIST = {
  top: {
    x: 72,
    y: -45,
    scale: 1.3,
    turn: 0,
    spin: 1,
    alpha: 0,
    core: 1,
    hubs: [...heroChannels, ...heroWarehouses],
    // Each channel's orders go through the core to the warehouse two places on.
    routes: angles().map((a) => `M ${pt(polar(150, a))} Q 0 0 ${pt(polar(150, a + 150))}`),
    guides: [circle(150)],
  },
  about: {
    x: 5,
    y: 36,
    scale: 1,
    turn: 0,
    spin: 1,
    alpha: 1,
    core: 1,
    hubs: [...aboutChannels, ...aboutWarehouses],
    routes: angles(15).flatMap((a) => [
      segment(polar(52, a), polar(102, a)),
      segment(polar(102, a), polar(168, a)),
    ]),
    guides: [circle(102), circle(168)],
  },
  skills: {
    x: 92,
    y: 82,
    scale: 0.9,
    turn: 16,
    spin: 1,
    alpha: 1.15,
    core: 0.55,
    hubs: [...skillsChannels, ...skillsWarehouses],
    routes: angles().map((a) => arc(polar(118, a), polar(182, a + 30), 16)),
    guides: [circle(118), circle(182)],
  },
  experience: {
    x: 4.5,
    y: 52,
    scale: 1.55,
    turn: 0,
    spin: 0,
    alpha: 1,
    core: 0.5,
    // Channel i, then warehouse i, down the axis.
    hubs: [0, 1, 2, 3, 4, 5]
      .map((i) => timeline(2 * i))
      .concat([0, 1, 2, 3, 4, 5].map((i) => timeline(2 * i + 1))),
    routes: Array.from({ length: 12 }, (_, k) => `M 14 ${timeline(k)[1]} L 34 ${timeline(k)[1]}`),
    guides: ['M 0 -214 L 0 214'],
  },
  projects: {
    x: 4.5,
    y: 58,
    scale: 1.2,
    turn: -8,
    spin: 0,
    alpha: 1.15,
    core: 0,
    hubs: [...mapChannels, ...mapWarehouses],
    routes: [
      arc(c0, w0, 20),
      arc(c1, w1, -16),
      arc(c2, w1, 14),
      arc(c2, w2, -20),
      arc(c3, w2, 18),
      arc(c4, w3, -18),
      arc(c5, w2, 12),
      arc(c5, w4, -16),
      arc(w0, w3, 22),
      arc(c4, w5, 16),
      arc(c1, w0, -12),
    ],
    guides: [],
  },
  writing: {
    x: 6,
    y: 74,
    scale: 0.9,
    turn: -14,
    spin: 1,
    alpha: 0.9,
    core: 0.35,
    hubs: [...angles(90).map((a) => orbit(a)), ...angles(120).map((a) => orbit(a))],
    routes: [],
    guides: [ellipse(175, 72)],
  },
  contact: {
    x: 7,
    y: 60,
    scale: 0.95,
    turn: 0,
    spin: 1,
    alpha: 1,
    core: 1,
    hubs: [...contactChannels, ...contactWarehouses],
    routes: [...angles(), ...angles(30)].map((a) => `M ${pt(polar(64, a))} L ${pt(polar(76, a))}`),
    guides: [circle(88), circle(150)],
  },
} satisfies Record<string, Stage>;

/** The arrangements in page order; each belongs to the section with that id. */
export const STAGE_IDS = ['top', 'about', 'skills', 'experience', 'projects', 'writing', 'contact'] as const;
export type StageId = (typeof STAGE_IDS)[number];
export const STAGES: Readonly<Record<StageId, Stage>> = STAGE_LIST;

/** Half the scroll over which one arrangement turns into the next, in viewport heights. */
export const ZONE = 0.45;
/** Each hub sets off this much of the change after the one before it. */
const STAGGER = 0.025;
/** The drawing sways this many degrees either way as the page scrolls, once per this many pixels × 2π. */
export const SWAY_DEGREES = 12;
export const SWAY_PERIOD = 1600;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const v = clamp01(value);
  return v * v * (3 - 2 * v);
};
const lerp = (from: number, to: number, f: number) => from + (to - from) * f;
function pick<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) throw new RangeError(`No item ${index} in a list of ${list.length}`);
  return item;
}

/**
 * Where the reader is in the story, as a continuous stage number. `middle` is the document position of
 * the middle of the viewport, `boundaries[k]` the top of the section of stage k + 1. An arrangement holds
 * while its section is read, and turns into the next over `zone` pixels either side of the boundary.
 */
export function stageAt(middle: number, boundaries: readonly number[], zone: number): number {
  let stage = 0;
  for (const boundary of boundaries) {
    if (middle >= boundary + zone) {
      stage += 1;
      continue;
    }
    if (middle > boundary - zone) stage += (middle - (boundary - zone)) / (2 * zone);
    break;
  }
  return stage;
}

export interface Pose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly turn: number;
  readonly alpha: number;
  readonly core: number;
  readonly hubs: readonly Point[];
  /** Opacity of each stage's routes: the old ones go first, the new ones come once the hubs are nearly there. */
  readonly routes: readonly number[];
}

/** The drawing at stage number `t` of `stages`, swayed by `sway` degrees where the arrangement allows it. */
export function poseAt(stages: readonly Stage[], t: number, sway = 0): Pose {
  const last = stages.length - 1;
  const k = Math.min(Math.max(Math.floor(t), 0), last);
  const f = k === last ? 0 : clamp01(t - k);
  const a = pick(stages, k);
  const b = pick(stages, Math.min(k + 1, last));
  const e = smooth(f);
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e),
    scale: lerp(a.scale, b.scale, e),
    turn: lerp(a.turn, b.turn, e) + lerp(a.spin, b.spin, e) * sway,
    alpha: lerp(a.alpha, b.alpha, e),
    core: lerp(a.core, b.core, e),
    hubs: a.hubs.map(([x, y], i) => {
      const [toX, toY] = b.hubs.at(i) ?? [x, y];
      const g = smooth((f - i * STAGGER) / (1 - (a.hubs.length - 1) * STAGGER));
      return [lerp(x, toX, g), lerp(y, toY, g)] as const;
    }),
    routes: stages.map((_, i) =>
      i === k ? clamp01(1 - f * 2.5) : i === k + 1 ? clamp01((f - 0.6) * 2.5) : 0,
    ),
  };
}
