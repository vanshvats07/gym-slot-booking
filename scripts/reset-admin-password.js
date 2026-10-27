require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function resetAdminPassword() {
  const password = process.env.ADMIN_RESET_PASSWORD;

  if (!password) {
    throw new Error("Set ADMIN_RESET_PASSWORD in .env before running this command.");
  }

  const passwordLength = Buffer.byteLength(password, "utf8");
  if (passwordLength < 8 || passwordLength > 72) {
    throw new Error("ADMIN_RESET_PASSWORD must be 8 to 72 bytes long.");
  }

  await connectDB();

  const admin = await User.findOne({
    email: "admin@gym.local",
    role: "admin"
  });

  if (!admin) {
    throw new Error("The admin@gym.local account was not found.");
  }

  admin.passwordHash = await bcrypt.hash(password, 12);
  await admin.save();
}

resetAdminPassword()
  .then(() => {
    console.log("Admin password reset successfully. Remove ADMIN_RESET_PASSWORD from .env.");
  })
  .catch(error => {
    console.error(error.message || "Could not reset the admin password.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
