const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const shopify_fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GITHUB_TOKENS = [
  process.env.GITHUB_TOKEN_1,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
  process.env.GITHUB_TOKEN_4
].filter(Boolean);

let currentTokenIndex = 0;
const MIN_QUALITY_SCORE = 5;

function getGitHubHeaders() {
  const headers = {
    'User-Agent': 'GitCrush-Events-Poller',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (GITHUB_TOKENS.length > 0) {
    headers['Authorization'] = `token ${GITHUB_TOKENS[currentTokenIndex]}`;
    currentTokenIndex = (currentTokenIndex + 1) % GITHUB_TOKENS.length;
  }
  
  return headers;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, { headers: getGitHubHeaders() });
      if (response.status === 403 || response.status === 429) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          await delay(Math.max(waitTime, 1000));
          continue;
        }
      }
      return response;
    } catch (err) {
      await delay(2000);
    }
  }
  return null;
}

function calculateQualityScore(fullProfile, repos) {
  let score = 0;
  if (fullProfile.bio) score += 2;
  if (fullProfile.public_repos >= 5) score += 2;
  if (fullProfile.followers > 10) score += 1;
  if (fullProfile.avatar_url && !fullProfile.avatar_url.includes('gravatar')) score += 1;
  if (fullProfile.location) score += 1;
  const accountAgeMs = new Date() - new Date(fullProfile.created_at);
  if (accountAgeMs > 365 * 24 * 60 * 60 * 1000) score += 1;
  const hasDescOrTopics = repos.some(r => r.description || (r.topics && r.topics.length > 0));
  if (hasDescOrTopics) score += 1;
  if (fullProfile.login.toLowerCase().includes('bot') || (fullProfile.name && fullProfile.name.toLowerCase().includes('bot'))) score -= 3;
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  if (totalStars === 0) score -= 2;
  return Math.max(0, Math.min(score, 10));
}

async function extractLanguageData(repos) {
  const langCounts = {};
  let totalBytes = 0;
  for (const repo of repos) {
    if (!repo.language) continue;
    langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    totalBytes += 1; 
  }
  const languages = {};
  for (const [lang, count] of Object.entries(langCounts)) {
    languages[lang] = Math.round((count / totalBytes) * 100);
  }
  return languages;
}

let lastEventId = null;
let pollIntervalMs = 60000;

async function pollEvents() {
  console.log('[EventsPoller] Checking for new GitHub events...');
  try {
    const response = await fetchWithRetry('https://api.github.com/events?per_page=100');
    if (!response || !response.ok) {
      setTimeout(pollEvents, pollIntervalMs);
      return;
    }

    const pollIntervalHeader = response.headers.get('x-poll-interval');
    if (pollIntervalHeader) {
      pollIntervalMs = Math.max(60000, parseInt(pollIntervalHeader) * 1000);
    }

    const events = await response.json();
    if (!events || !Array.isArray(events)) return;

    const uniqueActors = new Map();
    for (const event of events) {
      if (lastEventId && event.id === lastEventId) break;
      if (!uniqueActors.has(event.actor.login)) {
        uniqueActors.set(event.actor.login, {
          login: event.actor.login,
          type: event.type,
          timestamp: new Date(event.created_at)
        });
      }
    }

    if (events.length > 0) {
      lastEventId = events[0].id;
    }

    console.log(`[EventsPoller] Found ${uniqueActors.size} unique active developers.`);

    for (const [username, eventData] of uniqueActors) {
      const existingUser = await prisma.user.findFirst({
        where: { username: username }
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { 
            lastActiveAt: new Date(),
            dominantEventType: eventData.type 
          }
        });
        continue;
      }

      // If not exists, fetch and maybe create ghost profile
      const profileRes = await fetchWithRetry(`https://api.github.com/users/${username}`);
      if (!profileRes || !profileRes.ok) continue;
      const fullProfile = await profileRes.json();
      if (fullProfile.type !== 'User' || fullProfile.public_repos === 0) continue;

      const reposRes = await fetchWithRetry(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`);
      if (!reposRes || !reposRes.ok) continue;
      const repos = await reposRes.json();

      const qualityScore = calculateQualityScore(fullProfile, repos);
      if (qualityScore >= MIN_QUALITY_SCORE) {
        const languages = await extractLanguageData(repos);
        const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
        const uniqueTopics = [...new Set(repos.flatMap(r => r.topics || []))];

        await prisma.user.create({
          data: {
            githubId: fullProfile.id.toString(),
            username: fullProfile.login,
            avatarUrl: fullProfile.avatar_url,
            bio: fullProfile.bio || "Just active on GitHub! 👻",
            location: fullProfile.location,
            repos: fullProfile.public_repos,
            followers: fullProfile.followers,
            following: fullProfile.following,
            topics: uniqueTopics,
            totalStars: totalStars,
            languages: languages,
            experienceScore: Math.min(qualityScore, 10),
            isGhost: true,
            crawlQualityScore: qualityScore,
            lastCrawledAt: new Date(),
            lastActiveAt: new Date(),
            dominantEventType: eventData.type
          }
        });
        console.log(`[EventsPoller] Created new active ghost profile: ${username}`);
      }
    }
  } catch (error) {
    console.error('[EventsPoller] Error polling events:', error);
  }
  
  // Schedule next poll
  setTimeout(pollEvents, pollIntervalMs);
}

// Start polling
pollEvents(); // Initial run

module.exports = { pollEvents };
