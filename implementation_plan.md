# Phase 6: GitHub Profile Sync

## Background
Extract rich developer metrics from GitHub using both the REST and GraphQL APIs to build a comprehensive dating profile.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
Add new fields to the `User` model:
```prisma
  accessToken     String?  // Needed to call GitHub APIs later
  languages       Json?    // {"TypeScript": 45, "Rust": 20}
  commitPattern   String?  // "morning", "afternoon", "evening", "night"
  topics          String[] // ["react", "machine-learning"]
  totalStars      Int      @default(0)
  experienceScore Int      @default(0) // 1-10 scale
  longestStreak   Int      @default(0)
  currentStreak   Int      @default(0)
  lastSyncedAt    DateTime?
```

#### [MODIFY] `server/passport.js`
Update the GitHub OAuth strategy:
- Request `repo` scope (or at least `public_repo` to ensure GraphQL access).
- Save the `accessToken` to the database for the user during `upsert`.  

#### [NEW] `server/services/githubSync.js`
Create a service module to handle all GitHub API calls:
1. **REST API**: `/user/repos` to get public repos.
2. **REST API**: Iterate repos for `/languages` and aggregate bytes -> percentages (top 6).
3. **REST API**: Iterate top 5 repos for `/stats/commit_activity` to determine active hour ranges.
4. **REST API**: Aggregate `stargazers_count` and `topics` from the repo list.
5. **GraphQL API**: Query `user { contributionsCollection { contributionCalendar ... } }` for streaks and yearly commits.
6. **Algorithm**: Calculate `experienceScore` based on account `created_at` and total commits.

#### [MODIFY] `server/routes/api.js`
Add `POST /api/sync-profile` endpoint:
- Checks if user is authenticated.
- Retrieves `accessToken` from DB.
- Calls `githubSync.js` service.
- Updates user record in DB and returns updated user.

---

### Frontend (`/client`)

#### [NEW] `client/src/components/SyncLoader.jsx`
A full-screen loading component that cycles through funny messages every few seconds:
- "Analyzing your commit history..."
- "Counting your stars..."
- "Judging your README quality..."
- "Checking your space vs tabs preference..."

#### [MODIFY] `client/src/App.jsx`
- Intercept the protected route rendering. If `user.lastSyncedAt` is null, show `SyncLoader` and fire an API call to `/api/sync-profile`. Once done, refresh user context and proceed to the requested page.

#### [MODIFY] `client/src/pages/Profile.jsx`
- Add a "Refresh Data" button that triggers `POST /api/sync-profile` manually and shows a loading state.
- Display the newly synced data (languages, commit pattern, stars, experience score, streaks).

## Verification Plan
1. Apply Prisma schema changes `npx prisma db push` or `npx prisma generate`.
2. Login to update scope and save access token.
3. Observe the frontend SyncLoader cycling through messages.
5. View Profile page to see the stats and click "Refresh Data".

---

# Phase 7: AI-Generated Bios & Personality

## Background
Go beyond sterile stats by assigning a funny "Dev Archetype" personality and automatically writing a witty dating bio using OpenAI's GPT-4o based on their code habits.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
Add new fields to the `User` model:
```prisma
  personalityType String?
  personalityDesc String?
  redFlags        Json?
  aiBio           String?
  customBio       String?
  bioRegenerations Int      @default(0)
```

#### [NEW] `server/services/profileAnalysis.js`
A module with two pure functions:
1. `computePersonalityType`: Assigns an archetype (e.g., "The Night Owl", "The Architect").
2. `detectRedFlags`: Returns an array of up to 3 funny warning signs based on repo names, lack of READMEs, etc.

#### [NEW] `server/services/bioGenerator.js`
A module that uses native `fetch` to call the OpenAI API (`gpt-4o`).
- Passes user stats, languages, personality, and red flags into a prompt.
- Returns a 2-3 sentence funny, first-person dating bio.

#### [MODIFY] `server/services/githubSync.js`
- Call the `profileAnalysis` functions after gathering GitHub stats.
- Call the `bioGenerator` inside the sync pipeline (only on the *first* sync to save tokens).
- Store everything in the MongoDB update.

#### [MODIFY] `server/routes/api.js`
Add two new endpoints:
1. `POST /api/regenerate-bio` (max 5 times)
2. `PUT /api/me/bio` (to save a manual `customBio`)

### Frontend (`/client`)

