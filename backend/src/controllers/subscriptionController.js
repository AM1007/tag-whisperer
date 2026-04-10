import { isValidEmail, isValidRepo, parseRepo } from '../utils/validation.js';
import { checkRepoExists } from '../services/githubService.js';
import { 
  createSubscription, 
  confirmSubscription, 
  unsubscribe as unsubscribeService,
  getSubscriptionsByEmail 
} from '../services/subscriptionService.js';
import { sendConfirmationEmail } from '../services/emailService.js';


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

    await sendConfirmationEmail(email, repo, result.confirmToken);

    return res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try later.' });
    }
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function confirm(req, res) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    const found = await confirmSubscription(token);

    if (!found) {
      return res.status(404).json({ error: 'Token not found' });
    }

    return res.status(200).json({ message: 'Subscription confirmed successfully' });
  } catch (err) {
    console.error('Confirm error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unsubscribeHandler(req, res) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    const found = await unsubscribeService(token);

    if (!found) {
      return res.status(404).json({ error: 'Token not found' });
    }

    return res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSubscriptions(req, res) {
  const { email } = req.query;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const subscriptions = await getSubscriptionsByEmail(email);
    return res.status(200).json(subscriptions);
  } catch (err) {
    console.error('Get subscriptions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}