const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "checkedIn"],
      default: "confirmed"
    },
    checkInCode: {
      type: String,
      unique: true,
      sparse: true
    },
    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

bookingSchema.index({ member: 1, session: 1 }, { unique: true });
module.exports = mongoose.model("Booking", bookingSchema);
