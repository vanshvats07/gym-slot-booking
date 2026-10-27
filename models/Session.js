const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    startsAt: {
      type: Date,
      required: true,
      unique: true,
      index: true
    },
    capacity: {
      type: Number,
      default: 20,
      min: 20,
      max: 20
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 20
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
