const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock users...');

  const users = [
    {
      githubId: "mock_1",
      username: "frontend_fairy",
      avatarUrl: "https://avatars.githubusercontent.com/u/101?v=4",
      bio: "I turn coffee into CSS animations. 🧚‍♀️",
      customBio: "I center divs for a living. Love long walks on the beach and refactoring old React components.",
      repos: 42,
      followers: 120,
      languages: [{ lang: "JavaScript", pct: 60 }, { lang: "TypeScript", pct: 20 }, { lang: "CSS", pct: 20 }],
      commitPattern: "afternoon",
      topics: ["react", "ui", "animation", "frontend"],
      totalStars: 450,
      experienceScore: 5,
      longestStreak: 12,
      currentStreak: 3,
      personalityType: "The Designer",
      personalityDesc: "Pixel-perfect and always polishing the UI.",
      redFlags: ["Repo named 'test-do-not-use'"],
    },
    {
      githubId: "mock_2",
      username: "backend_bear",
      avatarUrl: "https://avatars.githubusercontent.com/u/102?v=4",
      aiBio: "I'm the guy who fixes the things you broke. My ideal date is tuning PostgreSQL queries at 3 AM.",
      repos: 15,
      followers: 88,
      languages: [{ lang: "Go", pct: 50 }, { lang: "Rust", pct: 30 }, { lang: "Python", pct: 20 }],
      commitPattern: "night",
      topics: ["microservices", "API", "kubernetes", "backend"],
      totalStars: 1200,
      experienceScore: 8,
      longestStreak: 45,
      currentStreak: 45,
      personalityType: "The Night Owl",
      personalityDesc: "Writes the best code when everyone else is asleep.",
      redFlags: ["No READMEs anywhere"],
    },
    {
      githubId: "mock_3",
      username: "fullstack_mentor",
      avatarUrl: "https://avatars.githubusercontent.com/u/103?v=4",
      customBio: "Senior dev looking to mentor passionate juniors. I speak both React and Node.js fluently.",
      repos: 120,
      followers: 1500,
      languages: [{ lang: "TypeScript", pct: 40 }, { lang: "Python", pct: 40 }, { lang: "Java", pct: 20 }],
      commitPattern: "morning",
      topics: ["fullstack", "architecture", "tutorial", "mentorship"],
      totalStars: 5000,
      experienceScore: 10,
      longestStreak: 100,
      currentStreak: 10,
      personalityType: "The Architect",
      personalityDesc: "Plans everything meticulously before writing a single line of code.",
      redFlags: [],
    },
    {
      githubId: "mock_4",
      username: "solidity_bro",
      avatarUrl: "https://avatars.githubusercontent.com/u/104?v=4",
      aiBio: "Web3 is the future. Let's build a decentralized dating app on Ethereum.",
      repos: 8,
      followers: 12,
      languages: [{ lang: "Solidity", pct: 80 }, { lang: "JavaScript", pct: 20 }],
      commitPattern: "evening",
      topics: ["crypto", "web3", "ethereum", "smart-contracts"],
      totalStars: 5,
      experienceScore: 3,
      longestStreak: 2,
      currentStreak: 0,
      personalityType: "The Experimenter",
      personalityDesc: "Always jumping on the newest framework or tech trend.",
      redFlags: ["Only clones other people's repos", "Overuses rocket emojis"],
    }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { githubId: u.githubId },
      update: u,
      create: u,
    });
  }

  console.log('✅ Seeded 4 mock users');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
