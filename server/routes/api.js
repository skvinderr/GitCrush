const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { syncGithubProfile } = require("../services/githubSync");
const prisma = new PrismaClient();

// Session-based auth guard — no longer uses passport
const isAuthenticated = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    // Attach the user to req so route handlers can use req.user
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Auth check failed" });
  }
};

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

// POST /api/regenerate-bio — re-generate the AI bio (max 5 times)
router.post("/regenerate-bio", isAuthenticated, async (req, res) => {
  const { generateAiBio } = require("../services/bioGenerator");
  const user = req.user;
  const MAX_REGENS = 5;

  if (user.bioRegenerations >= MAX_REGENS) {
    return res.status(429).json({ error: `Maximum ${MAX_REGENS} regenerations reached` });
  }

  try {
    const newBio = await generateAiBio({
      username: user.username,
      languages: user.languages || [],
      personalityType: user.personalityType,
      commitPattern: user.commitPattern,
      repos: user.repos,
      totalStars: user.totalStars,
      longestStreak: user.longestStreak,
      redFlags: user.redFlags || [],
      pinnedRepos: [],
    });

    if (!newBio) return res.status(503).json({ error: "AI service unavailable — check GROQ_API_KEY" });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { aiBio: newBio, bioRegenerations: { increment: 1 } },
    });
    res.json(updated);
  } catch (err) {
    console.error("Regen error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/me/bio — save a custom manually-written bio
router.put("/me/bio", isAuthenticated, async (req, res) => {
  const { customBio } = req.body;
  if (typeof customBio !== "string") return res.status(400).json({ error: "customBio required" });

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { customBio: customBio.trim().slice(0, 500) },
  });
  res.json(updated);
});

module.exports = router;
