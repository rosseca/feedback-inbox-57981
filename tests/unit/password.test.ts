import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/auth/password';

describe('password hashing', () => {
  it('verifies a matching password', async () => {
    const hash = await hashPassword('dev-password-123');
    expect(await verifyPassword('dev-password-123', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('dev-password-123');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('never stores the plain password in the hash', async () => {
    const hash = await hashPassword('dev-password-123');
    expect(hash).not.toContain('dev-password-123');
  });
});
