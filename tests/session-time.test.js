const assert = require("node:assert/strict");
const test = require("node:test");
const {
  startsOnIndiaHour,
  isRealCalendarDate
} = require("../utils/session-time");

test("accepts session starts on the hour in India", () => {
  assert.equal(startsOnIndiaHour(new Date("2026-10-27T02:30:00.000Z")), true);
});

test("rejects session starts with nonzero minutes, seconds, or milliseconds", () => {
  assert.equal(startsOnIndiaHour(new Date("2026-10-27T02:31:00.000Z")), false);
  assert.equal(startsOnIndiaHour(new Date("2026-10-27T02:30:01.000Z")), false);
  assert.equal(startsOnIndiaHour(new Date("2026-10-27T02:30:00.001Z")), false);
});

test("rejects invalid date objects", () => {
  assert.equal(startsOnIndiaHour(new Date("invalid")), false);
  assert.equal(startsOnIndiaHour(null), false);
});

test("accepts real calendar dates, including leap days", () => {
  assert.equal(isRealCalendarDate("2024-02-29"), true);
  assert.equal(isRealCalendarDate("2026-10-27"), true);
});

test("rejects invalid or malformed calendar dates", () => {
  assert.equal(isRealCalendarDate("2025-02-29"), false);
  assert.equal(isRealCalendarDate("2026-13-01"), false);
  assert.equal(isRealCalendarDate("2026-1-01"), false);
  assert.equal(isRealCalendarDate(null), false);
});
