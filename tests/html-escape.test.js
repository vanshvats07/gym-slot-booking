const assert = require("node:assert/strict");
const test = require("node:test");
const Html = require("../public/js/html");

test("escapes all HTML-sensitive characters", () => {
  assert.equal(
    Html.escape(`<script a="b">&'`),
    "&lt;script a=&quot;b&quot;&gt;&amp;&#39;"
  );
});

test("converts non-string values before escaping", () => {
  assert.equal(Html.escape(42), "42");
  assert.equal(Html.escape(null), "null");
});
