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

// GET /api/discover — fetch potential matches (exclude self and already swiped)
router.get("/discover", isAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { computeCompatibility } = require("../services/compatibilityEngine");

    // Get IDs of users already swiped on
    const pastSwipes = await prisma.swipe.findMany({
      where: { swiperId: currentUserId },
      select: { targetUserId: true },
    });
    const swipedIds = pastSwipes.map(s => s.targetUserId);
    swipedIds.push(currentUserId); // Exclude self too

    // Extract query filters
    const intentQuery = req.query.intent ? req.query.intent.split(',') : null;
    const langsQuery = req.query.langs ? req.query.langs.split(',') : null;
    const expQuery = req.query.exp || 'Any'; // Junior, Mid, Senior, Any

    // Fetch batch of fresh users (we over-fetch to 50 to allow post-db filtering)
    let users = await prisma.user.findMany({
      where: { 
        id: { notIn: swipedIds },
        ...(intentQuery && { intent: { hasSome: intentQuery } }) // Prisma Mongo array check
      },
      take: 50,
    });

    // ── Post-DB Filtering (for JSON languages and experience scores) ──
    if (langsQuery && langsQuery.length > 0) {
      users = users.filter(u => {
        if (!u.languages) return false;
        const userLangs = u.languages.map(l => l.lang.toLowerCase());
        return langsQuery.some(ql => userLangs.includes(ql.toLowerCase()));
      });
    }

    if (expQuery === 'Junior') users = users.filter(u => u.experienceScore <= 3);
    else if (expQuery === 'Mid') users = users.filter(u => u.experienceScore > 3 && u.experienceScore <= 7);
    else if (expQuery === 'Senior') users = users.filter(u => u.experienceScore > 7);

    // Limit to 20 after filtering
    users = users.slice(0, 20);

    // Compute compatibility scores for all returned users on the fly
    const scoredUsers = users.map(u => {
      const { score, explanation } = computeCompatibility(req.user, u);
      return { ...u, matchScore: score, matchReason: explanation };
    });

    // Sort by compatibility DESC
    scoredUsers.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scoredUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load discover feed" });
  }
});

// POST /api/swipe — record a swipe and check for mutual match
router.post("/swipe", isAuthenticated, async (req, res) => {
  try {
    const swiperId = req.user.id;
    const { targetUserId, direction } = req.body; // 'left', 'right', 'super'

    if (!targetUserId || !direction) return res.status(400).json({ error: "Missing parameters" });

    // Save the new swipe
    const swipe = await prisma.swipe.create({
      data: { swiperId, targetUserId, direction }
    });

    // Check if it's a mutual crush
    let isMatch = false;
    if (direction === 'right' || direction === 'super') {
      const mutualSwipe = await prisma.swipe.findUnique({
        where: { swiperId_targetUserId: { swiperId: targetUserId, targetUserId: swiperId } }
      });

      if (mutualSwipe && (mutualSwipe.direction === 'right' || mutualSwipe.direction === 'super')) {
        isMatch = true;
        // Mark both as mutual match
        await prisma.swipe.updateMany({
          where: {
            OR: [
              { swiperId, targetUserId },
              { swiperId: targetUserId, targetUserId: swiperId }
            ]
          },
          data: { isMutualMatch: true }
        });
      }
    }

    res.json({ success: true, isMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record swipe" });
  }
});

// GET /api/compatibility/:otherUserId — Compute or fetch cached score
router.get("/compatibility/:otherUserId", isAuthenticated, async (req, res) => {
  const { computeCompatibility } = require("../services/compatibilityEngine");
  const currentUserId = req.user.id;
  const otherUserId = req.params.otherUserId;

  if (currentUserId === otherUserId) {
    return res.status(400).json({ error: "Cannot compare with yourself" });
  }

  try {
    // Determine deterministic ordering for userA and userB to prevent duplicate cache entries
    const [userAId, userBId] = [currentUserId, otherUserId].sort();

    // 1. Check cache
    const cacheResult = await prisma.compatibilityCache.findUnique({
      where: {
        userAId_userBId: { userAId, userBId }
      }
    });

    if (cacheResult) {
      return res.json({ score: cacheResult.score, explanation: cacheResult.explanation, fromCache: true });
    }

    // 2. Not in cache, fetch the users
    const [userA, userB] = await Promise.all([
      prisma.user.findUnique({ where: { id: userAId } }),
      prisma.user.findUnique({ where: { id: userBId } })
    ]);

    if (!userA || !userB) return res.status(404).json({ error: "User not found" });

    // 3. Compute metrics
    const { score, explanation } = computeCompatibility(userA, userB);

    // 4. Cache and return
    const newCache = await prisma.compatibilityCache.create({
      data: {
        userAId,
        userBId,
        score,
        explanation
      }
    });

    res.json({ score: newCache.score, explanation: newCache.explanation, fromCache: false });
  } catch (err) {
    console.error("Compatibility check failed:", err);
    res.status(500).json({ error: "Failed to compute compatibility" });
  }
});

module.exports = router;
