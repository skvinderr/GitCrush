const express = require("express");
const router = express.Router();

// Auth guard middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Not authenticated" });
};

// GET /api/me — return current user
router.get("/me", isAuthenticated, (req, res) => {
  res.json(req.user);
});

module.exports = router;
