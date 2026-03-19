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

        // Insert into Match Table
        const { computeCompatibility } = require("../services/compatibilityEngine");
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }});
        const { score, explanation } = computeCompatibility(req.user, targetUser);

        const uid1 = swiperId < targetUserId ? swiperId : targetUserId;
        const uid2 = swiperId < targetUserId ? targetUserId : swiperId;

        await prisma.match.upsert({
          where: { user1Id_user2Id: { user1Id: uid1, user2Id: uid2 } },
          update: {},
          create: {
            user1Id: uid1,
            user2Id: uid2,
            compatibilityScore: score,
            compatExplanation: explanation
          }
        });
      }
    }

    res.json({ success: true, isMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record swipe" });
  }
});

// GET /api/matches — fetch all mutual matches for the user
router.get("/matches", isAuthenticated, async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [ { user1Id: req.user.id }, { user2Id: req.user.id } ]
      },
      include: {
        user1: true,
        user2: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = matches.map(m => {
      const isUser1 = m.user1Id === req.user.id;
      const matchProfile = isUser1 ? m.user2 : m.user1;
      delete matchProfile.accessToken; // secure
      return {
        id: m.id,
        compatibilityScore: m.compatibilityScore,
        compatExplanation: m.compatExplanation,
        createdAt: m.createdAt,
        dateRepoUrl: m.dateRepoUrl,
        profile: matchProfile
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// DELETE /api/matches/:id — unmatch a user (Close PR)
router.delete("/matches/:id", isAuthenticated, async (req, res) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.user1Id !== req.user.id && match.user2Id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.match.delete({ where: { id: req.params.id } });
    
    // Optional: We can leave the `Swipe` table intact to ensure they don't see each other again.
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete match" });
  }
});

// GET /api/messages/:matchId — fetch all messages for a match, injecting icebreaker if empty
router.get("/messages/:matchId", isAuthenticated, async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.user1Id !== req.user.id && match.user2Id !== req.user.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    let messages = await prisma.message.findMany({
      where: { matchId },
      include: { sender: true },
      orderBy: { createdAt: "asc" }
    });

    // Auto-Icebreaker system message and Challenge
    if (messages.length === 0) {
      const icebreakers = [
        "What's a technology you hate but use every day?",
        "Tabs or spaces?",
        "What's your most embarrassing commit message?",
        "Monorepo or polyrepo? Fight me.",
        "What's the worst variable name you've written in production?"
      ];
      const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];
      
      const sysMsg = await prisma.message.create({
        data: {
          matchId,
          senderId: req.user.id,
          content: `You just matched! Here's an icebreaker: ${randomIcebreaker}`,
          type: "system",
        },
        include: { sender: true }
      });
      messages = [sysMsg];

      // Also spawn a Challenge
      try {
         const challenge = await prisma.challenge.create({
            data: {
               matchId,
               promptId: Math.floor(Math.random() * 10) // 0 to 9
            }
         });
         const cxMsg = await prisma.message.create({
            data: {
               matchId,
               senderId: req.user.id,
               content: challenge.id,
               type: "challenge"
            },
            include: { sender: true }
         });
         messages.push(cxMsg);
      } catch (err) {
         console.error("Error creating challenge:", err);
      }
    }

    // Strip out sensitive info from sender objects
    const safeMessages = messages.map(m => {
      delete m.sender.accessToken;
      return m;
    });

    res.json(safeMessages);
  } catch (err) {
    console.error("Failed to fetch messages", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// GET /api/challenges/:matchId — fetch the challenge state
router.get("/challenges/:matchId", isAuthenticated, async (req, res) => {
   try {
      const { matchId } = req.params;
      const challenge = await prisma.challenge.findUnique({ where: { matchId } });
      if (!challenge) return res.status(404).json({ error: "Challenge not found" });

      // Identify who is user1 vs user2 conceptually in this match
      const match = await prisma.match.findUnique({ where: { id: matchId }});
      if (match.user1Id !== req.user.id && match.user2Id !== req.user.id) {
         return res.status(403).json({ error: "Unauthorized" });
      }

      const isUser1 = match.user1Id === req.user.id;
      
      // If not fully revealed, obscure the other person's code
      let safeChallenge = { ...challenge };
      if (!challenge.revealedAt) {
         if (isUser1) {
            safeChallenge.user2Solution = challenge.user2Solution ? "HIDDEN" : null;
            safeChallenge.user2Language = challenge.user2Language ? "HIDDEN" : null;
         } else {
            safeChallenge.user1Solution = challenge.user1Solution ? "HIDDEN" : null;
            safeChallenge.user1Language = challenge.user1Language ? "HIDDEN" : null;
         }
      }
      res.json(safeChallenge);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch challenge" });
   }
});

// POST /api/challenges/:matchId/submit — submit a solution
router.post("/challenges/:matchId/submit", isAuthenticated, async (req, res) => {
   try {
      const { matchId } = req.params;
      const { code, language } = req.body;
      
      const challenge = await prisma.challenge.findUnique({ where: { matchId } });
      const match = await prisma.match.findUnique({ where: { id: matchId }});
      if (!challenge || !match) return res.status(404).json({ error: "Not found" });

      const isUser1 = match.user1Id === req.user.id;
      
      const updateData = {};
      if (isUser1 && !challenge.user1SubmittedAt) {
         updateData.user1Solution = code;
         updateData.user1Language = language;
         updateData.user1SubmittedAt = new Date();
      } else if (!isUser1 && !challenge.user2SubmittedAt) {
         updateData.user2Solution = code;
         updateData.user2Language = language;
         updateData.user2SubmittedAt = new Date();
      } else {
         return res.status(400).json({ error: "Already submitted" });
      }

      // Check if this makes both submitted
      const willBeRevealed = (isUser1 && challenge.user2SubmittedAt) || (!isUser1 && challenge.user1SubmittedAt);
      if (willBeRevealed) {
         updateData.revealedAt = new Date();
      }

      const updated = await prisma.challenge.update({
         where: { matchId },
         data: updateData
      });

      res.json(updated);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit challenge" });
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
