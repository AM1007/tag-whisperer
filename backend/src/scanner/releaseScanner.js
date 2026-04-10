import { getLatestRelease } from '../services/githubService.js';
import {
  getActiveRepositories,
  updateLastSeenTag,
  getSubscribersForRepo,
} from '../services/subscriptionService.js';
import { sendReleaseNotification } from '../services/emailService.js';
import { scannerRuns, activeSubscriptions } from '../config/metrics.js';

export async function scanReleases() {
  console.log('[Scanner] Starting release check...');
  scannerRuns.inc({ status: 'started' });

  let repos;
  try {
    repos = await getActiveRepositories();
  } catch (err) {
    console.error('[Scanner] Failed to get repositories:', err);
    return;
  }

  console.log(`[Scanner] Checking ${repos.length} repositories`);
  activeSubscriptions.set(repos.length);

  for (const repo of repos) {
    try {
      const latestTag = await getLatestRelease(repo.owner, repo.repo);

      if (!latestTag) {
        console.log(`[Scanner] ${repo.owner}/${repo.repo}: no releases`);
        continue;
      }

      if (latestTag === repo.last_seen_tag) {
        console.log(`[Scanner] ${repo.owner}/${repo.repo}: no new release`);
        continue;
      }

      console.log(`[Scanner] ${repo.owner}/${repo.repo}: new release ${latestTag}`);

      const subscribers = await getSubscribersForRepo(repo.id);

      for (const sub of subscribers) {
        try {
          await sendReleaseNotification(
            sub.email,
            `${repo.owner}/${repo.repo}`,
            latestTag,
            sub.unsubscribe_token
          );
          console.log(`[Scanner] Notified ${sub.email}`);
        } catch (err) {
          console.error(`[Scanner] Failed to notify ${sub.email}:`, err);
        }
      }

      await updateLastSeenTag(repo.id, latestTag);
    } catch (err) {
      if (err.status === 429) {
        console.warn('[Scanner] Rate limited, stopping scan');
        return;
      }
      console.error(`[Scanner] Error checking ${repo.owner}/${repo.repo}:`, err);
    }
  }

  scannerRuns.inc({ status: 'completed' });
  console.log('[Scanner] Scan complete');
}