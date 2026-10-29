const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createAPIClient() {
  const requests = [];
  const context = {
    Headers,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () => ({ success: true })
      };
    },
    localStorage: {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {}
    },
    location: {
      pathname: "/sessions.html",
      replace: () => {}
    },
    window: {}
  };
  const source = fs.readFileSync(
    path.join(__dirname, "../public/js/api.js"),
    "utf8"
  );

  vm.runInNewContext(source, context);
  return { API: context.window.API, requests };
}

test("sends JSON Accept headers without a body content type on GET", async () => {
  const { API, requests } = createAPIClient();

  await API.request("/api/sessions");

  assert.equal(requests[0].options.headers.get("Accept"), "application/json");
  assert.equal(requests[0].options.headers.has("Content-Type"), false);
});

test("sends JSON Content-Type for requests with a body", async () => {
  const { API, requests } = createAPIClient();

  await API.request("/api/auth/login", {
    method: "POST",
    body: "{}"
  });

  assert.equal(requests[0].options.headers.get("Content-Type"), "application/json");
});