#### [MODIFY] `client/src/pages/Profile.jsx`
- Display the personality badge and description card.
- Display the computed red flags warning list.
- Show the generated bio.
- Add an "Edit Bio / Write my own" state to save custom bios.
- Add a "Regenerate Bio" button.

---

# Phase 8: Compatibility Score Engine

## Background
Compute a dating compatibility score (0-100) between two users based on their GitHub metrics, language overlap, commit patterns, experience gap, and project topics. We'll cache these scores to guarantee high performance during discovery swiping.

## Proposed Changes

### Backend

#### [MODIFY] `server/prisma/schema.prisma`
Add a cache model to speed up reads:
```prisma
model CompatibilityCache {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userAId     String   @db.ObjectId
  userBId     String   @db.ObjectId
  score       Int
  explanation String
  computedAt  DateTime @default(now())

  @@unique([userAId, userBId])
}
```

#### [NEW] `server/services/compatibilityEngine.js`
A module with a pure compute function `computeCompatibility(userA, userB)`. Rules:
1. **Tech Stack (25 pts):** Uses `user.languages` to find shared tech.
2. **Activity Pattern (20 pts):** Compares `user.commitPattern` (morning, afternoon, evening, night).
3. **Project Type (20 pts):** Jaccard index (intersection over union) of `user.topics`.
4. **Experience (15 pts):** Inversely proportional to the gap between `user.experienceScore`.
5. **Complementary (10 pts):** Checks frontend vs backend dominant languages.
6. **Community (10 pts):** GitHub API check if A follows B (or vice versa), and shared orgs.

It will also export a second function to generate the snappy 1-line **explanation string** based on the score bucket (High / Med / Low) and special edge cases (e.g., both night owls, complementary frontend/backend duo).

#### [MODIFY] `server/routes/api.js`
- Create a `GET /api/compatibility/:otherUserId` endpoint that checks the cache. Use Prisma to find it. If stale or missing, re-compute, cache, and return. Note: We'll skip the "follows" check if we don't want to hit the GH API repeatedly, or just fetch it on-demand during generation.

### Frontend
#### [MODIFY] `client/src/pages/Discover` / Profile Card Components
When rendering a user card, fetch and display their compatibility score as a colored progress bar/badge (Green/Yellow/Orange) along with the funny explanation text.

---

# Phase 9: Discover Swipe Interface & Match API

## Background
Transform the Discover page into a fully-fledged swipe interface representing the core app experience. This includes interactive draggable cards, keyboard navigation, mutual match detection, and a filtering sidebar.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
1. Add new preference fields to the `User` model: `intent` (String[]), `location` (String?), `timezoneOffset` (Int?).
2. Create the `Swipe` model:
```prisma
model Swipe {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  swiperId       String   @db.ObjectId
  targetUserId   String   @db.ObjectId
  direction      String   // 'left', 'right', 'super'
  isMutualMatch  Boolean  @default(false)
  createdAt      DateTime @default(now())

  @@unique([swiperId, targetUserId])
}
```

#### [MODIFY] `server/routes/api.js`
1. **`GET /api/discover`**: Upgrade to support filtering (intent, language, experience), pagination, AND exclude users already swiped. Use the `CompatibilityEngine` to merge scores into the response payload.
2. **`POST /api/swipe`**: Insert rule in `Swipe` table. If direction is 'right' or 'super', check if the target has already swiped 'right'/'super' on the current user. If yes, update `isMutualMatch = true` for both rows and return `{ match: true }` to trigger the UI animation.

### Frontend (`/client`)

#### [NEW Dependency] `framer-motion`
Install `framer-motion` for fluid, highly interactive drag gestures.

#### [MODIFY] `client/src/pages/Discover.jsx`
- Replace static cards with a `framer-motion` stacked deck.
- Implement swipe physics (tilt angle on drag, color overlays).
- Bind keyboard events (Left/Right/Up arrows).
- Create the **Filter Drawer** sliding in from the right edge with complex state for preferences.
- Create the **Mutual Match Overlay**: A full-screen intercept showing "Merge Request Approved 🎉" when `/api/swipe` returns a match.

## Verification Plan
1. `npm install framer-motion` and `npx prisma generate`.
2. Mock or login with two real users, swipe right on both to verify the "Merge Request Approved" screen.
3. Test keyboard bindings and draggable card physics.

---

# Phase 10: Matches Page

