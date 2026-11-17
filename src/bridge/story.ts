// Timeline of the Ronald Read short: shots timed to the voice words
export const FPS = 30;
export const TOTAL = 1980; // 66 segundos
export const D0 = 6.0; 
export const HALF = 27; 
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 74;
export const PARK: V3 = [70, D0, -75]; 
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story physics ----------------
export const front = (tau: number) => 26 - 1.6 * (tau - 4.4); 
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1; 
export const SNAP = 34.62, DROP0 = 36.35, DROP1 = 36.95;
export const amp = (tau: number) => lin([[0, 0], [TOTAL/FPS, 0]], tau);
export const stomp = (tau: number) => 1.0; 
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26); 
export const dropU = (tau: number) => 0;
export const DROP_H = 6.6;

export type BridgeState = { bounce: number; drop: number; snap: number; collapsed: boolean };
export const deckY = (z: number, b: BridgeState) => D0 + b.bounce * shapeZ(z) - b.drop * DROP_H * dropW(z);

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "march" | "fall" | "water" | "bank" | "tourists" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "day", crowd: "none", tau: (t) => t },
  { id: 2, a: 150, b: 330, light: "day", crowd: "none", tau: (t) => t },
  { id: 3, a: 330, b: 510, light: "day", crowd: "none", tau: (t) => t },
  { id: 4, a: 510, b: 630, light: "day", crowd: "none", tau: (t) => t },
  { id: 5, a: 630, b: 840, light: "day", crowd: "none", tau: (t) => t },
  { id: 6, a: 840, b: 1050, light: "day", crowd: "none", tau: (t) => t },
  { id: 7, a: 1050, b: 1230, light: "golden", crowd: "none", tau: (t) => t },
  { id: 8, a: 1230, b: 1410, light: "golden", crowd: "none", tau: (t) => t },
  { id: 9, a: 1410, b: 1530, light: "golden", crowd: "none", tau: (t) => t },
  { id: 10, a: 1530, b: 1740, light: "golden", crowd: "none", tau: (t) => t },
  { id: 11, a: 1740, b: 1890, light: "golden", crowd: "none", tau: (t) => t },
  { id: 12, a: 1890, b: 1980, light: "golden", crowd: "none", tau: (t) => t },
];
export const XFADE: Record<number, number> = { 2: 18, 3: 14, 4: 12, 5: 18, 6: 14, 7: 24, 8: 16, 9: 18, 10: 18, 11: 16, 12: 20 };
export const FLASH_AT = 132;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const bridgeState = (id: number, t: number): BridgeState => {
  return { bounce: 0, drop: 0, snap: 0, collapsed: false }; // Sem fÃ­sica maluca, cÃ¢mera focada nos personagens
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};

const S1 = (f:number) => ({pos: [-1.8, 2.0, 7.8], look: [0, 1.35, 0], fov: 34});
const S2 = (f:number) => ({pos: [13, 7.5, 20], look: [0, 3.2, 0], fov: 43});
const S3 = (f:number) => ({pos: [2.7, 1.8, 5.6], look: [0, 1.2, 0], fov: 36});
const S4 = (f:number) => ({pos: [-2.4, 1.75, 4.7], look: [0, 1.15, 0], fov: 31});
const S5 = (f:number) => ({pos: [0.2, 2.1, 5.0], look: [0, 1.45, 0], fov: 34});
const S6 = (f:number) => ({pos: [3.8, 2.0, 6.0], look: [0, 1.2, 0], fov: 38});
const S7 = (f:number) => ({pos: [0, 8.5, 13], look: [0, 0.7, 0], fov: 42});
const S8 = (f:number) => ({pos: [-2.0, 1.9, 5.0], look: [0, 1.3, 0], fov: 33});
const S9 = (f:number) => ({pos: [7.0, 4.2, 10.0], look: [0, 1.4, 0], fov: 39});
const S10 = (f:number) => ({pos: [-4.5, 2.4, 7.5], look: [0, 1.0, 0], fov: 38});
const S11 = (f:number) => ({pos: [1.8, 1.9, 5.4], look: [0, 1.25, 0], fov: 34});
const S12 = (f:number) => ({pos: [0, 2.2, 6.0], look: [0, 1.35, 0], fov: 36});

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, cut: true, s: S1 }],
  2: [{ f: 150, cut: true, s: S2 }],
  3: [{ f: 330, cut: true, s: S3 }],
  4: [{ f: 510, cut: true, s: S4 }],
  5: [{ f: 630, cut: true, s: S5 }],
  6: [{ f: 840, cut: true, s: S6 }],
  7: [{ f: 1050, cut: true, s: S7 }],
  8: [{ f: 1230, cut: true, s: S8 }],
  9: [{ f: 1410, cut: true, s: S9 }],
  10: [{ f: 1530, cut: true, s: S10 }],
  11: [{ f: 1740, cut: true, s: S11 }],
  12: [{ f: 1890, cut: true, s: S12 }],
};

export const kickAt = (t: number) => 0;
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);
export const keyEnd = (id: number, f: number) => f;

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 15 }, { f: 150, cInf: 0 }, { f: 330, cInf: 13 }, { f: 510, cInf: 14 },
  { f: 630, cInf: 12 }, { f: 840, cInf: 11 }, { f: 1050, cInf: 0 }, { f: 1230, cInf: 15 },
  { f: 1410, cInf: 10 }, { f: 1530, cInf: 7 }, { f: 1740, cInf: 12 }, { f: 1890, cInf: 13 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  return { cInf: DOF[i].cInf, focus: DOF[i].focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

// Constantes necessárias para o arquivo world.ts não quebrar
export const ANCHOR: V3 = [-2.7, D0 + 0.62, -37];
export const snapEnd = (snap: number): V3 => {
  const u = easeOut(snap);
  return [ANCHOR[0] - 0.6 * u, ANCHOR[1] + 5.5 * u - 2.0 * u * u, ANCHOR[2] + 4.5 * u];
};