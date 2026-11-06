// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { resolveAreraBand, isItalianNationalHoliday, getEasterSunday } from "../src/core/bands.ts";

test("Easter algorithm calculates correct Easter dates", () => {
  // Easter 2026 is April 5
  const e2026 = getEasterSunday(2026);
  assert.equal(e2026.month, 4);
  assert.equal(e2026.day, 5);

  // Easter 2027 is March 28
  const e2027 = getEasterSunday(2027);
  assert.equal(e2027.month, 3);
  assert.equal(e2027.day, 28);
});

test("isItalianNationalHoliday detects fixed and moveable holidays", () => {
  // Christmas
  assert.equal(isItalianNationalHoliday(new Date("2026-12-25T10:00:00")), true);
  // Capodanno
  assert.equal(isItalianNationalHoliday(new Date("2026-01-01T10:00:00")), true);
  // Ferragosto
  assert.equal(isItalianNationalHoliday(new Date("2026-08-15T10:00:00")), true);
  // Ordinary day
  assert.equal(isItalianNationalHoliday(new Date("2026-06-10T10:00:00")), false);
});

test("resolveAreraBand correctly identifies F1, F2 and F3", () => {
  // Wednesday 10 June 2026 (weekday, not holiday)
  const wedF1 = new Date(2026, 5, 10, 11, 0, 0); // 11:00
  assert.equal(resolveAreraBand(wedF1), "F1");

  const wedF2Morning = new Date(2026, 5, 10, 7, 30, 0); // 07:30
  assert.equal(resolveAreraBand(wedF2Morning), "F2");

  const wedF2Evening = new Date(2026, 5, 10, 20, 0, 0); // 20:00
  assert.equal(resolveAreraBand(wedF2Evening), "F2");

  const wedF3Night = new Date(2026, 5, 10, 23, 15, 0); // 23:15
  assert.equal(resolveAreraBand(wedF3Night), "F3");

  const wedF3Early = new Date(2026, 5, 10, 4, 0, 0); // 04:00
  assert.equal(resolveAreraBand(wedF3Early), "F3");

  // Saturday 13 June 2026
  const satF2 = new Date(2026, 5, 13, 14, 0, 0); // 14:00
  assert.equal(resolveAreraBand(satF2), "F2");

  const satF3 = new Date(2026, 5, 13, 1, 0, 0); // 01:00
  assert.equal(resolveAreraBand(satF3), "F3");

  // Sunday 14 June 2026
  const sunNoon = new Date(2026, 5, 14, 12, 0, 0); // 12:00
  assert.equal(resolveAreraBand(sunNoon), "F3");

  // Friday 25 December 2026 (Natale - national holiday on a weekday)
  const christmasNoon = new Date(2026, 11, 25, 12, 0, 0);
  assert.equal(resolveAreraBand(christmasNoon), "F3");
});
