const GITHUB_API = 'https://api.github.com';

export async function checkRepoExists(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'tag-whisperer',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 200) return true;
  if (response.status === 404) return false;

  if (response.status === 403 || response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const error = new Error('GitHub API rate limit exceeded');
    error.status = 429;
    error.retryAfter = retryAfter;
    throw error;
  }

  throw new Error(`GitHub API error: ${response.status}`);
}

export async function getLatestRelease(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/releases/latest`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'tag-whisperer',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 200) {
    const data = await response.json();
    return data.tag_name;
  }

  if (response.status === 404) return null;

  if (response.status === 403 || response.status === 429) {
    const error = new Error('GitHub API rate limit exceeded');
    error.status = 429;
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }

  throw new Error(`GitHub API error: ${response.status}`);
}