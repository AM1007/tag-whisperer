import { describe, it, expect } from 'vitest';
import { generateToken } from '../src/utils/token.js';

describe('generateToken', () => {
  it('returns a string', () => {
    expect(typeof generateToken()).toBe('string');
  });

  it('returns 64-character hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});