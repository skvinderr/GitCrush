/**
 * computeCompatibility — calculates a dating compatibility score between two GitCrush users.
 * Returns { score: number, explanation: string }
 */
function computeCompatibility(userA, userB) {
  let score = 0;
  let explanations = [];
  
  const langsA = (userA.languages || []).map((l) => l.lang);
  const langsB = (userB.languages || []).map((l) => l.lang);
  
  // ─── 1. Tech Stack Overlap (25 pts) ────────────────────────────────────────────────
  const sharedLangs = langsA.filter((l) => langsB.includes(l));
  let techScore = 0;
  if (sharedLangs.length >= 3) techScore = 25;
  else if (sharedLangs.length === 2) techScore = 15;
  else if (sharedLangs.length === 1) techScore = 8;
  
  if (langsA[0] && langsB[0] && langsA[0] === langsB[0]) {
    techScore = Math.min(25, techScore + 5);
  }
  score += techScore;

  // ─── 2. Activity Pattern Match (20 pts) ────────────────────────────────────────────
  const patternA = userA.commitPattern || "day";
  const patternB = userB.commitPattern || "day";
  
  const patternMap = { morning: 0, afternoon: 1, evening: 2, night: 3, day: 1 };
  const valA = patternMap[patternA];
  const valB = patternMap[patternB];
  
  let patternMatch = "";
  if (valA === valB) {
    score += 20;
    patternMatch = "same";
  } else if (Math.abs(valA - valB) === 1 || Math.abs(valA - valB) === 3) {
    score += 10; // Adjacent
    patternMatch = "adjacent";
  } else {
    score += 0; // Opposite
    patternMatch = "opposite";
  }

  // ─── 3. Project Type Similarity (20 pts) ───────────────────────────────────────────
  const topicsA = userA.topics || [];
  const topicsB = userB.topics || [];
  
  const intersection = topicsA.filter(t => topicsB.includes(t));
  const union = new Set([...topicsA, ...topicsB]);
  
  if (union.size > 0) {
    const jaccard = intersection.length / union.size;
    score += Math.round(jaccard * 20);
  } else if (Math.abs((userA.experienceScore || 0) - (userB.experienceScore || 0)) <= 2) {
    // If no shared topics but experience is similar
    score += 10;
  }

  // ─── 4. Experience Level (15 pts) ──────────────────────────────────────────────────
  const expA = userA.experienceScore || 0;
  const expB = userB.experienceScore || 0;
  let expGap = Math.abs(expA - expB);
  
  // Quick mentorship check in bio
  const bioA = (userA.customBio || userA.aiBio || userA.bio || "").toLowerCase();
  const bioB = (userB.customBio || userB.aiBio || userB.bio || "").toLowerCase();
  const wantsMentorship = bioA.includes("mentor") || bioB.includes("mentor");
  
  if (wantsMentorship) {
    // Bigger gap is better!
    if (expGap >= 6) score += 15;
    else if (expGap >= 4) score += 10;
    else if (expGap >= 2) score += 5;
    else score += 0;
  } else {
    if (expGap <= 1) score += 15;
    else if (expGap <= 3) score += 10;
    else if (expGap <= 5) score += 5;
    else score += 0;
  }

  // ─── 5. Complementary Skills (10 pts) ──────────────────────────────────────────────
  const frontend = ["JavaScript", "TypeScript", "HTML", "CSS", "Vue", "React", "Svelte", "Angular"];
  const backend = ["Python", "Go", "Rust", "Java", "C++", "C#", "Ruby", "PHP"];
  
  const isFrontendA = frontend.includes(langsA[0]);
  const isBackendA = backend.includes(langsA[0]);
  const isFrontendB = frontend.includes(langsB[0]);
  const isBackendB = backend.includes(langsB[0]);
  
  let isComplementary = false;
  if ((isFrontendA && isBackendB) || (isBackendA && isFrontendB)) {
    score += 10;
    isComplementary = true;
  } else if ((isFrontendA && isFrontendB) || (isBackendA && isBackendB)) {
    score += 5;
  }

  // ─── 6. Community Signals (10 pts) ─────────────────────────────────────────────────
  // Skipping live GitHub API follow checks per prompt, but giving 5 points random chance 
  // or if they have unusually large followers we assume community overlap.
  if ((userA.followers > 50 && userB.followers > 50) || sharedLangs.length >= 4) {
    score += 10;
  } else {
    score += 5; // Default middle-ground to not unfairly tank scores
  }

  // Clamp max score to 100
  score = Math.min(100, Math.max(0, score));

  // ─── EXPLANATION GENERATOR ─────────────────────────────────────────────────────────
  let explanation = "";
  
  const topSharedLang = sharedLangs[0] || "code";
  const sharedTime = patternMatch === "same" ? patternA : "different times";
  
  if (isComplementary) {
    explanation = "You handle the frontend, they handle the backend. Together you're a full-stack relationship.";
  } else if (patternA === "night" && patternB === "night") {
    explanation = "Two people who deploy on Friday nights. This is either love or a cautionary tale.";
  } else if (score >= 75) {
    explanation = `You both love ${topSharedLang} and code at ${sharedTime}. This is either a match made in production or a future debugging session.`;
  } else if (score >= 50) {
    const aType = isFrontendA ? "UIs" : isBackendA ? "systems" : "projects";
    const bType = isFrontendB ? "UIs" : isBackendB ? "systems" : "projects";
    explanation = `Different stacks, similar energy. You build ${aType}, they build ${bType} — could be interesting.`;
  } else {
    explanation = "Technically compatible. Probably. Git push and find out.";
  }

  return { score, explanation };
}

module.exports = { computeCompatibility };
