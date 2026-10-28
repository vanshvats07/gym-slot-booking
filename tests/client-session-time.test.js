const assert = require("node:assert/strict");
const test = require("node:test");
const SessionTime = require("../public/js/session-time");

test("interprets datetime-local values as India time", () => {
  const date = SessionTime.fromIndiaLocalDateTime("2026-10-27T08:00");

  assert.equal(date.toISOString(), "2026-10-27T02:30:00.000Z");
});

test("rejects malformed or impossible India date/time values", () => {
  for (const value of [
    "",
    "2026-02-29T08:00",
    "2026-10-27T24:00",
    "2026-10-27T08:60",
    "2026-10-27 08:00"
  ]) {
    assert.throws(() => SessionTime.fromIndiaLocalDateTime(value), {
      message: "Choose a valid date and start time."
    });
  }
});

test("formats session times in India time", () => {
  const formatted = SessionTime.formatDate("2026-10-27T02:30:00.000Z");

  assert.match(formatted, /27 Oct 2026/);
  assert.match(formatted, /8:00/);
});
