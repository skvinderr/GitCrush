require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
// require("./services/eventsPoller"); // Start poller

const http = require("http");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow any origin that requests it (reflects the origin back)
      if (!origin) return callback(null, true);
      return callback(null, origin);
    },
    credentials: true,
  })
);

app.use(express.json());

// Trust proxy is required for Render/Heroku to know it's HTTPS
app.set("trust proxy", 1);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "gitcrush_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: true, // ALWAYS true for production (Render is HTTPS)
    sameSite: "none", // ALWAYS none for cross-domain cookies to work (Vercel -> Render)
  },
});
app.use(sessionMiddleware);

// Initialize Socket.io
initSocket(server, sessionMiddleware);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.json({ message: "GitCrush API is running 💘" });
});

// ─── START ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 GitCrush server running on http://localhost:${PORT}`);
});

