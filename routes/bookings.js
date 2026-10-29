const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Session = require("../models/Session");
const Booking = require("../models/Booking");
const Waitlist = require("../models/Waitlist");
const { requireAuth } = require("../middleware/auth");
const { createWaitlistPositionMap } = require("../utils/waitlist-position");

const router = express.Router();

function createCheckInCode() {
  return crypto.randomBytes(8).toString("base64url").slice(0, 8).toUpperCase();
}

function createRouteError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function reserveSeat(sessionId, transaction) {
  return Session.findOneAndUpdate(
    {
      _id: sessionId,
      startsAt: { $gt: new Date() },
      $expr: { $lt: ["$bookedCount", "$capacity"] }
    },
    { $inc: { bookedCount: 1 } },
    { new: true, session: transaction }
  );
}

async function confirmBooking(memberId, sessionId, oldBooking, transaction) {
  const checkInCode = createCheckInCode();

  if (oldBooking) {
    oldBooking.status = "confirmed";
    oldBooking.checkInCode = checkInCode;
    oldBooking.checkedInAt = undefined;
    oldBooking.checkedInBy = undefined;
    await oldBooking.save({ session: transaction });
    return oldBooking;
  }

  const [booking] = await Booking.create(
    [{
      member: memberId,
      session: sessionId,
      status: "confirmed",
      checkInCode
    }],
    { session: transaction }
  );

  return booking;
}

router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ member: req.user._id })
      .populate("session", "startsAt capacity bookedCount")
      .sort({ createdAt: -1 });
    const waitlistEntries = await Waitlist.find({
      member: req.user._id,
      status: "waiting"
    })
      .populate("session", "startsAt capacity bookedCount")
      .sort({ joinedAt: -1 });
    const sessionIds = [
      ...new Set(waitlistEntries
        .map(entry => entry.session?._id)
        .filter(Boolean)
        .map(sessionId => sessionId.toString()))
    ];
    const queueEntries = sessionIds.length
      ? await Waitlist.find({
        session: { $in: sessionIds },
        status: "waiting"
      })
        .select("_id session joinedAt")
        .sort({ session: 1, joinedAt: 1, _id: 1 })
        .lean()
      : [];
    const positions = createWaitlistPositionMap(queueEntries);
    const waitlist = waitlistEntries.map(entry => ({
      ...entry.toObject(),
      position: positions.get(entry._id.toString())
    }));

    res.json({ success: true, bookings, waitlist });
  } catch (error) {
    next(error);
  }
});

router.post("/:sessionId", requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.sessionId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid session ID"
    });
  }

  let transaction;
  let result;

  try {
    transaction = await mongoose.startSession();

    await transaction.withTransaction(async () => {
      result = null;

      const session = await Session.findById(req.params.sessionId)
        .session(transaction);
      if (!session) {
        throw createRouteError(404, "Session not found");
      }
      if (session.startsAt <= new Date()) {
        throw createRouteError(409, "This session has already started");
      }

      let booking = await Booking.findOne({
        member: req.user._id,
        session: session._id
      }).session(transaction);

      if (booking && ["confirmed", "checkedIn"].includes(booking.status)) {
        throw createRouteError(409, "You already have a booking for this session");
      }

      const waitingEntry = await Waitlist.findOne({
        member: req.user._id,
        session: session._id,
        status: "waiting"
      }).session(transaction);

      if (waitingEntry) {
        result = {
          message: "You are already on this session's waitlist.",
          waitlist: {
            id: waitingEntry._id,
            joinedAt: waitingEntry.joinedAt
          }
        };
        return;
      }

      const availableSeat = await reserveSeat(session._id, transaction);

      if (availableSeat) {
        booking = await confirmBooking(
          req.user._id,
          session._id,
          booking,
          transaction
        );

        result = {
          message: "Booking confirmed",
          booking: {
            id: booking._id,
            status: booking.status,
            checkInCode: booking.checkInCode
          }
        };
        return;
      }

      const entry = await Waitlist.findOneAndUpdate(
        { member: req.user._id, session: session._id },
        {
          $set: {
            status: "waiting",
            joinedAt: new Date()
          }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          session: transaction
        }
      );

      result = {
        message: "Session is full. You are on the waitlist.",
        waitlist: {
          id: entry._id,
          joinedAt: entry.joinedAt
        }
      };
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A booking or waitlist entry already exists. Refresh and try again."
      });
    }
    next(error);
  } finally {
    if (transaction) await transaction.endSession();
  }
});

async function promoteNextMember(session, transaction) {
  while (true) {
    const entry = await Waitlist.findOne({
      session: session._id,
      status: "waiting"
    })
      .sort({ joinedAt: 1, _id: 1 })
      .session(transaction);

    if (!entry) return null;

    const oldBooking = await Booking.findOne({
      member: entry.member,
      session: session._id
    }).session(transaction);

    if (oldBooking && ["confirmed", "checkedIn"].includes(oldBooking.status)) {
      entry.status = "cancelled";
      await entry.save({ session: transaction });
      continue;
    }

    const availableSeat = await reserveSeat(session._id, transaction);
    if (!availableSeat) return null;

    await confirmBooking(entry.member, session._id, oldBooking, transaction);
    entry.status = "promoted";
    await entry.save({ session: transaction });

    return entry.member.toString();
  }
}

router.delete("/:bookingId", requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking ID"
    });
  }

  let transaction;
  let promotedMemberId = null;

  try {
    transaction = await mongoose.startSession();

    await transaction.withTransaction(async () => {
      promotedMemberId = null;

      const booking = await Booking.findOne({
        _id: req.params.bookingId,
        member: req.user._id,
        status: "confirmed"
      }).session(transaction);

      if (!booking) {
        throw createRouteError(404, "Active booking not found");
      }

      const session = await Session.findById(booking.session)
        .session(transaction);
      if (!session) {
        throw createRouteError(404, "Session not found");
      }
      if (session.startsAt <= new Date()) {
        throw createRouteError(409, "Cancellation closes when the session starts");
      }

      booking.status = "cancelled";
      booking.checkInCode = undefined;
      await booking.save({ session: transaction });

      const countUpdate = await Session.updateOne(
        { _id: session._id, bookedCount: { $gt: 0 } },
        { $inc: { bookedCount: -1 } },
        { session: transaction }
      );

      if (countUpdate.modifiedCount !== 1) {
        throw createRouteError(409, "Could not update this session's seat count");
      }

      promotedMemberId = await promoteNextMember(session, transaction);
    });

    const message = promotedMemberId
      ? "Booking cancelled and first eligible waitlisted member promoted"
      : "Booking cancelled";

    res.json({
      success: true,
      message,
      promoted: Boolean(promotedMemberId)
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Booking conflict; refresh and try again"
      });
    }
    next(error);
  } finally {
    if (transaction) await transaction.endSession();
  }
});

router.delete("/waitlist/:sessionId", requireAuth, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.sessionId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid session ID"
    });
  }

  try {
    const entry = await Waitlist.findOneAndUpdate(
      {
        member: req.user._id,
        session: req.params.sessionId,
        status: "waiting"
      },
      { $set: { status: "cancelled" } },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Active waitlist entry not found"
      });
    }

    res.json({ success: true, message: "Removed from waitlist" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
