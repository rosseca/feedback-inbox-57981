import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  getCookieFromRequest,
  parseCookieHeader,
  signValue,
  verifySignedValue,
} from '@/server/auth/session';
import { isSameOrigin } from '@/server/http';

describe('signed session values', () => {
  it('round-trips a session id', () => {
    const signed = signValue('session-123');
    expect(verifySignedValue(signed)).toBe('session-123');
  });

  it('rejects a tampered value', () => {
    const signed = signValue('session-123');
    const tampered = signed.replace(/.$/, 'x');
    expect(verifySignedValue(tampered)).toBeNull();
  });

  it('rejects a value without a signature', () => {
    expect(verifySignedValue('session-123')).toBeNull();
  });
});

describe('isSameOrigin', () => {
  it('accepts requests without an origin header', () => {
    const req = new Request('http://localhost:3000/api/auth/login', { method: 'POST' });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('accepts a matching origin', () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('rejects a foreign origin', () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://evil.example', host: 'localhost:3000' },
    });
    expect(isSameOrigin(req)).toBe(false);
  });
});

describe('parseCookieHeader', () => {
  it('parses multiple cookies', () => {
    const cookies = parseCookieHeader('a=1; feedback_session=abc.def; b=2');
    expect(cookies.a).toBe('1');
    expect(cookies.feedback_session).toBe('abc.def');
  });

  it('reads the session cookie from a request', () => {
    const req = new Request('http://localhost:3000/', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=abc.def` },
    });
    expect(getCookieFromRequest(req, SESSION_COOKIE_NAME)).toBe('abc.def');
  });
});
