const express = require("express");
const router = express.Router();

// Auth guard middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Not authenticated" });
};

const { syncGithubProfile } = require("../services/githubSync");

// GET /api/me — return current user
router.get("/me", isAuthenticated, (req, res) => {
  res.json(req.user);
});

// POST /api/sync-profile — trigger GitHub metric extraction
router.post("/sync-profile", isAuthenticated, async (req, res) => {
  try {
    const updatedUser = await syncGithubProfile(req.user.id);
    res.json(updatedUser);
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync profile" });
  }
});

module.exports = router;
