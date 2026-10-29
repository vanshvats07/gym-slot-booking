const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };
}

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  const details = errors.array().map(error => ({
    field: error.path,
    message: error.msg
  }));
  res.status(422).json({
    success: false,
    message: "Validation failed",
    errors: details
  });
  return true;
}

const validateName = body("name")
  .isString().withMessage("Name must be text")
  .bail()
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage("Name must contain 2 to 80 characters");

const validateEmail = body("email")
  .isString().withMessage("Email must be text")
  .bail()
  .trim()
  .isEmail({ ignore_max_length: true }).withMessage("Enter a valid email")
  .bail()
  .isByteLength({ max: 254 })
  .withMessage("Email must be no more than 254 bytes")
  .toLowerCase();

const validatePassword = body("password")
  .isString().withMessage("Password must be text")
  .bail()
  .isLength({ min: 8 })
  .withMessage("Password must contain at least 8 characters")
  .bail()
  .custom(password => Buffer.byteLength(password, "utf8") <= 72)
  .withMessage("Password must be no more than 72 bytes");

router.post(
  "/register",
  [validateName, validateEmail, validatePassword],
  async (req, res, next) => {
    if (sendValidationErrors(req, res)) return;

    try {
      const { name, email, password } = req.body;
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create({ name, email, passwordHash });
      res.status(201).json({
        success: true,
        message: "Account created successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered"
        });
      }
      next(error);
    }
  }
);

router.post(
  "/login",
  [
    validateEmail,
    body("password")
      .isString().withMessage("Password must be text")
      .bail()
      .notEmpty().withMessage("Password is required")
      .bail()
      .custom(password => Buffer.byteLength(password, "utf8") <= 72)
      .withMessage("Password is invalid")
  ],
  async (req, res, next) => {
    if (sendValidationErrors(req, res)) return;

    try {
      const user = await User.findOne({ email: req.body.email })
        .select("+passwordHash");

      if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const token = jwt.sign(
        { sub: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );

      res.cookie("gymToken", token, getCookieOptions());
      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/logout", (req, res) => {
  res.clearCookie("gymToken", getCookieOptions());
  res.json({ success: true, message: "Logged out successfully" });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
