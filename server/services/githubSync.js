const { PrismaClient } = require("@prisma/client");
const { computePersonalityType, detectRedFlags } = require("./profileAnalysis");
const { generateAiBio } = require("./bioGenerator");
const prisma = new PrismaClient();

async function fetchFromRest(endpoint, token) {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 204 || res.status === 202) return null;
    throw new Error(`GitHub REST Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchFromGraphQL(query, token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(`GitHub GraphQL Error: ${data.errors[0].message}`);
  return data.data;
}

// Helper: Determine time of day from hour (0-23)
function getHourRange(hour) {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

async function syncGithubProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.accessToken) throw new Error("User or accessToken not found");

  const token = user.accessToken;
  const username = user.username;

  // ─── 1. Fetch repos ───────────────────────────────────────────────────
  const repos = await fetchFromRest(`/users/${username}/repos?per_page=100&type=owner`, token);
  if (!repos) throw new Error("Could not fetch repos");

  let totalStars = 0;
  const topicsMap = {};
  const languagesMap = {};

  const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);

  // ─── 2. Aggregate languages + topics + stars in parallel ──────────────
  const repoPromises = repos.map(async (repo) => {
    totalStars += repo.stargazers_count;
    if (repo.topics) {
      repo.topics.forEach((t) => { topicsMap[t] = (topicsMap[t] || 0) + 1; });
    }
    try {
      const langs = await fetchFromRest(repo.languages_url, token);
      if (langs) {
        for (const [lang, bytes] of Object.entries(langs)) {
          languagesMap[lang] = (languagesMap[lang] || 0) + bytes;
        }
      }
    } catch (e) { /* ignored */ }
  });
  await Promise.allSettled(repoPromises);

  // Language percentages
  const totalLangBytes = Object.values(languagesMap).reduce((a, b) => a + b, 0);
  const topLanguages = Object.entries(languagesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, bytes]) => ({
      lang,
      pct: totalLangBytes > 0 ? Math.round((bytes / totalLangBytes) * 100) : 0,
    }));

  // Top topics
  const topTopics = Object.entries(topicsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((t) => t[0]);

  // ─── 3. Commit time pattern via punch card ─────────────────────────────
  const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const punchPromises = topRepos.map(async (repo) => {
    try {
      const punchCard = await fetchFromRest(`/repos/${username}/${repo.name}/stats/punch_card`, token);
      if (Array.isArray(punchCard)) {
        punchCard.forEach(([, hour, commits]) => {
          hourCounts[getHourRange(hour)] += commits;
        });
      }
    } catch (e) { /* ignored */ }
  });
  await Promise.allSettled(punchPromises);

  const commitPattern = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  // ─── 4. GraphQL — Calendar, Streaks, Experience ───────────────────────
  const query = `
    query {
      viewer {
        createdAt
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const gqlData = await fetchFromGraphQL(query, token);
  const viewer = gqlData.viewer;
  const createdDate = new Date(viewer.createdAt);
  const accountAgeYears = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  const totalCommits = viewer.contributionsCollection.contributionCalendar.totalContributions;
  const weeks = viewer.contributionsCollection.contributionCalendar.weeks;
  const allDays = weeks.flatMap((w) => w.contributionDays);

  // Experience score 1-10
  const experienceScore = Math.max(1, Math.min(10,
    Math.floor((accountAgeYears * 0.8) + (totalCommits / 300))
  ));

  // Streak calculations
  let longestStreak = 0, tempStreak = 0;
  allDays.forEach((day) => {
    if (day.contributionCount > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) {
      currentStreak++;
    } else if (i < allDays.length - 2) {
      break;
    }
  }

  // ─── 5. Personality + Red Flags ───────────────────────────────────────
  const personality = computePersonalityType({ repos, hourCounts, languagesMap, totalCommits });
  const redFlags = detectRedFlags({ repos, allDays, totalCommits });

  // ─── 6. AI bio — generate only on first sync to avoid token waste ─────
  const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { aiBio: true } });
  let aiBio = existingUser?.aiBio || null;

  if (!aiBio) {
    try {
      aiBio = await generateAiBio({
        username: user.username,
        languages: topLanguages,
        personalityType: personality.type,
        commitPattern,
        repos: repos.length,
        totalStars,
        longestStreak,
        redFlags,
        pinnedRepos: [], // Could be fetched separately; empty for now
      });
    } catch (e) {
      console.warn("AI bio generation failed:", e.message);
    }
  }

  // ─── 7. Persist to DB ─────────────────────────────────────────────────
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      languages: topLanguages,
      commitPattern,
      topics: topTopics,
      totalStars,
      experienceScore,
      longestStreak,
      currentStreak,
      personalityType: personality.type,
      personalityDesc: personality.desc,
      redFlags,
      ...(aiBio && { aiBio }),
      lastSyncedAt: new Date(),
    },
  });

  return updatedUser;
}

module.exports = { syncGithubProfile };
