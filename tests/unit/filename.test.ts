import { describe, expect, it } from 'vitest';
import {
  detectMimeFromBytes,
  isUnsafeFilename,
  sanitizeFilename,
} from '@/server/services/upload-service';

describe('isUnsafeFilename', () => {
  it('rejects traversal fragments', () => {
    expect(isUnsafeFilename('../../etc/passwd')).toBe(true);
  });

  it('rejects absolute paths', () => {
    expect(isUnsafeFilename('/etc/passwd')).toBe(true);
  });

  it('rejects control characters', () => {
    expect(isUnsafeFilename('report\x00.png')).toBe(true);
  });

  it('accepts an ordinary filename', () => {
    expect(isUnsafeFilename('report.pdf')).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('keeps a safe name', () => {
    expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
  });

  it('uses only the final path segment', () => {
    expect(sanitizeFilename('folder/report.pdf')).toBe('report.pdf');
  });

  it('strips characters outside the allowlist', () => {
    expect(sanitizeFilename('my report (1).pdf')).toBe('my report 1.pdf');
  });

  it('rejects names that become empty', () => {
    expect(sanitizeFilename('...')).toBeNull();
    expect(sanitizeFilename('')).toBeNull();
  });
});

describe('detectMimeFromBytes', () => {
  it('detects PNG, JPEG and PDF signatures', () => {
    expect(detectMimeFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectMimeFromBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe('application/pdf');
  });

  it('returns null for unknown content', () => {
    expect(detectMimeFromBytes(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });
});
