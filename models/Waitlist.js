const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
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
      enum: ["waiting", "promoted", "cancelled"],
      default: "waiting"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

waitlistSchema.index({ member: 1, session: 1 }, { unique: true });
waitlistSchema.index({ session: 1, status: 1, joinedAt: 1 });
module.exports = mongoose.model("Waitlist", waitlistSchema);
