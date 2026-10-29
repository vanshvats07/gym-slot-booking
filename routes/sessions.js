const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Session = require("../models/Session");
const Booking = require("../models/Booking");
const Waitlist = require("../models/Waitlist");
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
  startsOnIndiaHour,
  isRealCalendarDate,
  hasExplicitTimezone
} = require("../utils/session-time");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.date !== undefined) {
      const requestedDate = req.query.date;
      const validFormat = typeof requestedDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);

      if (!validFormat) {
        return res.status(422).json({
          success: false,
          message: "Date must use YYYY-MM-DD"
        });
      }

      if (!isRealCalendarDate(requestedDate)) {
        return res.status(422).json({
          success: false,
          message: "Enter a real calendar date"
        });
      }

      const start = new Date(`${requestedDate}T00:00:00+05:30`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      filter.startsAt = { $gte: start, $lt: end };
    } else {
      filter.startsAt = { $gte: new Date(Date.now() - 60 * 60 * 1000) };
    }

    const sessions = await Session.find(filter).sort({ startsAt: 1 }).lean();
    const sessionsWithSeats = sessions.map(session => ({
      ...session,
      seatsRemaining: Math.max(0, session.capacity - session.bookedCount)
    }));

    res.json({ success: true, sessions: sessionsWithSeats });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  allowRoles("admin"),
  [
    body("startsAt")
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage("Provide startsAt as an ISO date/time")
      .bail()
      .custom(hasExplicitTimezone)
      .withMessage("Provide a timezone for startsAt")
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }));
      return res.status(422).json({
        success: false,
        message: "Invalid input",
        errors: details
      });
    }

    try {
      const startsAt = new Date(req.body.startsAt);
      if (!startsOnIndiaHour(startsAt)) {
        return res.status(422).json({
          success: false,
          message: "Sessions must start on the hour (India time)"
        });
      }

      if (startsAt <= new Date()) {
        return res.status(422).json({
          success: false,
          message: "Session must be in the future"
        });
      }

      const session = await Session.create({
        startsAt,
        capacity: 20,
        createdBy: req.user._id
      });

      res.status(201).json({
        success: true,
        message: "Session created",
        session
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A session already exists at that start time"
        });
      }
      next(error);
    }
  }
);

router.get("/:id/bookings", requireAuth, allowRoles("admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const bookings = await Booking.find({ session: session._id })
      .populate("member", "name email")
      .sort({ createdAt: 1 });
    const waitlist = await Waitlist.find({
      session: session._id,
      status: "waiting"
    })
      .populate("member", "name email")
      .sort({ joinedAt: 1 });

    res.json({ success: true, bookings, waitlist });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
