const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

function getCookie(req, cookieName) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  for (const cookie of cookies.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();
    if (name !== cookieName) continue;

    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

function redirectAdminPageIfNeeded(req, res, destination) {
  if (req.path !== "/admin.html") return false;

  res.redirect(destination);
  return true;
}

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  let token = getCookie(req, "gymToken");

  if (authorization && authorization.startsWith("Bearer ")) {
    token = authorization.slice(7).trim();
  }

  if (!token) {
    if (redirectAdminPageIfNeeded(req, res, "/index.html?auth=required")) return;
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload || typeof payload.sub !== "string" ||
        !mongoose.isValidObjectId(payload.sub)) {
      if (redirectAdminPageIfNeeded(req, res, "/index.html?auth=required")) return;
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      if (redirectAdminPageIfNeeded(req, res, "/index.html?auth=required")) return;
      return res.status(401).json({
        success: false,
        message: "User no longer exists"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    const tokenErrors = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"];
    if (tokenErrors.includes(error.name)) {
      if (redirectAdminPageIfNeeded(req, res, "/index.html?auth=required")) return;
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    next(error);
  }
}

function allowRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      if (redirectAdminPageIfNeeded(req, res, "/sessions.html?auth=forbidden")) {
        return;
      }
      return res.status(403).json({
        success: false,
        message: "You do not have permission"
      });
    }

    next();
  };
}

module.exports = { requireAuth, allowRoles };
