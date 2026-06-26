export type DeflateOptions = {
  level?: number;
  raw?: boolean;
};

export type PakoLike = {
  deflate(input: Uint8Array, options?: DeflateOptions): Uint8Array;
};

export type Base64Encoder = (binary: string) => string;

export function encode6bit(value: number): string {
  let b = value;
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}

export function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return [
    encode6bit(c1 & 0x3f),
    encode6bit(c2 & 0x3f),
    encode6bit(c3 & 0x3f),
    encode6bit(c4 & 0x3f)
  ].join('');
}

export function encodePlantUML(text: string, pako: PakoLike): string {
  if (!pako) {
    throw new Error('pako is not loaded');
  }
  const utf8 = new TextEncoder().encode(text);
  const compressed = pako.deflate(utf8, { level: 9, raw: true });
  let result = '';
  for (let i = 0; i < compressed.length; i += 3) {
    const b1 = compressed[i];
    const b2 = i + 1 < compressed.length ? compressed[i + 1] : 0;
    const b3 = i + 2 < compressed.length ? compressed[i + 2] : 0;
    result += append3bytes(b1, b2, b3);
  }
  return result;
}

export function encodeKrokiD2(
  text: string,
  pako: PakoLike,
  base64Encode: Base64Encoder = (binary) => btoa(binary)
): string {
  if (!pako) {
    throw new Error('pako is not loaded');
  }
  const utf8 = new TextEncoder().encode(text);
  const compressed = pako.deflate(utf8, { level: 9 });
  let binary = '';
  const len = compressed.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(compressed[i]);
  }
  return base64Encode(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
