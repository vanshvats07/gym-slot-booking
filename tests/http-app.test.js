const assert = require("node:assert/strict");
const { once } = require("node:events");
const test = require("node:test");
const mongoose = require("mongoose");
const app = require("../app");

test("HTTP middleware and health responses", async t => {
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  }));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  await t.test("reports database disconnection as unavailable", async () => {
    assert.notEqual(mongoose.connection.readyState, 1);
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 503);
    assert.equal(data.success, false);
    assert.equal(data.message, "Database unavailable");
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  await t.test("sets security headers on public pages", async () => {
    const response = await fetch(`${baseUrl}/sessions.html`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(
      response.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin"
    );
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/
    );
  });

  await t.test("returns JSON for unknown API routes", async () => {
    const response = await fetch(`${baseUrl}/api/not-a-route`);
    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(data, {
      success: false,
      message: "Route not found"
    });
  });

  await t.test("returns a structured error for malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(data, {
      success: false,
      message: "Invalid request body"
    });
  });

  await t.test("rejects request bodies above the JSON size limit", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100 * 1024) })
    });
    const data = await response.json();

    assert.equal(response.status, 413);
    assert.deepEqual(data, {
      success: false,
      message: "Request body is too large"
    });
  });

  await t.test("rejects email addresses above the server-side limit", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Member",
        email: `${"a".repeat(245)}@example.com`,
        password: "private-password"
      })
    });
    const data = await response.json();

    assert.equal(response.status, 422);
    assert.equal(data.success, false);
    assert.match(data.errors[0].message, /254 bytes/);
  });
});
