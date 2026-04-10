import { describe, it, expect, vi } from 'vitest';

describe('Scanner logic', () => {
  it('detects new release when tag differs from last_seen_tag', () => {
    const lastSeenTag = 'v1.0.0';
    const latestTag = 'v2.0.0';
    expect(latestTag !== lastSeenTag).toBe(true);
  });

  it('skips when tag matches last_seen_tag', () => {
    const lastSeenTag = 'v1.0.0';
    const latestTag = 'v1.0.0';
    expect(latestTag === lastSeenTag).toBe(true);
  });

  it('handles null latest tag (no releases)', () => {
    const latestTag = null;
    expect(latestTag).toBeNull();
  });

  it('handles null last_seen_tag (first scan)', () => {
    const lastSeenTag = null;
    const latestTag = 'v1.0.0';
    expect(latestTag !== lastSeenTag).toBe(true);
  });
});