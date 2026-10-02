export function touchLayout(widthCss: number, heightCss: number, count: number) {
    const size = Math.max(42, Math.min(58, heightCss / 6.5)), gap = size + 12;
    return { joystick: { xCss: Math.max(64, size + 16), yCss: heightCss - 64, radiusCss: 48 }, cancel: { xCss: widthCss - 36, yCss: 150, radiusCss: 28 }, buttons: Array.from({ length: count }, (_, i) => ({ xCss: widthCss - 40 - (i % 3) * gap, yCss: heightCss - 42 - Math.floor(i / 3) * gap, radiusCss: size / 2 })) };
}
