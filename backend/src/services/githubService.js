import redis from '../config/redis.js';

const GITHUB_API = 'https://api.github.com';
const CACHE_TTL = 600;

async function githubFetch(url) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'tag-whisperer',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  if (redis) {
    try {
      const cached = await redis.get(url);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.error('Redis get error:', err.message);
    }
  }

  const response = await fetch(url, { headers });

  if (response.status === 403 || response.status === 429) {
    const error = new Error('GitHub API rate limit exceeded');
    error.status = 429;
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }

  const result = { status: response.status, data: null };

  if (response.status === 200) {
    result.data = await response.json();

    if (redis) {
      try {
        await redis.set(url, JSON.stringify(result), 'EX', CACHE_TTL);
      } catch (err) {
        console.error('Redis set error:', err.message);
      }
    }
  }

  return result;
}

export async function checkRepoExists(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`;
  const result = await githubFetch(url);

  if (result.status === 200) return true;
  if (result.status === 404) return false;

  throw new Error(`GitHub API error: ${result.status}`);
}

export async function getLatestRelease(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/releases/latest`;
  const result = await githubFetch(url);

  if (result.status === 200) return result.data.tag_name;
  if (result.status === 404) return null;

  throw new Error(`GitHub API error: ${result.status}`);
}