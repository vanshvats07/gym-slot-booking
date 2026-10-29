const assert = require("node:assert/strict");
const test = require("node:test");
const { createCheckInCode } = require("../utils/check-in-code");

test("creates a 12-character uppercase hexadecimal check-in code", () => {
  const code = createCheckInCode();

  assert.match(code, /^[0-9A-F]{12}$/);
});
