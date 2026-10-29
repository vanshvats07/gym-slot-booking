const Html = {
  escape(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Html;
}
if (typeof window !== "undefined") {
  window.Html = Html;
}
