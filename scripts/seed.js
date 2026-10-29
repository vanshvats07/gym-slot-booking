require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const connectDB = require("../config/db");
const User = require("../models/User");
const Session = require("../models/Session");
const Booking = require("../models/Booking");
const { createCheckInCode } = require("../utils/check-in-code");

function getFutureIndiaTime(daysAhead, hour) {
  const todayInIndia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const [year, month, day] = todayInIndia.split("-").map(Number);

  const utcTime = Date.UTC(year, month - 1, day + daysAhead, hour) - 330 * 60 * 1000;
  return new Date(utcTime);
}

async function getOrCreateSeedAccount(name, email, role, password) {
  let user = await User.findOne({ email });

  if (user) {
    if (user.name !== name || user.role !== role) {
      user.name = name;
      user.role = role;
      await user.save();
    }
    return user;
  }

  if (!password) {
    throw new Error(`Set the password for ${email} in .env before running the seed script.`);
  }
  if (Buffer.byteLength(password, "utf8") < 8 ||
      Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(`The password for ${email} must be 8 to 72 bytes long.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({ name, email, role, passwordHash });
}

async function getOrCreateExtraMember(number) {
  const email = `fullmember${String(number).padStart(2, "0")}@gym.local`;
  let user = await User.findOne({ email });

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    user = await User.create({
      name: `Seed Member ${number}`,
      email,
      role: "member",
      passwordHash
    });
  }

  return user;
}

async function getOrCreateSession(startsAt, createdBy) {
  let session = await Session.findOne({ startsAt });

  if (!session) {
    session = await Session.create({
      startsAt,
      capacity: 20,
      bookedCount: 0,
      createdBy
    });
  }

  return session;
}

async function addBookingIfThereIsRoom(member, session) {
  const transaction = await mongoose.startSession();

  try {
    await transaction.withTransaction(async () => {
      const currentBooking = await Booking.findOne({
        member: member._id,
        session: session._id
      }).session(transaction);

      if (currentBooking && ["confirmed", "checkedIn"].includes(currentBooking.status)) {
        return;
      }

      const availableSeat = await Session.findOneAndUpdate(
        {
          _id: session._id,
          startsAt: { $gt: new Date() },
          $expr: { $lt: ["$bookedCount", "$capacity"] }
        },
        { $inc: { bookedCount: 1 } },
        { new: true, session: transaction }
      );

      if (!availableSeat) return;

      const checkInCode = createCheckInCode();
      if (currentBooking) {
        currentBooking.status = "confirmed";
        currentBooking.checkInCode = checkInCode;
        currentBooking.checkedInAt = undefined;
        currentBooking.checkedInBy = undefined;
        await currentBooking.save({ session: transaction });
        return;
      }

      await Booking.create(
        [{
          member: member._id,
          session: session._id,
          status: "confirmed",
          checkInCode
        }],
        { session: transaction }
      );
    });
  } finally {
    await transaction.endSession();
  }
}

async function seed() {
  await connectDB();

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@gym.local").toLowerCase();
  const memberEmail = (process.env.SEED_MEMBER_EMAIL || "member@gym.local").toLowerCase();
  if (adminEmail === memberEmail) {
    throw new Error("Admin and member seed accounts must use different email addresses.");
  }
  const admin = await getOrCreateSeedAccount(
    "Gym Admin",
    adminEmail,
    "admin",
    process.env.SEED_ADMIN_PASSWORD
  );
  const member = await getOrCreateSeedAccount(
    "Demo Member",
    memberEmail,
    "member",
    process.env.SEED_MEMBER_PASSWORD
  );

  const sessionTimes = [
    getFutureIndiaTime(1, 8),
    getFutureIndiaTime(1, 10),
    getFutureIndiaTime(2, 9),
    getFutureIndiaTime(3, 18)
  ];
  const sessions = [];

  for (const startsAt of sessionTimes) {
    const session = await getOrCreateSession(startsAt, admin._id);
    sessions.push(session);
  }

  for (let number = 1; number <= 20; number += 1) {
    const extraMember = await getOrCreateExtraMember(number);
    await addBookingIfThereIsRoom(extraMember, sessions[0]);
  }

  await addBookingIfThereIsRoom(member, sessions[1]);

  console.log("Seed complete.");
  console.log("Demo sessions and accounts are ready. Change demo passwords before public deployment.");
}

seed()
  .catch(error => {
    console.error("Seeding failed:", error.name || "Error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
