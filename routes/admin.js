const express = require("express");
const { body, validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const { requireAuth, allowRoles } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/checkin",
  requireAuth,
  allowRoles("admin"),
  [
    body("code")
      .isString().withMessage("Check-in code must be text")
      .bail()
      .trim()
      .isLength({ min: 6, max: 12 })
      .withMessage("Provide a valid check-in code")
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
      const code = req.body.code.toUpperCase();
      const booking = await Booking.findOne({
        checkInCode: code,
        status: "confirmed"
      })
        .populate("session", "startsAt")
        .populate("member", "name email");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Code not found or already used"
        });
      }

      if (!booking.session || !booking.member) {
        return res.status(404).json({
          success: false,
          message: "The session or member for this code no longer exists"
        });
      }

      const sessionStartsAt = booking.session.startsAt.getTime();
      const now = Date.now();
      const sessionEndsAt = sessionStartsAt + 60 * 60 * 1000;
      if (now < sessionStartsAt || now >= sessionEndsAt) {
        return res.status(409).json({
          success: false,
          message: "Code only works during the session hour"
        });
      }

      const checkedInBooking = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "confirmed", checkInCode: code },
        {
          $set: {
            status: "checkedIn",
            checkedInAt: new Date(),
            checkedInBy: req.user._id
          }
        },
        { new: true }
      );

      if (!checkedInBooking) {
        return res.status(409).json({
          success: false,
          message: "This code has already been used"
        });
      }

      res.json({
        success: true,
        message: `${booking.member.name} marked present`,
        member: booking.member,
        checkedInAt: checkedInBooking.checkedInAt
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
