require('dotenv').config({ path: __dirname + '/../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MIN_QUALITY_SCORE = 5;
const TARGET_PROFILES = 100;

// Uses personal access tokens if available to increase rate limit from 60 to 5000 / hr
const GITHUB_TOKENS = [
  process.env.GITHUB_TOKEN_1,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
  process.env.GITHUB_TOKEN_4
].filter(Boolean); // Filter out undefined

let currentTokenIndex = 0;

function getGitHubHeaders() {
  const headers = {
    'User-Agent': 'GitCrush-Crawler',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (GITHUB_TOKENS.length > 0) {
    headers['Authorization'] = `token ${GITHUB_TOKENS[currentTokenIndex]}`;
    currentTokenIndex = (currentTokenIndex + 1) % GITHUB_TOKENS.length;
  }
  
  return headers;
}

// Helper to calculate quality
function calculateQualityScore(user, fullProfile, repos) {
  let score = 0;
  
  // +2 points: has a bio
  if (fullProfile.bio) score += 2;
  
  // +2 points: has 5+ repos
  if (fullProfile.public_repos >= 5) score += 2;
  
  // +1 point: has followers > 10
  if (fullProfile.followers > 10) score += 1;
  
  // +1 point: has a profile photo
  if (fullProfile.avatar_url && !fullProfile.avatar_url.includes('gravatar')) score += 1;
  
  // +1 point: has a location
  if (fullProfile.location) score += 1;
  
  // +1 point: account older than 1 year
  const accountAgeMs = new Date() - new Date(fullProfile.created_at);
  if (accountAgeMs > 365 * 24 * 60 * 60 * 1000) score += 1;
  
  // +1 point: has repo topics/descriptions (simplified check - at least one repo has description)
  const hasDescOrTopics = repos.some(r => r.description || (r.topics && r.topics.length > 0));
  if (hasDescOrTopics) score += 1;
  
  // -3 points: looks like a bot
  if (fullProfile.login.toLowerCase().includes('bot') || (fullProfile.name && fullProfile.name.toLowerCase().includes('bot'))) score -= 3;
  
  // -2 points: zero stars on all repos
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  if (totalStars === 0) score -= 2;
  
  // Max cap just in case, though logically max is ~10
  return Math.max(0, Math.min(score, 10));
}

// Sleep helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, { headers: getGitHubHeaders() });
      if (response.status === 403 || response.status === 429) {
        console.log(`Rate limited! Searching for headers...`);
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
          console.log(`Waiting ${Math.round(waitTime/1000)}s for rate limit reset...`);
          await delay(Math.max(waitTime, 1000));
          continue;
        }
      }
      return response;
    } catch (err) {
      console.error(`Fetch fetch error ${url}:`, err.message);
      await delay(2000);
    }
  }
  return null;
}

// Fetch language stats from repos
async function extractLanguageData(repos) {
  const langCounts = {};
  let totalBytes = 0;
  
  for (const repo of repos) {
    if (!repo.language) continue;
    // Just using the primary language for simplicity to save API calls
    // Ideally we'd hit /repos/{owner}/{repo}/languages but rate limits bite hard.
    langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    totalBytes += 1; 
  }
  
  // Convert to percentage
  const languages = {};
  for (const [lang, count] of Object.entries(langCounts)) {
    languages[lang] = Math.round((count / totalBytes) * 100);
  }
  
  return languages;
}

async function runCrawler() {
  console.log(`Starting GitHub Ghost Profile Crawler... (Target: ${TARGET_PROFILES} profiles)`);
  
  let successCount = 0;
  
  // Try to find the last inserted githubId to resume
  const lastGhost = await prisma.user.findFirst({
    where: { isGhost: true },
    orderBy: { githubId: 'desc' }
  });
  
  let lastId = parseInt(process.env.CRAWLER_START_ID || (lastGhost ? lastGhost.githubId : 0)) || 0;
  
  while (successCount < TARGET_PROFILES) {
    console.log(`Fetching batch starting from ID: ${lastId}`);
    
    // Fetch batch of users
    const usersRes = await fetchWithRetry(`https://api.github.com/users?since=${lastId}&per_page=100`);
    if (!usersRes || !usersRes.ok) {
      console.error('Failed to fetch batch. Exiting.');
      break;
    }
    
    const users = await usersRes.json();
    if (users.length === 0) break;
    
    // Update lastId for next batch
    lastId = users[users.length - 1].id;
    
    for (const basicUser of users) {
      if (successCount >= TARGET_PROFILES) break;
      
      // Filter out Orgs and bots
      if (basicUser.type !== 'User' || basicUser.login.toLowerCase().includes('bot')) {
        continue;
      }
      
      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { githubId: basicUser.id.toString() } });
      if (existing) continue;
      
      // Fetch full profile
      const profileRes = await fetchWithRetry(`https://api.github.com/users/${basicUser.login}`);
      if (!profileRes || !profileRes.ok) continue;
      
      const fullProfile = await profileRes.json();
      
      // Filter out low repo count
      if (fullProfile.public_repos === 0) continue;
      
      // Fetch Repos for score and languages
      const reposRes = await fetchWithRetry(`https://api.github.com/users/${basicUser.login}/repos?sort=updated&per_page=5`);
      if (!reposRes || !reposRes.ok) continue;
      
      const repos = await reposRes.json();
      
      // Calculate Quality Score
      const qualityScore = calculateQualityScore(basicUser, fullProfile, repos);
      if (qualityScore < MIN_QUALITY_SCORE) {
         console.log(`[Skip] ${basicUser.login} - Score: ${qualityScore}`);
         continue;
      }
      
      // Process Data
      const languages = await extractLanguageData(repos);
      const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
      const allTopics = repos.flatMap(r => r.topics || []);
      const uniqueTopics = [...new Set(allTopics)];
      
      // Create Ghost User
      try {
        await prisma.user.create({
          data: {
            githubId: fullProfile.id.toString(),
            username: fullProfile.login,
            avatarUrl: fullProfile.avatar_url,
            bio: fullProfile.bio || "Just exploring code! 👻",
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
            lastCrawledAt: new Date()
          }
        });
        successCount++;
        console.log(`[${successCount}/${TARGET_PROFILES}] Created Ghost Profile: ${fullProfile.login} (Score: ${qualityScore})`);
      } catch (err) {
        console.error(`Failed to create ${fullProfile.login}:`, err.message);
      }
      
      // Small delay to be nice to GitHub if not using tokens
      await delay(300);
    }
  }
  
  console.log(`Finished! Crawled and added ${successCount} ghost profiles.`);
  process.exit(0);
}

runCrawler().catch(console.error);