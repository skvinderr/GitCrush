const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/github/callback",
      scope: ["user:email", "public_repo"],
      // Required by GitHub's API — prevents InternalOAuthError on some Node versions
      userAgent: "GitCrush/1.0",
      // We will use the accessToken to fetch the profile ourselves
      skipUserProfile: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Manually re-fetch the profile using Node's native fetch (much more reliable on Windows)
        // This avoids the TLSSocket errors in node-oauth
        let ghProfile = profile._json;
        try {
          const profileRes = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "GitCrush/1.0",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
          if (profileRes.ok) {
            ghProfile = await profileRes.json();
          }
        } catch (fetchErr) {
          console.warn("Manual profile fetch failed, falling back to passport profile:", fetchErr.message);
        }

        const githubUser = {
          githubId: (ghProfile.id || profile.id).toString(),
          accessToken: accessToken,
          username: ghProfile.login || profile.username,
          avatarUrl: ghProfile.avatar_url,
          bio: ghProfile.bio || null,
          repos: ghProfile.public_repos || 0,
          followers: ghProfile.followers || 0,
          following: ghProfile.following || 0,
          isGhost: false,
        };

        const user = await prisma.user.upsert({
          where: { githubId: githubUser.githubId },
          update: {
            accessToken: githubUser.accessToken,
            username: githubUser.username,
            avatarUrl: githubUser.avatarUrl,
            bio: githubUser.bio,
            repos: githubUser.repos,
            followers: githubUser.followers,
            following: githubUser.following,
            isGhost: false,
          },
          create: githubUser,
        });

        return done(null, user);
      } catch (err) {
        console.error("Auth error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
