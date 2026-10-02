import type { Vec2 } from './vector';
export interface Box {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}
export function lengthSquared(v: Vec2): number { return v.xWorld * v.xWorld + v.yWorld * v.yWorld; }
export function subtract(a: Vec2, b: Vec2): Vec2 { return { xWorld: a.xWorld - b.xWorld, yWorld: a.yWorld - b.yWorld }; }
export function along(a: Vec2, b: Vec2, t: number): Vec2 { return { xWorld: a.xWorld + (b.xWorld - a.xWorld) * t, yWorld: a.yWorld + (b.yWorld - a.yWorld) * t }; }
export function unit(v: Vec2): Vec2 { const n = Math.hypot(v.xWorld, v.yWorld); return n ? { xWorld: v.xWorld / n, yWorld: v.yWorld / n } : { xWorld: 0, yWorld: 0 }; }
/** Relative continuous circle sweep. Touching and moving away/tangentially is not a new collision. */
export function circleTOI(from: Vec2, to: Vec2, center: Vec2, radius: number): number | null {
    const d = subtract(to, from), m = subtract(from, center), a = lengthSquared(d), b = m.xWorld * d.xWorld + m.yWorld * d.yWorld, c = lengthSquared(m) - radius * radius;
    if (c <= 1e-9)
        return b < 0 || c < -1e-9 ? 0 : null;
    if (!a || b >= 0)
        return null;
    const disc = b * b - a * c;
    if (disc < 0)
        return null;
    const t = (-b - Math.sqrt(disc)) / a;
    return t >= 0 && t <= 1 ? t : null;
}
function boxTOI(from: Vec2, to: Vec2, r: Box): number | null {
    const dx = to.xWorld - from.xWorld, dy = to.yWorld - from.yWorld;
    let enter = 0, leave = 1;
    for (const [p, d, lo, hi] of [[from.xWorld, dx, r.minX, r.maxX], [from.yWorld, dy, r.minY, r.maxY]]) {
        if (p === undefined || d === undefined || lo === undefined || hi === undefined)
            throw new Error('fixed geometry tuple');
        if (d === 0) {
            if (p < lo || p > hi)
                return null;
        }
        else {
            let a = (lo - p) / d, b = (hi - p) / d;
            if (a > b)
                [a, b] = [b, a];
            enter = Math.max(enter, a);
            leave = Math.min(leave, b);
            if (enter > leave)
                return null;
        }
    }
    if (enter === 0 && ((from.xWorld <= r.minX && dx <= 0) || (from.xWorld >= r.maxX && dx >= 0) || (from.yWorld <= r.minY && dy <= 0) || (from.yWorld >= r.maxY && dy >= 0)))
        return null;
    return enter;
}
/** Exact circle vs rectangle Minkowski sweep: two side boxes plus four round corners. */
export function rectTOI(from: Vec2, to: Vec2, r: Box, radius: number): number | null {
    const candidates = [boxTOI(from, to, { minX: r.minX - radius, maxX: r.maxX + radius, minY: r.minY, maxY: r.maxY }), boxTOI(from, to, { minX: r.minX, maxX: r.maxX, minY: r.minY - radius, maxY: r.maxY + radius })];
    for (const xWorld of [r.minX, r.maxX])
        for (const yWorld of [r.minY, r.maxY])
            candidates.push(circleTOI(from, to, { xWorld, yWorld }, radius));
    let best: number | null = null;
    for (const t of candidates)
        if (t !== null && (best === null || t < best))
            best = t;
    return best;
}
/** Movement-only overlap recovery. Projectile circleTOI deliberately retains t=0 overlap hits. */
export function movementCircleTOI(from: Vec2, to: Vec2, center: Vec2, radius: number): number | null {
    const m = subtract(from, center), d = subtract(to, from);
    if (lengthSquared(m) < radius * radius - 1e-9)
        // Squared separation is monotone along the whole segment when m·d >= 0.
        // Tangential motion and any nonzero motion from coincident centers separate quadratically.
        return lengthSquared(d) > 0 && m.xWorld * d.xWorld + m.yWorld * d.yWorld >= 0 ? null : 0;
    return circleTOI(from, to, center, radius);
}
function rectangleSeparation(p: Vec2, r: Box): number {
    const x = Math.max(r.minX - p.xWorld, 0, p.xWorld - r.maxX), y = Math.max(r.minY - p.yWorld, 0, p.yWorld - r.maxY);
    return x || y ? Math.hypot(x, y) : Math.max(r.minX - p.xWorld, p.xWorld - r.maxX, r.minY - p.yWorld, p.yWorld - r.maxY);
}
/** Signed separation from the solid rectangle: negative inside, zero on its boundary. */
export function movementRectTOI(from: Vec2, to: Vec2, r: Box, radius: number): number | null {
    const separation = rectangleSeparation(from, r);
    if (separation >= radius - 1e-9)
        return rectTOI(from, to, r, radius);
    const d = subtract(to, from), qx = Math.max(r.minX, Math.min(r.maxX, from.xWorld)), qy = Math.max(r.minY, Math.min(r.maxY, from.yWorld));
    const mx = from.xWorld - qx, my = from.yWorld - qy;
    // Outside the rectangle use the nearest-point normal. Inside, every tied
    // nearest face is eligible; no arbitrary face choice can trap the center.
    const outward = mx || my ? mx * d.xWorld + my * d.yWorld : Math.max(
        r.minX - from.xWorld >= separation - 1e-9 ? -d.xWorld : -Infinity,
        from.xWorld - r.maxX >= separation - 1e-9 ? d.xWorld : -Infinity,
        r.minY - from.yWorld >= separation - 1e-9 ? -d.yWorld : -Infinity,
        from.yWorld - r.maxY >= separation - 1e-9 ? d.yWorld : -Infinity);
    // Convex separation cannot decrease after a nonnegative initial derivative.
    // Require positive endpoint progress; a penetrating flat-wall tangent alone does not recover.
    return outward >= 0 && rectangleSeparation(to, r) > separation + 1e-9 ? null : 0;
}
export function distance(a: Vec2, b: Vec2): number { return Math.hypot(a.xWorld - b.xWorld, a.yWorld - b.yWorld); }
