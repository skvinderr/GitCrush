const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const prisma = new PrismaClient();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = "http://localhost:5000/auth/github/callback";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ─── Step 1: Redirect to GitHub OAuth page ──────────────────────────────────
router.get("/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: "user:email public_repo repo",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ─── Step 2: GitHub redirects back with a code ──────────────────────────────
router.get("/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${CLIENT_URL}?error=no_code`);

  try {
    // Exchange code for access token using axios (bypasses Node IPv6 fetch issues)
    const tokenRes = await axios.post("https://github.com/login/oauth/access_token", {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
    }, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GitCrush/1.0",
      }
    });

    const accessToken = tokenRes.data.access_token;

    if (!accessToken) {
      console.error("Token exchange failed:", tokenRes.data);
      return res.redirect(`${CLIENT_URL}?error=token_failed`);
    }

    // Fetch the user's GitHub profile
    const profileRes = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitCrush/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const gh = profileRes.data;

    // Upsert user in the database
    const user = await prisma.user.upsert({
      where: { githubId: gh.id.toString() },
      update: {
        accessToken,
        username: gh.login,
        avatarUrl: gh.avatar_url,
        bio: gh.bio || null,
        repos: gh.public_repos || 0,
        followers: gh.followers || 0,
        following: gh.following || 0,
      },
      create: {
        githubId: gh.id.toString(),
        accessToken,
        username: gh.login,
        avatarUrl: gh.avatar_url,
        bio: gh.bio || null,
        repos: gh.public_repos || 0,
        followers: gh.followers || 0,
        following: gh.following || 0,
      },
    });

    // Manually set the session (bypassing Passport entirely)
    req.session.userId = user.id;
    req.session.save(() => {
      res.redirect(`${CLIENT_URL}/discover`);
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${CLIENT_URL}?error=server_error`);
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect(CLIENT_URL);
  });
});

module.exports = router;
