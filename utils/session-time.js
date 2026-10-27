function startsOnIndiaHour(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(date);

  return time.endsWith(":00:00") && date.getMilliseconds() === 0;
}

function isRealCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

module.exports = { startsOnIndiaHour, isRealCalendarDate };
