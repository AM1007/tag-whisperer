import { isValidEmail, isValidRepo, parseRepo } from '../utils/validation.js';
import { checkRepoExists } from '../services/githubService.js';
import { createSubscription } from '../services/subscriptionService.js';

export async function subscribe(req, res) {
  const { email, repo } = req.body;

  if (!email || !repo || !isValidEmail(email) || !isValidRepo(repo)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { owner, name } = parseRepo(repo);

  try {
    const exists = await checkRepoExists(owner, name);
    if (!exists) {
      return res.status(404).json({ error: 'Repository not found on GitHub' });
    }

    const result = await createSubscription(email, owner, name);

    if (result.conflict) {
      return res.status(409).json({ error: 'Already subscribed' });
    }

    // TODO: отправить confirmation email (следующий шаг)

    return res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try later.' });
    }
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}