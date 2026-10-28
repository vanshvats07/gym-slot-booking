function createWaitlistPredecessorFilter(entry) {
  const sessionId = entry.session?._id || entry.session;

  return {
    session: sessionId,
    status: "waiting",
    $or: [
      { joinedAt: { $lt: entry.joinedAt } },
      { joinedAt: entry.joinedAt, _id: { $lt: entry._id } }
    ]
  };
}

module.exports = { createWaitlistPredecessorFilter };
