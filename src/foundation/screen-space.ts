import type { Box } from './geometry';
import type { Vec2 } from './vector';
export interface CssVector { readonly xCss: number; readonly yCss: number }
/** Inverse of the arena's independent X/Y presentation scaling. No normalization here. */
export function cssVectorToWorld(v: CssVector, widthCss: number, heightCss: number, arena: Box): Vec2 {
    if (!(widthCss > 0 && heightCss > 0 && Number.isFinite(widthCss) && Number.isFinite(heightCss)))
        throw new RangeError('CSS viewport must be finite and positive');
    return { xWorld: v.xCss * (arena.maxX - arena.minX) / widthCss, yWorld: v.yCss * (arena.maxY - arena.minY) / heightCss };
}
export function cssPointToWorld(p: CssVector, widthCss: number, heightCss: number, arena: Box): Vec2 {
    const v = cssVectorToWorld(p, widthCss, heightCss, arena);
    return { xWorld: arena.minX + v.xWorld, yWorld: arena.minY + v.yWorld };
}
