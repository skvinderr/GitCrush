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
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const githubUser = {
          githubId: profile.id.toString(),
          accessToken: accessToken,
          username: profile.username,
          avatarUrl: profile._json.avatar_url,
          bio: profile._json.bio || null,
          repos: profile._json.public_repos || 0,
          followers: profile._json.followers || 0,
          following: profile._json.following || 0,
        };

        // Upsert user — create if first login, update if returning
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
