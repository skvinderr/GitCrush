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
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const crushes = await prisma.swipe.count({
      where: { targetUserId: req.user.id, direction: { in: ["right", "super"] } }
    });
    const matchesCount = await prisma.match.count({
      where: { OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }] }
    });
    
    // Add stats to the response directly
    res.json({
      ...req.user,
      stats: {
        crushesReceived: crushes,
        totalMatches: matchesCount,
        matchRate: crushes > 0 ? (matchesCount / crushes * 100).toFixed(1) : 0
      }
    });
  } catch(err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
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

// PATCH /api/me — update user profile fields
router.patch("/me", isAuthenticated, async (req, res) => {
  try {
    const allowedFields = ['customBio', 'hideHeatmap', 'hideStats', 'intent', 'lookingFor', 'location', 'age', 'isHidden'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields provided" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
});

// PATCH /api/me/repo-visibility — toggle repo visibility
router.patch("/me/repo-visibility", isAuthenticated, async (req, res) => {
  try {
    const { repoId, hidden } = req.body;
    if (!repoId || hidden === undefined) {
      return res.status(400).json({ error: "repoId and hidden are required" });
    }

    // Assuming user.repos is an array of objects
    const currentRepos = req.user.repos || [];
    const updatedRepos = currentRepos.map(repo => {
      // Sometimes repo.id is number, sometimes string, comparing as string is safer
      if (repo.id.toString() === repoId.toString() || repo.name === repoId) {
        return { ...repo, hidden };
      }
      return repo;
    });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { repos: updatedRepos },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update repo visibility" });
  }
});

// DELETE /api/me — delete user account
router.delete("/me", isAuthenticated, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.id },
    });
    req.session.destroy();
    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
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
      orderBy: { createdAt: 'desc' } // Grab the newest users (including newly crawled ghosts)
    });

    // ── Post-DB Filtering (for JSON languages and experience scores) ──
    if (langsQuery && langsQuery.length > 0) {
      users = users.filter(u => {
        if (!u.languages) return false;
        let userLangs = [];
        if (Array.isArray(u.languages)) {
          userLangs = u.languages.map(l => (typeof l === 'object' ? l.lang : l).toLowerCase());
        } else if (typeof u.languages === 'object') {
          userLangs = Object.keys(u.languages).map(l => l.toLowerCase());
        }
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

    // Sort by compatibility DESC, but push real users to the top
    scoredUsers.sort((a, b) => {
      // Real users (isGhost: false or null) come before ghost users
      const aIsReal = !a.isGhost;
      const bIsReal = !b.isGhost;
      
      if (aIsReal && !bIsReal) return -1;
      if (!aIsReal && bIsReal) return 1;

      // Make compatibility matter more within the group
      return b.matchScore - a.matchScore;
    });

    res.json(scoredUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load discover feed" });
  }
});

// GET /api/trending-active — Fetch 10 ghost profiles recently active 
router.get("/trending-active", isAuthenticated, async (req, res) => {
  try {
    const activeDevs = await prisma.user.findMany({
      where: {
        isGhost: true,
        lastActiveAt: { not: null }
      },
      take: 10,
      orderBy: { lastActiveAt: 'desc' }
    });
    res.json(activeDevs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trending active devs" });
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

// DELETE /api/swipes/last — undo the most recent swipe
router.delete("/swipes/last", isAuthenticated, async (req, res) => {
  try {
    const swiperId = req.user.id;

    // Find the most recent swipe by this user
    const lastSwipe = await prisma.swipe.findFirst({
      where: { swiperId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastSwipe) {
      return res.status(404).json({ error: "No swipe found to undo" });
    }

    // If it was a mutual match, we need to carefully rollback the Match and the other user's swipe flag
    if (lastSwipe.isMutualMatch) {
      // 1. Identify uid1 and uid2 for the Match table
      const uid1 = swiperId < lastSwipe.targetUserId ? swiperId : lastSwipe.targetUserId;
      const uid2 = swiperId < lastSwipe.targetUserId ? lastSwipe.targetUserId : swiperId;

      // 2. Delete the Match
      await prisma.match.deleteMany({
        where: { user1Id: uid1, user2Id: uid2 },
      });

      // 3. Update the other user's swipe to no longer be a mutual match
      await prisma.swipe.updateMany({
        where: { swiperId: lastSwipe.targetUserId, targetUserId: swiperId },
        data: { isMutualMatch: false }
      });
    }

    // Delete the swipe itself
    await prisma.swipe.delete({
      where: { id: lastSwipe.id }
    });

    res.json({ success: true, targetUserId: lastSwipe.targetUserId });
  } catch (err) {
    console.error("Undo swipe error:", err);
    res.status(500).json({ error: "Failed to undo swipe" });
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

// POST /api/matches/:id/date-repo-invite — Initiates a date repo collaboration
router.post("/matches/:id/date-repo-invite", isAuthenticated, async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    
    if (!match || (match.user1Id !== req.user.id && match.user2Id !== req.user.id)) return res.status(403).json({ error: "Unauthorized" });
    if (match.dateRepoUrl) return res.status(400).json({ error: "Date repo already exists" });

    const inviteMsg = await prisma.message.create({
      data: {
        matchId,
        senderId: req.user.id,
        content: "I'd love to collaborate on a Date Repo with you! Accept to generate our shared GitHub sandbox.",
        type: "repo_invite"
      },
      include: { sender: true }
    });
    
    res.json(inviteMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send invite" });
  }
});

// POST /api/matches/:id/date-repo-accept — Accepts a date repo and hits GitHub API
router.post("/matches/:id/date-repo-accept", isAuthenticated, async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: { user1: true, user2: true } });
    
    if (!match || (match.user1Id !== req.user.id && match.user2Id !== req.user.id)) return res.status(403).json({ error: "Unauthorized" });
    if (match.dateRepoUrl) return res.status(400).json({ error: "Date repo already exists" });

    // The user accepting is req.user. The other user is the initiator.
    const acceptor = match.user1Id === req.user.id ? match.user1 : match.user2;
    const initiator = match.user1Id === req.user.id ? match.user2 : match.user1;

    // GitHub API requires the acceptor's token if we are creating the repo on their account
    if (!acceptor.accessToken) return res.status(400).json({ error: "Acceptor missing GitHub token. Please re-login to update scopes." });

    const repoName = `gitcrush-${initiator.username.toLowerCase()}-${acceptor.username.toLowerCase()}-${matchId.slice(-4)}`;

    // 1. Create the repository
    const axios = require("axios");
    const repoRes = await axios.post("https://api.github.com/user/repos", {
      name: repoName,
      private: true,
      description: "A shared sandbox created on GitCrush"
    }, {
      headers: {
        Authorization: `Bearer ${acceptor.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitCrush/1.0",
      }
    });

    const repoUrl = repoRes.data.html_url;

    // 2. Add initiator as collaborator
    try {
      await axios.put(`https://api.github.com/repos/${acceptor.username}/${repoName}/collaborators/${initiator.username}`, {}, {
        headers: {
          Authorization: `Bearer ${acceptor.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitCrush/1.0",
        }
      });
    } catch (collErr) {
       console.error("Collaborator invite failed (perhaps they already have access or username is invalid)", collErr.message);
    }

    // 3. Commit README
    const readmeContent = `# 🌐 ${repoName}\n\n> A shared space created on GitCrush — ${new Date().toLocaleDateString()}\n\n## About this repo\n\nThis is our collaboration sandbox. Use it however you want:\n- Build something together\n- Share code snippets\n- Leave each other notes in commits\n- Start that side project you've both been putting off\n\n## First commit challenge\nEach of us commits one file: a function we're proud of. No context needed.`;

    try {
      await axios.put(`https://api.github.com/repos/${acceptor.username}/${repoName}/contents/README.md`, {
        message: "Initial commit by GitCrush",
        content: Buffer.from(readmeContent).toString("base64")
      }, {
        headers: {
          Authorization: `Bearer ${acceptor.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitCrush/1.0",
        }
      });
    } catch (readmeErr) {
      console.error("Readme init failed", readmeErr.message);
    }

    // Save in DB
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: { dateRepoUrl: repoUrl }
    });

    // Spawn system message
    const sysMsg = await prisma.message.create({
      data: {
        matchId,
        senderId: req.user.id,
        content: `Your date repo is live! 🚀 ${repoUrl}`,
        type: "system"
      },
      include: { sender: true }
    });

    res.json({ match: updatedMatch, sysMsg });
  } catch (err) {
    console.error("GitHub API error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to orchestrate Date Repo on GitHub. Check your permissions." });
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

// ─── CONFESSIONS ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/confessions — Fetch paginated feed
router.get("/confessions", isAuthenticated, async (req, res) => {
  try {
    const { sort = "top", page = "1" } = req.query;
    const skip = (parseInt(page) - 1) * 20;

    // Build common where clause (hide reported posts)
    const where = { reports: { lt: 5 } };

    let confessions = await prisma.confession.findMany({
      where,
      include: {
        user: {
          select: { username: true, avatarUrl: true }
        }
      },
      take: 20,
      skip,
      orderBy: { createdAt: 'desc' } // Always fetch descending first for New
    });

    // Check if we need to SEED initial data for an empty database
    if (confessions.length === 0 && page === "1" && sort === "top") {
       const starterConfessions = [
         "I've been using the same Stack Overflow answer for JWT auth for 5 years and I still don't understand JWTs.",
         "My production database has a column called 'thing2' because I ran out of ideas at 2am.",
         "I've never written a unit test voluntarily. I only write them when someone is watching.",
         "I once blamed a bug on 'cosmic rays' in a team standup. It was my code.",
         "My entire side project is just a landing page and a fake waitlist. It's been 'in development' for 3 years.",
         "I copy-paste my own old code and then Google why it works."
       ];
       
       for (const text of starterConfessions) {
         await prisma.confession.create({
           data: {
             userId: req.user.id, // Auth user is the sacrificial seeder
             text,
             isAnonymous: true,
             reactions: { "💀": [], "🔥": [], "👀": [], "✅": [], "🚀": [] }
           }
         });
       }
       
       // Refetch newly seeded
       confessions = await prisma.confession.findMany({
         where,
         include: { user: { select: { username: true, avatarUrl: true } } },
         take: 20,
         skip,
         orderBy: { createdAt: 'desc' }
       });
    }

    // Anonymize before sending
    confessions = confessions.map(c => {
      if (c.isAnonymous) {
        c.user = { username: "Anonymous Developer", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=" + c.id };
      }
      return c;
    });

    // If sort is 'top', we sort by total reactions.
    if (sort === "top") {
      confessions.sort((a, b) => {
        const aReactions = a.reactions ? Object.values(a.reactions).flat().length : 0;
        const bReactions = b.reactions ? Object.values(b.reactions).flat().length : 0;
        if (bReactions !== aReactions) return bReactions - aReactions;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    res.json(confessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch confessions" });
  }
});

// POST /api/confessions — Create a confession
router.post("/confessions", isAuthenticated, async (req, res) => {
  try {
    const { text, isAnonymous } = req.body;
    
    if (!text || text.length < 20 || text.length > 280) {
      return res.status(400).json({ error: "Confession must be between 20 and 280 characters" });
    }

    const confession = await prisma.confession.create({
      data: {
        userId: req.user.id,
        text,
        isAnonymous: Boolean(isAnonymous),
        reactions: { "💀": [], "🔥": [], "👀": [], "✅": [], "🚀": [] }
      }
    });

    res.json(confession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post confession" });
  }
});

// POST /api/confessions/:id/react — Toggle a reaction
router.post("/confessions/:id/react", isAuthenticated, async (req, res) => {
  try {
    const { emoji } = req.body;
    const confessionId = req.params.id;
    const userId = req.user.id;

    if (!["💀", "🔥", "👀", "✅", "🚀"].includes(emoji)) {
      return res.status(400).json({ error: "Invalid reaction" });
    }

    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession) return res.status(404).json({ error: "Confession not found" });

    let reactions = confession.reactions || { "💀": [], "🔥": [], "👀": [], "✅": [], "🚀": [] };
    if (!reactions[emoji]) reactions[emoji] = [];

    // Toggle logic
    const hasReacted = reactions[emoji].includes(userId);
    if (hasReacted) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
    } else {
      reactions[emoji].push(userId);
    }

    const updated = await prisma.confession.update({
      where: { id: confessionId },
      data: { reactions }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to react" });
  }
});

// POST /api/confessions/:id/report — Report a confession
router.post("/confessions/:id/report", isAuthenticated, async (req, res) => {
  try {
    const confessionId = req.params.id;
    
    const updated = await prisma.confession.update({
      where: { id: confessionId },
      data: {
        reports: { increment: 1 }
      }
    });

    res.json({ success: true, reports: updated.reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to report" });
  }
});

// ─── LEADERBOARD & HALL OF MERGES ENDPOINTS ──────────────────────────────────────

// GET /api/leaderboard — Fetch top community members
router.get("/leaderboard", isAuthenticated, async (req, res) => {
  try {
    const { type } = req.query; // 'stars', 'active', 'compatible'

    if (type === 'stars') {
      const topStars = await prisma.user.findMany({
        orderBy: { totalStars: 'desc' },
        take: 10,
        select: { id: true, username: true, avatarUrl: true, totalStars: true }
      });
      return res.json(topStars);
    } 
    
    if (type === 'active') {
      const topActive = await prisma.user.findMany({
        orderBy: { recentCommits: 'desc' },
        take: 10,
        select: { id: true, username: true, avatarUrl: true, recentCommits: true }
      });
      return res.json(topActive);
    }

    if (type === 'compatible') {
      const topMatches = await prisma.match.findMany({
        orderBy: { compatibilityScore: 'desc' },
        take: 5,
        include: {
          user1: { select: { id: true, username: true, avatarUrl: true } },
          user2: { select: { id: true, username: true, avatarUrl: true } }
        }
      });
      return res.json(topMatches);
    }

    res.status(400).json({ error: "Invalid leaderboard type" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// GET /api/hall-of-merges — Fetch approved merges
router.get("/hall-of-merges", isAuthenticated, async (req, res) => {
  try {
    let merges = await prisma.hallOfMerge.findMany({
      where: { status: 'approved' },
      include: {
        match: {
          include: {
            user1: { select: { username: true, avatarUrl: true, totalStars: true } },
            user2: { select: { username: true, avatarUrl: true, totalStars: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Seed logic if empty
    if (merges.length === 0) {
       const fakeMerges = [
         {
           id: "fake1", story: "We matched and instantly bonded over our mutual hatred of CSS. Built a CLI tool together instead.", repoUrl: "https://github.com/gitcrush-demo", status: "approved", createdAt: new Date().toISOString(),
           match: { user1: { username: "FrontendHater", avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4", totalStars: 432 }, user2: { username: "RustEvangelist", avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4", totalStars: 1020 } }
         },
         {
           id: "fake2", story: "Our first date was refactoring a Redux store into Zustand. It was magical.", repoUrl: "https://github.com/gitcrush-demo", status: "approved", createdAt: new Date(Date.now() - 86400000).toISOString(),
           match: { user1: { username: "ReactGod", avatarUrl: "https://avatars.githubusercontent.com/u/3?v=4", totalStars: 21 }, user2: { username: "StateMaster", avatarUrl: "https://avatars.githubusercontent.com/u/4?v=4", totalStars: 89 } }
         },
         {
           id: "fake3", story: "Connected on GitCrush, then built an AI side project that actually works.", repoUrl: "https://github.com/gitcrush-demo", status: "approved", createdAt: new Date(Date.now() - 172800000).toISOString(),
           match: { user1: { username: "AI_Bro", avatarUrl: "https://avatars.githubusercontent.com/u/5?v=4", totalStars: 991 }, user2: { username: "SamAltmanFan", avatarUrl: "https://avatars.githubusercontent.com/u/6?v=4", totalStars: 2 } }
         }
       ];
       return res.json(fakeMerges);
    }

    res.json(merges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hall of merges" });
  }
});

// POST /api/hall-of-merges — Submit or confirm a merge
router.post("/hall-of-merges", isAuthenticated, async (req, res) => {
  try {
    const { matchId, story, repoUrl } = req.body;
    const userId = req.user.id;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      return res.status(403).json({ error: "Unauthorized or invalid match" });
    }

    const existing = await prisma.hallOfMerge.findUnique({ where: { matchId } });
    
    if (existing) {
      if (existing.status === 'pending') {
        const updated = await prisma.hallOfMerge.update({
          where: { matchId },
          data: { status: 'approved' }
        });
        return res.json({ success: true, entry: updated, message: "Merge confirmed!" });
      }
      return res.status(400).json({ error: "Already exists and approved." });
    }

    // Create new
    const newEntry = await prisma.hallOfMerge.create({
      data: {
        matchId,
        user1Id: match.user1Id,
        user2Id: match.user2Id,
        story,
        repoUrl,
        status: "pending"
      }
    });

    res.json({ success: true, entry: newEntry, message: "Submitted! Waiting for partner to confirm." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit merge" });
  }
});

// GET /api/search/users?q=keyword
router.get("/search/users", isAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const users = await prisma.user.findMany({
      where: {
        username: { contains: q, mode: "insensitive" },
        id: { not: req.user.id }
      }, take: 5, select: { id: true, username: true, avatarUrl: true, bio: true }
    });
    res.json(users);
  } catch(e) { res.status(500).json({error: "Search failed"}); }
});

// GET /api/users/:username
router.get("/users/:username", isAuthenticated, async (req, res) => {
  try {
    const target = await prisma.user.findFirst({
        where: { username: req.params.username }
    });
    if (!target) return res.status(404).json({ error: "User not found" });

    // Ensure it's not hidden unless the current user matched with them
    const isMatched = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id, user2Id: target.id },
          { user1Id: target.id, user2Id: req.user.id }
        ]
      }
    });

    if (target.isHidden && !isMatched && target.id !== req.user.id) {
        return res.status(404).json({ error: "User not found" });
    }

    // Increment profile view
    if (target.id !== req.user.id) {
        await prisma.user.update({
            where: { id: target.id },
            data: { profileViews: { increment: 1 } },
        });
    }

    // Compute compatibility score
    const { computeCompatibility } = require("../services/compatibilityEngine");
    const comp = computeCompatibility(req.user, target);
    
    const targetWithScore = {
      ...target,
      matchScore: comp.score,
      matchReason: comp.explanation
    };

    res.json({ user: targetWithScore, isMatched: !!isMatched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/me — update editable fields
router.patch("/me", isAuthenticated, async (req, res) => {
    try {
        const updatable = ["intent", "lookingFor", "location", "age", "isHidden", "customBio", "hideHeatmap", "hideStats"];
        const data = {};
        for (const key of updatable) {
            if (req.body[key] !== undefined) data[key] = req.body[key];
        }
        
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// PATCH /api/me/repo-visibility — update hidden_repo_ids
router.patch("/me/repo-visibility", isAuthenticated, async (req, res) => {
    try {
        const { hiddenRepoIds } = req.body;
        if (!Array.isArray(hiddenRepoIds)) return res.status(400).json({error: "Expected array"});

        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: { hiddenRepoIds }
        });
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update repos" });
    }
});

// DELETE /api/me — hard delete user record
router.delete("/me", isAuthenticated, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.user.id } });
        req.session.destroy();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete account" });
    }
});

module.exports = router;

