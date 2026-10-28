const assert = require("node:assert/strict");
const test = require("node:test");
const { createWaitlistPredecessorFilter } = require("../utils/waitlist-position");

test("counts only waiting entries in the same session", () => {
  const entry = {
    _id: "entry-id",
    session: { _id: "session-id" },
    joinedAt: new Date("2026-10-28T12:00:00.000Z")
  };

  assert.deepEqual(createWaitlistPredecessorFilter(entry), {
    session: "session-id",
    status: "waiting",
    $or: [
      { joinedAt: { $lt: entry.joinedAt } },
      { joinedAt: entry.joinedAt, _id: { $lt: "entry-id" } }
    ]
  });
});

test("supports waitlist entries whose session is not populated", () => {
  const entry = {
    _id: "entry-id",
    session: "session-id",
    joinedAt: new Date("2026-10-28T12:00:00.000Z")
  };

  assert.equal(createWaitlistPredecessorFilter(entry).session, "session-id");
});