## Background
The Matches screen allows users to view their mutual connections ("Merged PRs"), separate them into new matches vs. existing conversations, and open a detailed match profile to view exactly why they matched (the 6-category breakdown).

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
Add a dedicated `Match` model:
```prisma
model Match {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  user1Id             String   @db.ObjectId
  user2Id             String   @db.ObjectId
  compatibilityScore  Int
  compatExplanation   String
  createdAt           DateTime @default(now())
  dateRepoUrl         String?  // Feature 9 placeholder

  user1               User     @relation("MatchesUser1", fields: [user1Id], references: [id])
  user2               User     @relation("MatchesUser2", fields: [user2Id], references: [id])

  @@unique([user1Id, user2Id])
}
```
*Note: Also add `matches1 Match[] @relation("MatchesUser1")` and `matches2 Match[] @relation("MatchesUser2")` to the `User` model.*

#### [MODIFY] `server/routes/api.js`
1. **Update `POST /api/swipe`**: 
   When a mutual match occurs, compute the compatibility score (using `compatibilityEngine`), and insert a new row into the `Match` table (sorting IDs so user1 is visually smaller ID, or just randomly).
2. **New `GET /api/matches`**:
   Fetch `Match` records where `user1Id == req.user.id` or `user2Id == req.user.id`. Populate the *other* user's profile data via relation. Return as an array.
3. **New `DELETE /api/matches/:id`**:
   Find the match, verify the user is part of it, and delete it. (Will also delete associated `Swipe` rows for cleanliness, or just delete the `Match`).

### Frontend (`/client`)

#### [MODIFY] `client/src/pages/Matches.jsx`
- Replace placeholder with tabbed interface: "New Matches" and "Conversations".
- **Match Card**: Render the customized GitCrush match card with side-by-side avatars, "Merged PRs", a colored compatibility badge, timeframe, and buttons.
- **Match Detail Modal**: A large modal showing the target's full profile stats and an isolated view of the 6-part Compatibility Engine breakdown (using mock/calculated score segments) + the "Create date repo" placeholder and "Unmatch / Close PR" button.
- **State**: Empty states formatted around software repo language ("open a PR").

---

# Phase 11: Premium Landing Page Revamp

## Background
The current Landing Page is too basic and static. To attract developers, it needs to be highly interactive, visually stunning, and clearly showcase the core value proposition (the swiping mechanism).

## Proposed Changes

### Frontend (`/client`)

#### [MODIFY] `client/src/pages/LandingPage.jsx`
Completely rewrite the component using `framer-motion` and advanced Tailwind utilities to include:
1. **Interactive Hero Section**:
   - A two-column layout on desktop: Left side has a massive gradient headline ("Stop merging alone.") and the GitHub login button.
   - Right side features a **3D Auto-playing Swipe Demo**: A stack of mock profile cards that automatically animate swiping left/right every 3 seconds to demonstrate the core functionality visually before logging in.
2. **Dynamic Background**:
   - Create a `TechParticleBackground` component that renders floating, slowly moving programming language icons (JS, Python, Rust) or geometric nodes to give it a "tech ecosystem" feel.
3. **Glassmorphism Feature Grid**:
   - Upgrade the three feature cards with deep glassmorphism (`backdrop-blur-xl`, semi-transparent borders).
   - Add a subtle `framer-motion` mouse-chase hover effect or a 3D tilt.
4. **Social Proof Marquee**:
   - A continuously scrolling banner showing fake success stories (e.g. "React dev ❤️ Node.js dev — 2,400+ couples coding together").
5. **Polished CTA and Typography**:
   - Use high-contrast, premium dark mode styling with vibrant brand-pink/purple accents. Replace standard emojis with high-quality SVGs or Lucide icons where possible.

---

# Phase 12: Real-time Chat System

## Background
The `/chat/:matchId` view will support real-time messaging using `socket.io`. It includes advanced developer-focused features like syntax-highlighted code snippets, interactive GitHub repo embeds, typing indicators, read receipts, and custom reactions.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
Add a dedicated `Message` model:
```prisma
model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  matchId   String   @db.ObjectId
  senderId  String   @db.ObjectId
  content   String
  type      String   @default("text") // text, code, repo, system
  language  String?  // for code snippets
  reactions Json?    // JSON object: { "⭐": ["userId1"], "🔥": [] }
  readAt    DateTime?
  createdAt DateTime @default(now())

  match     Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  sender    User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
}
```
*Note: Also add `messages Message[]` to the `User` and `Match` models.*

