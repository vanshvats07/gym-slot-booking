const SessionTime = (() => {
  function fromIndiaLocalDateTime(value) {
    const match = typeof value === "string" &&
      /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
      throw new Error("Choose a valid date and start time.");
    }

    const date = new Date(`${match[1]}T00:00:00Z`);
    const hour = Number(match[2]);
    const minute = Number(match[3]);
    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== match[1] ||
        hour > 23 || minute > 59) {
      throw new Error("Choose a valid date and start time.");
    }

    return new Date(`${value}:00+05:30`);
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata"
    });
  }

  return { fromIndiaLocalDateTime, formatDate };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SessionTime;
}
if (typeof window !== "undefined") {
  window.SessionTime = SessionTime;
}
