export interface ShareCompressionCodec {
  deflate(input: Uint8Array): Uint8Array;
  inflate(input: Uint8Array): Uint8Array;
}

export function getRequiredShareCompressionCodec(codec: unknown): ShareCompressionCodec {
  if (
    !codec
    || typeof (codec as ShareCompressionCodec).deflate !== 'function'
    || typeof (codec as ShareCompressionCodec).inflate !== 'function'
  ) {
    throw new Error('pako not loaded');
  }

  return codec as ShareCompressionCodec;
}

function uint8ArrayToBinary(input: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < input.length; i += chunkSize) {
    binary += String.fromCharCode(...input.subarray(i, i + chunkSize));
  }

  return binary;
}

function binaryToUint8Array(input: string): Uint8Array {
  return Uint8Array.from(input, (character) => character.charCodeAt(0));
}

export function encodeMarkdownForShare(text: string, codec: ShareCompressionCodec): string {
  const compressed = codec.deflate(new TextEncoder().encode(text));
  const binary = uint8ArrayToBinary(compressed);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeMarkdownFromShare(encoded: string, codec: ShareCompressionCodec): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = binaryToUint8Array(binary);

  return new TextDecoder().decode(codec.inflate(bytes));
}
