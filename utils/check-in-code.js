const crypto = require("node:crypto");

function createCheckInCode() {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

module.exports = { createCheckInCode };
