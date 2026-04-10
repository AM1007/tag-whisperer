import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidRepo, parseRepo } from '../src/utils/validation.js';

describe('isValidEmail', () => {
  it('accepts valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidRepo', () => {
  it('accepts valid owner/repo format', () => {
    expect(isValidRepo('facebook/react')).toBe(true);
  });

  it('rejects repo without slash', () => {
    expect(isValidRepo('react')).toBe(false);
  });

  it('rejects repo with multiple slashes', () => {
    expect(isValidRepo('a/b/c')).toBe(false);
  });

  it('rejects empty owner', () => {
    expect(isValidRepo('/react')).toBe(false);
  });

  it('rejects empty repo name', () => {
    expect(isValidRepo('facebook/')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidRepo(null)).toBe(false);
    expect(isValidRepo(123)).toBe(false);
  });
});

describe('parseRepo', () => {
  it('parses owner and name', () => {
    expect(parseRepo('facebook/react')).toEqual({ owner: 'facebook', name: 'react' });
  });
});