/**
 * generateAiBio — calls Groq AI (Llama 3) to generate a funny, warm dating bio
 * based on the user's GitHub profile data.
 *
 * Uses native fetch to Groq's OpenAI-compatible endpoint.
 */
async function generateAiBio(userData) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  GROQ_API_KEY not set — skipping AI bio generation");
    return null;
  }

  const {
    username,
    languages = [],
    personalityType = "The Developer",
    commitPattern = "night",
    repos = 0,
    totalStars = 0,
    longestStreak = 0,
    redFlags = [],
    pinnedRepos = [],
  } = userData;

  const langStr = Array.isArray(languages)
    ? languages.map((l) => `${l.lang} (${l.pct}%)`).join(", ")
    : "Not specified";

  const redFlagsStr =
    Array.isArray(redFlags) && redFlags.length > 0
      ? redFlags.join("; ")
      : "None detected (suspicious)";

  const pinnedStr =
    pinnedRepos.length > 0
      ? pinnedRepos.map((r) => r.description || r.name).filter(Boolean).join("; ")
      : "None pinned";

  const systemPrompt = `You are writing a funny, warm, and slightly self-aware dating profile bio for a developer on a platform called GitCrush. Keep it under 60 words. First person. No hashtags. Tone: warm, witty, developer-native. Include one specific technical detail, one personality trait, and one gentle self-roast.`;

  const userPrompt = `GitHub data:
- Username: ${username}
- Top languages: ${langStr}
- Personality type: ${personalityType}
- Commit pattern: ${commitPattern} coder
- Total repos: ${repos}
- Total stars received: ${totalStars}
- Longest streak: ${longestStreak} days
- Red flags detected: ${redFlagsStr}
- Pinned repo descriptions: ${pinnedStr}

Write a 2-3 sentence bio in first person.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Groq AI error:", err);
    return null;
  }

  const data = await response.json();
  const bio = data.choices?.[0]?.message?.content?.trim();
  return bio || null;
}

module.exports = { generateAiBio };
