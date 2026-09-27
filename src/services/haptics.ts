/**
 * MINING FLOW — haptics service.
 * Wraps expo-haptics with settings-driven enablement and safe no-ops.
 */

import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function hapticLight(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function hapticMedium(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

export function hapticSuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticWarning(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

export function hapticSelection(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => undefined);
}