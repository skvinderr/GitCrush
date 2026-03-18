/**
 * PERSONALITY TYPES
 *
 * Uses already-fetched repo data + computed metrics to assign one funny archetype.
 *
 * @param {object} params
 * @param {Array}  params.repos           – raw GitHub repo objects
 * @param {object} params.hourCounts      – { morning, afternoon, evening, night } commit totals
 * @param {object} params.languagesMap    – { "TypeScript": bytes, ... }
 * @param {number} params.totalCommits    – total contributions in the last year
 */
function computePersonalityType({ repos, hourCounts, languagesMap, totalCommits }) {
  const nonForks = repos.filter((r) => !r.fork);
  const repoCount = nonForks.length;
  const langCount = Object.keys(languagesMap).length;

  // ── Night Owl ──────────────────────────────────────────────────────────
  // Majority of commits in the 10pm-4am window (stored in "night" bucket)
  const totalHourCommits = Object.values(hourCounts).reduce((a, b) => a + b, 0);
  const nightPct = totalHourCommits > 0 ? (hourCounts.night || 0) / totalHourCommits : 0;
  if (nightPct > 0.5) {
    return {
      type: "The Night Owl",
      desc: "Thrives after midnight when the rest of the world is asleep — and probably debugs best on caffeine fumes.",
    };
  }

  // ── The Ghost ──────────────────────────────────────────────────────────
  // Repos exist but mostly no README, description, or topics
  if (repoCount >= 5) {
    const ghostRepos = nonForks.filter(
      (r) => !r.description && (!r.topics || r.topics.length === 0)
    );
    if (ghostRepos.length / repoCount > 0.7) {
      return {
        type: "The Ghost",
        desc: "Technically active on GitHub, technically invisible to anyone who visits their profile.",
      };
    }
  }

  // ── The Experimenter ──────────────────────────────────────────────────
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  const youngRepos = nonForks.filter(
    (r) => Date.now() - new Date(r.created_at).getTime() < SIX_MONTHS_MS
  );
  const youngPct = repoCount > 0 ? youngRepos.length / repoCount : 0;
  if (repoCount >= 15 && youngPct > 0.5 && langCount >= 4) {
    return {
      type: "The Experimenter",
      desc: "Starts three new projects before finishing one, but at least they're having fun doing it.",
    };
  }

  // ── The Minimalist ────────────────────────────────────────────────────
  const starredRepos = nonForks.filter((r) => r.stargazers_count > 0);
  if (repoCount < 5 && starredRepos.length >= repoCount * 0.6 && repoCount > 0) {
    return {
      type: "The Minimalist",
      desc: "Ships less, ships better — five repos, all bangers.",
    };
  }

  // ── The Architect ─────────────────────────────────────────────────────
  const largeRepos = nonForks.filter((r) => r.size > 500); // size in KB on GitHub
  if (largeRepos.length >= 5) {
    return {
      type: "The Architect",
      desc: "Sees every project as a system design challenge. Definitely has opinions about folder structure.",
    };
  }

  // ── The Sprinter ──────────────────────────────────────────────────────
  // Use the commit total as a proxy: Sprinters will often see extreme variation.
  // We'll flag very high yearly commits for a low-repo count as a burst pattern indicator.
  if (totalCommits > 500 && repoCount < 10) {
    return {
      type: "The Sprinter",
      desc: "Goes from 0 to 1,000 commits in two weeks then vanishes for a month. Chaos is the workflow.",
    };
  }

  // ── The Completionist ─────────────────────────────────────────────────
  const documentedRepos = nonForks.filter((r) => r.description && r.description.length > 50);
  if (documentedRepos.length / Math.max(repoCount, 1) > 0.6 && repoCount >= 5) {
    return {
      type: "The Completionist",
      desc: "Has a README for the README. Closes issues before the coffee gets cold.",
    };
  }

  // ── Default ───────────────────────────────────────────────────────────
  return {
    type: "The Developer",
    desc: "Writes code. Ships things. Has a drawer full of side projects that are 'almost done'.",
  };
}

/**
 * RED FLAG DETECTOR
 *
 * Returns an array of funny (capped at 3) red flag strings.
 *
 * @param {object} params
 * @param {Array}  params.repos        – raw GitHub repo objects
 * @param {Array}  params.allDays      – contribution calendar days [{date, contributionCount}, ...]
 * @param {number} params.totalCommits – yearly contributions
 */
function detectRedFlags({ repos, allDays, totalCommits }) {
  const flags = [];

  // 1. Graveyard of forked repos with 0 commits  ─────────────────────────
  const deadForks = repos.filter(
    (r) => r.fork && r.size === 0
  );
  if (deadForks.length > 5) {
    flags.push(`Graveyard of ${deadForks.length} forked repos 🚩`);
  }

  // 2. Repos named 'test', 'temp', or 'final' ────────────────────────────
  const cringe = repos.find((r) =>
    /\b(test|temp|final)\b/i.test(r.name)
  );
  if (cringe) {
    flags.push(`Has a repo called '${cringe.name}' 🚩`);
  }

  // 3. Most repos have no README (description as proxy) ──────────────────
  const nonForks = repos.filter((r) => !r.fork);
  const noDescCount = nonForks.filter((r) => !r.description).length;
  if (nonForks.length > 0 && noDescCount / nonForks.length > 0.65) {
    flags.push("READMEs are apparently optional 🚩");
  }

  // 4. GitHub account mostly decorative ──────────────────────────────────
  if (totalCommits < 10) {
    flags.push("GitHub account mostly decorative 🚩");
  }

  // 5. All commits on Sundays between 9-11pm ─────────────────────────────
  // We'll check if the only active contribution days cluster on Sundays
  const activeDays = allDays.filter((d) => d.contributionCount > 0);
  if (activeDays.length > 0) {
    const sundayCount = activeDays.filter((d) => new Date(d.date).getDay() === 0).length;
    if (sundayCount / activeDays.length > 0.5) {
      flags.push("Only codes the night before deadlines 🚩");
    }
  }

  // Return max 3 flags, funniest first
  return flags.slice(0, 3);
}

module.exports = { computePersonalityType, detectRedFlags };
