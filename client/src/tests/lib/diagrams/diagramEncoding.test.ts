import { describe, expect, it, vi } from 'vitest';
import { append3bytes, encode6bit, encodeKrokiD2, encodePlantUML, type PakoLike } from '../../../lib/diagrams/diagramEncoding';

function createFakePako(bytes: number[]) {
  const deflate = vi.fn((_input: Uint8Array, _options?: { level?: number; raw?: boolean }) => (
    new Uint8Array(bytes)
  ));

  return {
    pako: { deflate } satisfies PakoLike,
    deflate
  };
}

describe('diagram encoding helpers', () => {
  it('maps six-bit values to PlantUML alphabet characters', () => {
    expect(encode6bit(0)).toBe('0');
    expect(encode6bit(9)).toBe('9');
    expect(encode6bit(10)).toBe('A');
    expect(encode6bit(35)).toBe('Z');
    expect(encode6bit(36)).toBe('a');
    expect(encode6bit(61)).toBe('z');
    expect(encode6bit(62)).toBe('-');
    expect(encode6bit(63)).toBe('_');
  });

  it('encodes three bytes using the PlantUML byte packing scheme', () => {
    expect(append3bytes(0, 0, 0)).toBe('0000');
    expect(append3bytes(255, 255, 255)).toBe('____');
    expect(append3bytes(1, 2, 3)).toBe('0G83');
  });

  it('deflates PlantUML text with raw compression and packs the bytes', () => {
    const { pako, deflate } = createFakePako([1, 2, 3, 255]);

    expect(encodePlantUML('@startuml\nA -> B\n@enduml', pako)).toBe('0G83_m00');
    expect(deflate).toHaveBeenCalledWith(expect.any(Uint8Array), { level: 9, raw: true });
  });

  it('deflates D2 text and normalizes base64 for Kroki URLs', () => {
    const { pako, deflate } = createFakePako([65, 66, 67]);

    expect(encodeKrokiD2('a -> b', pako, () => 'ab+/==')).toBe('ab-_');
    expect(deflate).toHaveBeenCalledWith(expect.any(Uint8Array), { level: 9 });
  });

  it('throws when pako has not loaded', () => {
    expect(() => encodePlantUML('diagram', undefined as unknown as PakoLike)).toThrow('pako is not loaded');
    expect(() => encodeKrokiD2('diagram', undefined as unknown as PakoLike)).toThrow('pako is not loaded');
  });
});
