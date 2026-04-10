export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidRepo(repo) {
  if (typeof repo !== 'string') return false;
  const parts = repo.split('/');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

export function parseRepo(repo) {
  const [owner, name] = repo.split('/');
  return { owner, name };
}