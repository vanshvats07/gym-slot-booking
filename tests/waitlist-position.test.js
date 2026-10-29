const assert = require("node:assert/strict");
const test = require("node:test");
const { createWaitlistPositionMap } = require("../utils/waitlist-position");

test("assigns ordered positions independently for each session", () => {
  const positions = createWaitlistPositionMap([
    { _id: "first", session: "session-a" },
    { _id: "second", session: { _id: "session-a" } },
    { _id: "third", session: "session-a" },
    { _id: "other-session", session: "session-b" }
  ]);

  assert.deepEqual([...positions], [
    ["first", 1],
    ["second", 2],
    ["third", 3],
    ["other-session", 1]
  ]);
});
