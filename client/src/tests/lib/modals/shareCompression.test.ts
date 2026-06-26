import { describe, expect, it } from 'vitest';
import {
  decodeMarkdownFromShare,
  encodeMarkdownForShare,
  getRequiredShareCompressionCodec,
  type ShareCompressionCodec
} from '../../../lib/modals/shareCompression';

function createIdentityCodec(): ShareCompressionCodec {
  return {
    deflate: (input) => input,
    inflate: (input) => input
  };
}

describe('share compression helpers', () => {
  it('encodes markdown as base64url content and decodes it back', () => {
    const codec = createIdentityCodec();
    const markdown = '# Hello\n\nUnicode: مرحبا';

    const encoded = encodeMarkdownForShare(markdown, codec);
    const decoded = decodeMarkdownFromShare(encoded, codec);

    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(decoded).toBe(markdown);
  });

  it('handles data larger than the binary conversion chunk size', () => {
    const codec = createIdentityCodec();
    const markdown = 'x'.repeat(0x8000 + 250);

    const encoded = encodeMarkdownForShare(markdown, codec);

    expect(decodeMarkdownFromShare(encoded, codec)).toBe(markdown);
  });

  it('requires a pako-compatible codec', () => {
    expect(() => getRequiredShareCompressionCodec(undefined)).toThrow('pako not loaded');
    expect(() => getRequiredShareCompressionCodec({ deflate: () => new Uint8Array() })).toThrow('pako not loaded');

    const codec = createIdentityCodec();

    expect(getRequiredShareCompressionCodec(codec)).toBe(codec);
  });
});
