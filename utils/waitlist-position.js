function createWaitlistPositionMap(entries) {
  const positions = new Map();
  let currentSessionId;
  let position = 0;

  for (const entry of entries) {
    const sessionId = (entry.session?._id || entry.session).toString();
    if (sessionId !== currentSessionId) {
      currentSessionId = sessionId;
      position = 0;
    }

    position += 1;
    positions.set(entry._id.toString(), position);
  }

  return positions;
}

module.exports = { createWaitlistPositionMap };
