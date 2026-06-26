// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  ensureD2TransparentFill,
  ensurePlantUmlTransparentBackground,
  processRemoteImageDiagrams,
  renderRemoteImageDiagramNode,
  type RemoteDiagramPako,
  type RemoteImageDiagramConfig
} from '../../../lib/diagrams/remoteDiagramRuntime';

const fakePako: RemoteDiagramPako = {
  deflate: () => new Uint8Array([1, 2, 3])
};

function createConfig(overrides: Partial<RemoteImageDiagramConfig> = {}): RemoteImageDiagramConfig {
  return {
    containerSelector: '.diagram-container',
    imageClassName: 'diagram-img',
    imageAlt: 'Diagram',
    endpointBaseUrl: 'https://example.test/svg/',
    offlineMessage: 'Offline or unable to connect',
    encodingErrorLabel: 'Diagram',
    loadErrorMessage: 'Failed to load pako',
    encode: (code) => `encoded-${code}`,
    ...overrides
  };
}

function createNode(encodedCode = encodeURIComponent('A -> B')): { container: HTMLElement; node: HTMLElement } {
  const container = document.createElement('div');
  container.className = 'diagram-container is-loading';
  const node = document.createElement('div');
  node.className = 'diagram-node';
  node.setAttribute('data-original-code', encodedCode);
  container.appendChild(node);
  document.body.appendChild(container);
  return { container, node };
}

describe('remote image diagram runtime', () => {
  it('prepares transparent PlantUML backgrounds', () => {
    expect(ensurePlantUmlTransparentBackground('@startuml\nA -> B\n@enduml')).toBe(
      '@startuml\nskinparam backgroundColor transparent\nA -> B\n@enduml'
    );
    expect(ensurePlantUmlTransparentBackground('A -> B')).toBe(
      'skinparam backgroundColor transparent\nA -> B'
    );
    expect(ensurePlantUmlTransparentBackground('skinparam backgroundColor white\nA -> B')).toBe(
      'skinparam backgroundColor white\nA -> B'
    );
  });

  it('prepares transparent D2 fills', () => {
    expect(ensureD2TransparentFill('a -> b')).toBe('style.fill: transparent\na -> b');
    expect(ensureD2TransparentFill('style.fill: red\na -> b')).toBe('style.fill: red\na -> b');
    expect(ensureD2TransparentFill('x: { style: { fill: red } }')).toBe('x: { style: { fill: red } }');
  });

  it('renders a remote diagram image and runs toolbar setup on load', () => {
    const { container, node } = createNode();
    const onToolbarReady = vi.fn();

    renderRemoteImageDiagramNode(node, fakePako, createConfig({ onToolbarReady }));
    const img = node.querySelector('img') as HTMLImageElement;

    expect(img.src).toBe('https://example.test/svg/encoded-A%20-%3E%20B');
    expect(img.alt).toBe('Diagram');
    expect(img.className).toBe('diagram-img');
    expect(img.crossOrigin).toBe('anonymous');
    expect(img.draggable).toBe(false);

    const dragEvent = new Event('dragstart', { cancelable: true });
    img.dispatchEvent(dragEvent);
    expect(dragEvent.defaultPrevented).toBe(true);

    img.dispatchEvent(new Event('load'));
    expect(container.classList.contains('is-loading')).toBe(false);
    expect(onToolbarReady).toHaveBeenCalledOnce();
  });

  it('renders an offline message on image load failure', () => {
    const { container, node } = createNode();

    renderRemoteImageDiagramNode(node, fakePako, createConfig());
    node.querySelector('img')?.dispatchEvent(new Event('error'));

    expect(node.querySelector('.render-error-msg')?.textContent).toContain('Offline or unable to connect');
    expect(container.classList.contains('is-loading')).toBe(false);
  });

  it('renders escaped encoding errors and reports them from processing', () => {
    const { container, node } = createNode();
    const error = vi.fn();

    processRemoteImageDiagrams({
      nodes: [node],
      config: createConfig({
        encode: () => {
          throw new Error('<bad>');
        }
      }),
      renderId: 1,
      isCurrentRender: () => true,
      getPako: () => fakePako,
      loadPako: () => Promise.resolve(),
      error
    });

    expect(node.innerHTML).toContain('&lt;bad&gt;');
    expect(node.innerHTML).not.toContain('<bad>');
    expect(container.classList.contains('is-loading')).toBe(false);
    expect(error).toHaveBeenCalledWith('Diagram encoding failed:', expect.any(Error));
  });

  it('loads pako before rendering and preserves preserved render method callbacks', async () => {
    const { node } = createNode();
    let loaded = false;

    processRemoteImageDiagrams({
      nodes: [node],
      config: createConfig({ renderMethodName: 'renderDiagram' }),
      renderId: 2,
      isCurrentRender: (renderId) => renderId === 2,
      getPako: () => (loaded ? fakePako : undefined),
      loadPako: () => {
        loaded = true;
        return Promise.resolve();
      }
    });

    expect(node.querySelector('img')).toBeNull();
    await Promise.resolve();
    await Promise.resolve();

    expect(typeof (node as HTMLElement & { renderDiagram?: () => void }).renderDiagram).toBe('function');
    expect((node.querySelector('img') as HTMLImageElement).src).toBe('https://example.test/svg/encoded-A%20-%3E%20B');
  });

  it('skips rendering loaded pako for stale renders', async () => {
    const { node } = createNode();
    let loaded = false;

    processRemoteImageDiagrams({
      nodes: [node],
      config: createConfig(),
      renderId: 3,
      isCurrentRender: () => false,
      getPako: () => (loaded ? fakePako : undefined),
      loadPako: () => {
        loaded = true;
        return Promise.resolve();
      }
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(node.querySelector('img')).toBeNull();
  });

  it('clears loading and warns when pako fails to load', async () => {
    const { container, node } = createNode();
    const warn = vi.fn();
    const failure = new Error('offline');

    processRemoteImageDiagrams({
      nodes: [node],
      config: createConfig(),
      renderId: 4,
      isCurrentRender: () => true,
      getPako: () => undefined,
      loadPako: () => Promise.reject(failure),
      warn
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(container.classList.contains('is-loading')).toBe(false);
    expect(warn).toHaveBeenCalledWith('Failed to load pako', failure);
  });
});
