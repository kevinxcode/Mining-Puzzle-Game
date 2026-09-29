/**
 * Offline crash log (storage part) — AsyncStorage only, nothing is uploaded.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { addCrashEntry, buildCrashEntry, formatCrashReport, type CrashEntry } from './crashLogCore';

const KEY = 'miningpuzzle.crashLog';

export const appVersion = (): string => Constants.expoConfig?.version ?? 'unknown';
export const platformLabel = (): string => `${Platform.OS} ${String(Platform.Version)}`;

export async function readCrashLog(): Promise<CrashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CrashEntry[]) : [];
  } catch {
    return [];
  }
}

/** Never throws — logging must not cause a second crash. */
export async function recordCrash(error: unknown, route: string): Promise<CrashEntry[]> {
  try {
    const log = addCrashEntry(await readCrashLog(), buildCrashEntry(error, route, Date.now(), appVersion()));
    await AsyncStorage.setItem(KEY, JSON.stringify(log));
    return log;
  } catch {
    return [];
  }
}

export async function clearCrashLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export async function crashReportText(): Promise<string> {
  return formatCrashReport(await readCrashLog(), platformLabel());
}
