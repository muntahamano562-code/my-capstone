import { tool } from 'ai';
import { z } from 'zod';

export const githubInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .max(39, 'Username is too long')
    .regex(/^[a-zA-Z0-9-]+$/, 'Username contains invalid characters'),
});

export const githubResultSchema = z.object({
  username: z.string(),
  publicRepos: z.number(),
  followers: z.number(),
  topLanguages: z.array(z.string()),
  totalStars: z.number(),
  activityScore: z.number().min(0).max(100),
  careerSummary: z.string(),
  recommendedFocus: z.array(z.string()),
});

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'my-capstone-career-assistant';

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
  };
}

function isRateLimited(res) {
  return res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0';
}

function buildCareerSummary({ username, publicRepos, followers, totalStars, topLanguages }) {
  const langs = topLanguages.length ? topLanguages.join(', ') : 'no detected languages';
  const repoWord = publicRepos === 1 ? 'repository' : 'repositories';
  const followerWord = followers === 1 ? 'follower' : 'followers';
  const starWord = totalStars === 1 ? 'star' : 'stars';
  return `${username} has ${publicRepos} public ${repoWord}, ${followers} ${followerWord}, and ${totalStars} total ${starWord}. Primary languages: ${langs}.`;
}

function buildRecommendedFocus({ totalStars, topLanguages, activityScore }) {
  const focus = [];

  if (activityScore < 50) {
    focus.push('Increase commit frequency to demonstrate consistent activity');
  }
  if (topLanguages.length <= 1) {
    focus.push('Diversify your stack by learning a complementary language or framework');
  }
  if (totalStars === 0) {
    focus.push('Polish one flagship project with a strong README to attract stars');
  }
  focus.push('Document your work in public to build a visible career portfolio');

  return focus.slice(0, 4);
}

function computeActivityScore({ publicRepos, followers, totalStars, recentPushDays }) {
  let score = 0;
  score += Math.min(publicRepos, 30) * 1.5;
  score += Math.min(followers, 50) * 0.5;
  score += Math.min(totalStars, 100) * 0.3;
  if (recentPushDays !== null && recentPushDays <= 90) {
    score += 15;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const analyzeGithubProfile = tool({
  description:
    'Analyze a GitHub user profile and repositories to produce a structured career analysis. Use this when the user asks to analyze their GitHub, review their developer profile, or get career insights based on their open-source activity.',
  inputSchema: githubInputSchema,
  outputSchema: githubResultSchema,
  execute: async ({ username }) => {
    const trimmed = (username || '').trim();

    if (!trimmed) {
      throw new Error('A GitHub username is required.');
    }
    if (!/^[a-zA-Z0-9-]+$/.test(trimmed) || trimmed.length > 39) {
      throw new Error(`'${trimmed}' is not a valid GitHub username.`);
    }

    let userRes;
    try {
      userRes = await fetch(`${GITHUB_API}/users/${encodeURIComponent(trimmed)}`, {
        headers: githubHeaders(),
      });
    } catch {
      throw new Error('Unable to reach the GitHub API. Please try again later.');
    }

    if (userRes.status === 404) {
      throw new Error(`GitHub user '${trimmed}' was not found.`);
    }
    if (isRateLimited(userRes)) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (!userRes.ok) {
      throw new Error(`GitHub API request failed (status ${userRes.status}).`);
    }

    let user;
    try {
      user = await userRes.json();
    } catch {
      throw new Error('Failed to parse the GitHub user response.');
    }

    let reposRes;
    try {
      reposRes = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(trimmed)}/repos?per_page=100&sort=updated`,
        { headers: githubHeaders() },
      );
    } catch {
      throw new Error('Unable to reach the GitHub API for repositories. Please try again later.');
    }

    if (isRateLimited(reposRes)) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (!reposRes.ok) {
      throw new Error(`GitHub repositories request failed (status ${reposRes.status}).`);
    }

    let repos;
    try {
      repos = await reposRes.json();
    } catch {
      throw new Error('Failed to parse the GitHub repositories response.');
    }

    const publicRepos = typeof user.public_repos === 'number' ? user.public_repos : repos.length;
    const followers = typeof user.followers === 'number' ? user.followers : 0;

    const languageCounts = {};
    let totalStars = 0;
    let mostRecentPush = null;

    for (const repo of repos) {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
      totalStars += repo.stargazers_count || 0;
      if (repo.pushed_at) {
        const pushed = new Date(repo.pushed_at).getTime();
        if (!mostRecentPush || pushed > mostRecentPush) {
          mostRecentPush = pushed;
        }
      }
    }

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    const recentPushDays =
      mostRecentPush !== null
        ? Math.floor((Date.now() - mostRecentPush) / (1000 * 60 * 60 * 24))
        : null;

    const activityScore = computeActivityScore({
      publicRepos,
      followers,
      totalStars,
      recentPushDays,
    });

    const result = {
      username: user.login || trimmed,
      publicRepos,
      followers,
      topLanguages,
      totalStars,
      activityScore,
      careerSummary: buildCareerSummary({
        username: user.login || trimmed,
        publicRepos,
        followers,
        totalStars,
        topLanguages,
      }),
      recommendedFocus: buildRecommendedFocus({
        totalStars,
        topLanguages,
        activityScore,
      }),
    };

    return githubResultSchema.parse(result);
  },
});

export default analyzeGithubProfile;
