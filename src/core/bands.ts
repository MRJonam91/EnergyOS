// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import { ITALIAN_FIXED_HOLIDAYS } from "./constants.ts";
import type { TimeBandId } from "./types.ts";

/**
 * Calculates Easter Sunday for a given Gregorian year using the Anonymous Gregorian algorithm.
 */
export function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Checks if a date falls on an Italian national holiday (fixed or Easter Monday).
 */
export function isItalianNationalHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if ((ITALIAN_FIXED_HOLIDAYS as readonly string[]).includes(mmdd)) {
    return true;
  }

  // Check Easter Monday (Lunedì dell'Angelo)
  const easter = getEasterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  const pasquetta = new Date(easterDate.getTime() + 24 * 3600 * 1000);
  if (pasquetta.getUTCMonth() + 1 === month && pasquetta.getUTCDate() === day) {
    return true;
  }

  return false;
}

/**
 * Resolves the ARERA Italian multioraria time band (F1, F2, F3) for a given Date.
 * 
 * Rules defined by ARERA:
 * - F1: Mon-Fri 08:00 - 19:00 (excluding national holidays)
 * - F2: Mon-Fri 07:00 - 08:00 and 19:00 - 23:00; Sat 07:00 - 23:00 (excluding holidays)
 * - F3: Mon-Sat 23:00 - 07:00; all day Sundays and national holidays
 */
export function resolveAreraBand(date: Date): TimeBandId {
  // If it's Sunday (0) or a national holiday, entire day is F3
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  if (dayOfWeek === 0 || isItalianNationalHoliday(date)) {
    return "F3";
  }

  const hour = date.getHours();

  // Saturday
  if (dayOfWeek === 6) {
    if (hour >= 7 && hour < 23) {
      return "F2";
    }
    return "F3";
  }

  // Weekdays (Monday through Friday)
  if (hour >= 8 && hour < 19) {
    return "F1";
  }
  if (hour === 7 || (hour >= 19 && hour < 23)) {
    return "F2";
  }
  return "F3";
}
