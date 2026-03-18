const express = require("express");
const router = express.Router();
const passport = require("passport");

// Start GitHub OAuth flow
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));

// GitHub callback
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: process.env.CLIENT_URL }),
  (req, res) => {
    // Successful auth → redirect to discover page
    res.redirect(`${process.env.CLIENT_URL}/discover`);
  }
);

// Logout
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect(process.env.CLIENT_URL);
    });
  });
});

module.exports = router;