#### [MODIFY] `server/index.js` & `server/socket.js`
- Install `socket.io`. Init the WebSocket server sharing the Express HTTP server.
- Rooms: Users join an isolated room named after their `matchId`.
- Events: Handle `join_room`, `send_message`, `typing_indicator`, `mark_read`. Broadcast incoming messages to the room.

#### [MODIFY] `server/routes/api.js`
- **GET `/api/messages/:matchId`**: Fetches message history. 
- *Icebreaker Logic*: If the chat is completely empty, when fetching or joining, insert a random "Icebreaker" system message (e.g., "Tabs or spaces?") the first time the chat is opened.

### Frontend (`/client`)

#### [MODIFY] `client/src/App.jsx`
- Update the `/chat` route to `/chat/:matchId` (or handle routing internally if `/chat` shows a sidebar + main view, but per user request, routing goes to `/chat/:matchId`).

#### [NEW] `client/src/pages/Chat.jsx`
- Install `socket.io-client` & `highlight.js` (or use `prismjs` / standard `.code` classes).
- **Layout**: Top bar with target user's status (`online` indicator via socket presence). Scrollable chat container with bottom-aligned flow.
- **Input Area**: Textarea, Code button (opens modal), Emoji button.
- **Code Modal**: A simple dialog allowing the user to select a language and paste block code.
- **Repo Cards**: Detect `github.com/owner/repo` URLs using a regex in text messages and fetch repo stats via GitHub API directly in the specific message component.
- **Read Receipts**: Render `✓` (sent) and `✓✓` (read).
- **Reactions**: Add right-click/long-press context menu rendering `⭐`, `🔥`, `💀`, `👀`, `🚀`. Clicking updates the `reactions` JSONB remotely via socket or HTTP.

---

# Phase 13: Code Challenge Icebreakers

## Background
When two users match, alongside the standard text icebreaker, GitCrush will offer a mini coding challenge sent as a system message. Users independently submit their answers (blindly), and once both submit (or 24 hours pass), the solutions are revealed side-by-side.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
Add a new `Challenge` model:
```prisma
model Challenge {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  matchId          String   @db.ObjectId @unique
  promptId         Int      // Index from the 10 preset challenges
  user1Solution    String?
  user1Language    String?
  user2Solution    String?
  user2Language    String?
  user1SubmittedAt DateTime?
  user2SubmittedAt DateTime?
  revealedAt       DateTime?
  createdAt        DateTime @default(now())

  match            Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
}
```

#### [MODIFY] `server/routes/api.js`
When a completely new match has an empty chat history (the existing icebreaker logic):
1. Create a `Challenge` record linked to `matchId` picking a random `promptId` (0-9).
2. Create a `Message` with `type="challenge"` and `content=challenge.id`.
3. Add **new endpoint** `GET /api/challenges/:matchId` to fetch the challenge state (obscuring the other user's solution if the current user hasn't submitted yet, unless both have submitted).
4. Add **new endpoint** `POST /api/challenges/:matchId/submit` to save a user's solution. If it's the 2nd user submitting, set `revealedAt = now()` and broadcast a socket event to update the UI.

### Frontend (`/client`)

#### [MODIFY] `client/src/pages/Chat.jsx`
- Introduce a `<ChallengeCard />` component that renders inside the message list when `msg.type === 'challenge'`.
- The `ChallengeCard` will internally fetch its state from `GET /api/challenges/:matchId`.
- **UI States**:
  1. **Unsubmitted**: Shows the prompt text, a monospace `<textarea>` for writing code, a language dropdown, and a Submit button.
  2. **Waiting**: "Waiting for @username to submit..." (shows a loading spin state).
  3. **Revealed (Both submitted)**: Uses a 2-column grid layout rendering both code snippets side-by-side using `highlight.js`.

The 10 preset challenges will be hardcoded in the frontend or backend enum.

---

# Phase 14: Date Repo Sandbox

