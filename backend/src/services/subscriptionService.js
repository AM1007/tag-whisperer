import pool from '../config/db.js';
import { generateToken } from '../utils/token.js';

export async function createSubscription(email, owner, repo) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let result = await client.query(
      'SELECT id FROM repositories WHERE owner = $1 AND repo = $2',
      [owner, repo]
    );

    let repositoryId;

    if (result.rows.length > 0) {
      repositoryId = result.rows[0].id;
    } else {
      result = await client.query(
        'INSERT INTO repositories (owner, repo) VALUES ($1, $2) RETURNING id',
        [owner, repo]
      );
      repositoryId = result.rows[0].id;
    }

    result = await client.query(
      'SELECT id FROM subscriptions WHERE email = $1 AND repository_id = $2',
      [email, repositoryId]
    );

    if (result.rows.length > 0) {
      await client.query('ROLLBACK');
      return { conflict: true };
    }

    const confirmToken = generateToken();
    const unsubscribeToken = generateToken();

    await client.query(
      `INSERT INTO subscriptions (email, repository_id, confirm_token, unsubscribe_token)
       VALUES ($1, $2, $3, $4)`,
      [email, repositoryId, confirmToken, unsubscribeToken]
    );

    await client.query('COMMIT');

    return { conflict: false, confirmToken, unsubscribeToken };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function confirmSubscription(token) {
  const result = await pool.query(
    'UPDATE subscriptions SET confirmed = TRUE WHERE confirm_token = $1 AND confirmed = FALSE RETURNING id',
    [token]
  );
  return result.rows.length > 0;
}

export async function unsubscribe(token) {
  const result = await pool.query(
    'DELETE FROM subscriptions WHERE unsubscribe_token = $1 RETURNING id',
    [token]
  );
  return result.rows.length > 0;
}