export function touchLayout(widthCss: number, heightCss: number, count: number) {
    const size = Math.max(42, Math.min(58, heightCss / 6.5)), gap = size + 12;
    const buttons = Array.from({ length: count }, (_, i) => ({ xCss: widthCss - 40 - (i % 3) * gap, yCss: heightCss - 42 - Math.floor(i / 3) * gap, radiusCss: size / 2 }));
    // The complete control surface includes interstitial gaps. It is CSS UI
    // geometry only; concrete buttons still take precedence over this envelope.
    const skillControl = buttons.length ? { minXCss: Infinity, minYCss: Infinity, maxXCss: -Infinity, maxYCss: -Infinity } : null;
    if (skillControl) for (const button of buttons) {
        skillControl.minXCss = Math.min(skillControl.minXCss, button.xCss - button.radiusCss);
        skillControl.minYCss = Math.min(skillControl.minYCss, button.yCss - button.radiusCss);
        skillControl.maxXCss = Math.max(skillControl.maxXCss, button.xCss + button.radiusCss);
        skillControl.maxYCss = Math.max(skillControl.maxYCss, button.yCss + button.radiusCss);
    }
    return { joystick: { xCss: Math.max(64, size + 16), yCss: heightCss - 64, radiusCss: 48 }, cancel: { xCss: widthCss - 36, yCss: 150, radiusCss: 28 }, buttons, skillControl };
}