## Background
GitCrush allows matched users to instantly create a shared, private GitHub repository acting as a collaboration "sandbox" space.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/routes/auth.js`
- Update GitHub OAuth scope to include `repo` alongside `user:email public_repo`. This allows the application to create a private repository on the user's behalf.

#### [MODIFY] `server/prisma/schema.prisma`
- Add `dateRepoUrl String?` to `Match`.
- Update `Message.type` enum commentary to include `repo_invite`.

#### [NEW] API Endpoints in `server/routes/api.js`
1. `POST /api/matches/:id/date-repo-invite`:
   - Validates that the match exists and belongs to the user.
   - Validates that the match doesn't already have `dateRepoUrl`. 
   - Creates a `Message` with `type="repo_invite"` and emits socket `message_received`.

2. `POST /api/matches/:id/date-repo-accept`:
   - Verifies the user calling this is NOT the one who initiated the invite (so both users consent).
   - Generates the GitHub repository via `axios.post("https://api.github.com/user/repos")` under User 2's account (the acceptor). 
   - Uses `axios.put("https://api.github.com/repos/{owner}/{repo}/collaborators/{username}")` to invite User 1.
   - Pushes the initial `README.md` file using `GET /user` to fetch top languages and Base64 encodes the dynamic template.
   - Updates `Match.dateRepoUrl`.
   - Posts a final `system` message to the chat (`Your date repo is live! 🚀`).

### Frontend (`/client`)

#### [MODIFY] `client/src/pages/Matches.jsx`
- In `MatchDetailModal`, if `match.dateRepoUrl` exists, render a "View Date Repo ↗" anchor. Else, the button "Create Date Repo ✨" hits `/api/matches/:id/date-repo-invite`.

#### [MODIFY] `client/src/pages/Chat.jsx`
- Support `msg.type === 'repo_invite'` in the message UI. Shows a nice card: "@user invited you to create a Date Repo! [Accept]".
- If the chat's match object has a `dateRepoUrl`, inject a floating quick-link into the chat header.

---

# Phase 15: Tech Confessions feed

## Background
A public, anonymous community feed where developers confess their dev sins. It drives engagement and makes the platform feel like a community, not just a dating app.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
Add `Confession` model:
```prisma
model Confession {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  userId       String   @db.ObjectId // Needed for moderation
  text         String
  isAnonymous  Boolean  @default(true)
  reactions    Json?    // { "💀": [], "🔥": [], "👀": [], "✅": [], "🚀": [] } mapping to userIds
  reports      Int      @default(0)
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### [NEW] API Endpoints in `server/routes/api.js`
1. `GET /api/confessions?sort=top|new&page=n`: Fetch confessions (hide user info if anonymous), hide if reported >= 5 times.
2. `POST /api/confessions`: Create new confession `(text, isAnonymous)`. Add 280 char validation.
3. `POST /api/confessions/:id/react`: Toggle a reaction `(emoji)`.
4. `POST /api/confessions/:id/report`: Increment `reports`.

### Frontend (`/client`)

#### [NEW] `client/src/pages/Confessions.jsx`
- Reusable `ConfessionCard` component.
- Display an avatar placeholder (robot icon/geometry) "Anonymous Developer" or real profile info depending on `isAnonymous`.
- Render reaction counts and "Report" button.
- Create "Post Confession" form with length validation (20-280 chars) and an anonymity toggle.
- Tab switcher for "Top" and "New" sorts.

#### [MODIFY] `client/src/App.jsx`
- Add route `/confessions`.

#### [MODIFY] `client/src/components/Navbar.jsx`
- Add link to the Confessions feed in the navigation menu.

---

# Phase 16: Leaderboards & Hall of Merges

## Background
To foster competition and celebrate collaboration, we are adding a dual-purpose community page containing Weekly Leaderboards and a Hall of Merges showcasing couples who built projects together.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/prisma/schema.prisma`
1. **User Model**: Add `recentCommits Int @default(0)` to track 30-day activity.
2. **HallOfMerge Model**:
```prisma
model HallOfMerge {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  matchId     String   @unique @db.ObjectId
  user1Id     String   @db.ObjectId
  user2Id     String   @db.ObjectId
  story       String
  repoUrl     String
  status      String   @default("pending") // 'pending', 'approved'
  createdAt   DateTime @default(now())

  match       Match    @relation(fields: [matchId], references: [id])
}
```

#### [NEW] API Endpoints in `server/routes/api.js`
1. `GET /api/leaderboard?type=stars|active|compatible`:
   - `stars`: Order `User` by `totalStars DESC` limit 10.
   - `active`: Order `User` by `recentCommits DESC` limit 10.
   - `compatible`: Order `Match` by `compatibilityScore DESC` limit 5.
2. `GET /api/hall-of-merges`: Fetch all `status === 'approved'`. Includes seeding 3 fake examples if empty.
3. `POST /api/hall-of-merges`:
   - Validates the user belongs to the match.
   - If no entry exists, create one with `status: "pending"`.
   - If entry exists and the *other* user is calling this, update to `status: "approved"`.

### Frontend (`/client`)

#### [NEW] `client/src/pages/Leaderboard.jsx`
- **Section 1 (Leaderboards)**: 3-tab sub-navigation (Most Stars, Most Active, Most Compatible). Renders rows with Gold/Silver/Bronze pill badges for top 3.
- **Section 2 (Hall of Merges)**: Grid layout displaying couples. Each card shows twin avatars, the story blurb, combined stars, and a link to the repo.
- **Submit Form**: Modal activated by a "Submit your Merge" button. Form populates a dropdown of the user's active matches that have `dateRepoUrl` initialized.

#### [MODIFY] `client/src/App.jsx` & `Navbar.jsx`
- Expose the `/leaderboard` route.

---

# Phase 17: Neobrutalist UI Overhaul

## Background
The user requested a massive redesign based on a provided "MatchMaker" reference. The new aesthetic replaces our dark "neon Git" theme with a bright, pastel, "neobrutalist" aesthetic (solid black borders, hard block shadows, vibrant staggered elements, white canvas).

## Proposed Changes

### Configuration

#### [MODIFY] `client/tailwind.config.js`
- Overhaul `colors` object to include a vibrant, solid pastel palette and true black borders.
  - `bg.base` -> off-white (`#F8F8FF`)
  - `bg.card` -> pure white (`#FFFFFF`)
  - `text.primary` -> pure black (`#000000`), `text.secondary` -> dark gray (`#333`)
  - `brand` -> vibrant pastels (pink, blue, yellow, green)
- Add new brutalist drop shadows: `boxShadow.brutal: '4px 4px 0px 0px rgba(0,0,0,1)'`

#### [MODIFY] `client/src/index.css`
- Reset `body` styling to remove the dark radial gradients.
- Rewrite utility classes:
  - `.btn-primary`: Add `border-2 border-black border-solid bg-brand-pink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black text-black`.
  - Replace `.glass-card` with `.brutal-card` inheriting solid backgrounds, block borders and shadows.

### Frontend Components

#### [MODIFY] `client/src/pages/LandingPage.jsx`
- Completely rebuild the landing page referencing the MatchMaker video.
- **Hero Section**: Slanted elements, floating cards, high-contrast typography ("Find your GitCrush").
- **How it Works Section**: Staggered pastel cards (1. Authenticate, 2. Discover, 3. Connect, 4. Collab).
- **Testimonials/Features**: Bold borders, scattered interactive SVGs/emojis, dynamic hover elements.

#### [MODIFY] All Major Routes
Systematically migrate all `.jsx` pages to the Neobrutalist design specs (removing transparent borders, inserting brutal shadows, shifting to light text):
- `components/Navbar.jsx`: Light theme header with solid border.
- `pages/Discover.jsx`: The swipe cards need the heavy brutalist frame and block shadow.
- `pages/Matches.jsx`: Update match grid cards.
- `pages/Chat.jsx`: Update chat bubbles, header layout, and Code Challenge blocks.
- `pages/Confessions.jsx`: Update confession cards and submission box.
- `pages/Leaderboard.jsx`: Update ranking rows and Hall of Merges grid.

---

# Phase 18: Undo Swipe ("git revert")

## Background
Allow users to undo their most recent swipe. Adds a forgiving UX to the discovery queue.

## Proposed Changes

### Backend (`/server`)

#### [MODIFY] `server/routes/api.js`
1. **`DELETE /api/swipes/last`**:
   - Finds the most recently created `Swipe` where `swiperId === req.user.id`.
   - If that swipe has `isMutualMatch = true`, we need to find the inverse swipe (where `swiperId = targetUserId` and target is current user) and set its `isMutualMatch = false`.
   - We must also find and delete the `Match` object that was created for these two users.
   - Delete the user's swipe.
   - Return `{ success: true, targetUserId: ... }` so the frontend knows who was reverted.

### Frontend (`/client`)

#### [MODIFY] `client/src/pages/Discover.jsx`
- State: Keep a track of `swipeHistory` array storing the full user object of users swiped during the current session.
- Add an "Undo" button (curved back arrow / "git revert" style button) beneath the swiping deck, only visible/enabled if `swipeHistory.length > 0`.
- On click, trigger `DELETE /api/swipes/last`. If successful, `pop()` the last user from `swipeHistory` and unshift them back into `deck`, restoring them to the top of the stack.

