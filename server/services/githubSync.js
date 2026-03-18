const { PrismaClient } = require("@prisma/client");
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
    if (res.status === 404 || res.status === 204 || res.status === 202) return null; // 202 is common for stats building
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

  // 1. Fetch repos (up to 100 to keep it somewhat fast but dense)
  const repos = await fetchFromRest(`/users/${username}/repos?per_page=100&type=owner`, token);
  
  // ─── AGGREGATIONS ───
  let totalStars = 0;
  const topicsMap = {};
  const languagesMap = {};
  
  // Need the top 5 repos for punch_card (to avoid hammering the API)
  const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);
  
  // ─── PROCESS REPOS IN PARALLEL ───
  const repoPromises = repos.map(async (repo) => {
    totalStars += repo.stargazers_count;
    
    // Topics
    if (repo.topics) {
      repo.topics.forEach((t) => {
        topicsMap[t] = (topicsMap[t] || 0) + 1;
      });
    }

    // Languages (REST API requested)
    // Only fetch for languages if it's explicitly a main project to save rate limits
    // but since we want overall bytes:
    try {
      const langs = await fetchFromRest(repo.languages_url, token);
      if (langs) {
        for (const [lang, bytes] of Object.entries(langs)) {
          languagesMap[lang] = (languagesMap[lang] || 0) + bytes;
        }
      }
    } catch (e) {
      // Ignored
    }
  });

  await Promise.allSettled(repoPromises);

  // Calculate Languages %
  const totalLangBytes = Object.values(languagesMap).reduce((a, b) => a + b, 0);
  const topLanguages = Object.entries(languagesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, bytes]) => ({
      lang,
      pct: totalLangBytes > 0 ? Math.round((bytes / totalLangBytes) * 100) : 0
    }));

  // Top Topics
  const topTopics = Object.entries(topicsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((t) => t[0]);

  // ─── COMMIT TIME PATTERN (Punch Card) ───
  const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const punchPromises = topRepos.map(async (repo) => {
    try {
      const punchCard = await fetchFromRest(`/repos/${username}/${repo.name}/stats/punch_card`, token);
      if (Array.isArray(punchCard)) {
        punchCard.forEach(([day, hour, commits]) => {
          hourCounts[getHourRange(hour)] += commits;
        });
      }
    } catch (e) { /* ignored */ }
  });
  await Promise.allSettled(punchPromises);

  const commitPattern = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0][0]; // Extract the text (e.g., "night")

  // ─── GRAPHQL (Calendar, Stream, Experience) ───
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
  const totalCommitsLastYear = viewer.contributionsCollection.contributionCalendar.totalContributions;

  // Experience Score (1-10) -> Rough heuristic
  // e.g., 5 years old + 1000 commits = solid 8
  let score = Math.min(10, Math.floor((accountAgeYears * 0.8) + (totalCommitsLastYear / 300)));
  const experienceScore = Math.max(1, score);

  // Streaks Calculation
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const weeks = viewer.contributionsCollection.contributionCalendar.weeks;
  const allDays = weeks.flatMap(w => w.contributionDays);

  allDays.forEach(day => {
    if (day.contributionCount > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  // For current streak, walk backwards from yesterday/today
  let tempCurrent = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) {
      tempCurrent++;
    } else if (i < allDays.length - 2) {
      // If we miss today or yesterday, break
      break;
    }
  }
  currentStreak = tempCurrent;

  // ─── UPDATE DB ───
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
      lastSyncedAt: new Date(),
    },
  });

  return updatedUser;
}

module.exports = { syncGithubProfile };
