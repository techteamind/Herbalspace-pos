export function haptic(pattern: number | number[] = 10): void {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

export function hapticSuccess(): void { haptic([10, 30, 10]); }
export function hapticError(): void { haptic([30, 20, 30, 20, 30]); }
