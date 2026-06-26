// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStlZoomModalController,
  type StlZoomModalView
} from '../../../lib/diagrams/stlZoomModalController';
import type { StlVectorLike } from '../../../lib/diagrams/stlPreviewRuntime';

class TestVector implements StlVectorLike {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}

  add(vector: StlVectorLike): this {
    const next = vector as TestVector;
    this.x += next.x;
    this.y += next.y;
    this.z += next.z;
    return this;
  }

  copy(vector: StlVectorLike): this {
    const next = vector as TestVector;
    this.x = next.x;
    this.y = next.y;
    this.z = next.z;
    return this;
  }

  multiplyScalar(factor: number): this {
    this.x *= factor;
    this.y *= factor;
    this.z *= factor;
    return this;
  }

  subVectors(a: StlVectorLike, b: StlVectorLike): this {
    const left = a as TestVector;
    const right = b as TestVector;
    this.x = left.x - right.x;
    this.y = left.y - right.y;
    this.z = left.z - right.z;
    return this;
  }
}

interface TestControllerContext {
  angleButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  controller: ReturnType<typeof createStlZoomModalController<StlZoomModalView>>;
  copyButton: HTMLButtonElement;
  disposeView: ReturnType<typeof vi.fn>;
  exportViewImage: ReturnType<typeof vi.fn>;
  modal: HTMLElement;
  pngButton: HTMLButtonElement;
  renderView: ReturnType<typeof vi.fn>;
  resetButton: HTMLButtonElement;
  solidButton: HTMLButtonElement;
  update: ReturnType<typeof vi.fn>;
  view: StlZoomModalView & {
    controls: { target: TestVector; update: () => void };
    camera: { position: TestVector };
    initialPosition: TestVector;
    initialTarget: TestVector;
    mesh: { material: unknown };
    normalMaterial: object;
    solidMaterial: { wireframe: boolean };
  };
  viewer: HTMLElement;
  wireframeButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
}

function setupDom(): void {
  document.body.innerHTML = `
    <div id="stl-zoom-modal">
      <button id="stl-zoom-modal-close"></button>
      <div id="stl-modal-viewer"></div>
      <button id="stl-modal-btn-solid"></button>
      <button id="stl-modal-btn-angle"></button>
      <button id="stl-modal-btn-wireframe"></button>
      <button id="stl-modal-btn-zoom-in"></button>
      <button id="stl-modal-btn-zoom-out"></button>
      <button id="stl-modal-btn-zoom-reset"></button>
      <button id="stl-modal-btn-copy"><i class="bi bi-clipboard-image"></i> Copy</button>
      <button id="stl-modal-btn-png"><i class="bi bi-file-image"></i> PNG</button>
    </div>
  `;
}

function createTestContext(): TestControllerContext {
  setupDom();
  const update = vi.fn();
  const view = {
    camera: { position: new TestVector(4, 4, 4) },
    controls: {
      target: new TestVector(1, 1, 1),
      update: () => {
        update();
      }
    },
    initialPosition: new TestVector(9, 8, 7),
    initialTarget: new TestVector(3, 2, 1),
    mesh: { material: null as unknown },
    normalMaterial: {},
    renderer: {
      domElement: document.createElement('canvas'),
      render: vi.fn()
    },
    scene: {},
    solidMaterial: { wireframe: true }
  } satisfies StlZoomModalView & {
    controls: { target: TestVector; update: () => void };
    camera: { position: TestVector };
    initialPosition: TestVector;
    initialTarget: TestVector;
    mesh: { material: unknown };
    normalMaterial: object;
    solidMaterial: { wireframe: boolean };
  };
  const renderView = vi.fn((container: HTMLElement) => {
    container.appendChild(document.createElement('canvas'));
    return view;
  });
  const disposeView = vi.fn();
  const exportViewImage = vi.fn();
  const controller = createStlZoomModalController({
    createVector: () => new TestVector(),
    disposeView,
    exportViewImage,
    renderView
  });

  return {
    angleButton: document.getElementById('stl-modal-btn-angle') as HTMLButtonElement,
    closeButton: document.getElementById('stl-zoom-modal-close') as HTMLButtonElement,
    controller,
    copyButton: document.getElementById('stl-modal-btn-copy') as HTMLButtonElement,
    disposeView,
    exportViewImage,
    modal: document.getElementById('stl-zoom-modal') as HTMLElement,
    pngButton: document.getElementById('stl-modal-btn-png') as HTMLButtonElement,
    renderView,
    resetButton: document.getElementById('stl-modal-btn-zoom-reset') as HTMLButtonElement,
    solidButton: document.getElementById('stl-modal-btn-solid') as HTMLButtonElement,
    update,
    view,
    viewer: document.getElementById('stl-modal-viewer') as HTMLElement,
    wireframeButton: document.getElementById('stl-modal-btn-wireframe') as HTMLButtonElement,
    zoomInButton: document.getElementById('stl-modal-btn-zoom-in') as HTMLButtonElement,
    zoomOutButton: document.getElementById('stl-modal-btn-zoom-out') as HTMLButtonElement
  };
}

describe('STL zoom modal controller', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('opens the modal, renders the model, and resets the active material button', () => {
    const context = createTestContext();
    context.viewer.innerHTML = '<span>old view</span>';
    context.angleButton.classList.add('active');

    const activeView = context.controller.open('solid model');

    expect(activeView).toBe(context.view);
    expect(context.controller.getActiveView()).toBe(context.view);
    expect(context.modal.classList.contains('active')).toBe(true);
    expect(context.viewer.querySelector('span')).toBeNull();
    expect(context.viewer.querySelector('canvas')).not.toBeNull();
    expect(context.renderView).toHaveBeenCalledWith(
      context.viewer,
      'solid model',
      'stl-modal-instance'
    );
    expect(context.solidButton.classList.contains('active')).toBe(true);
    expect(context.angleButton.classList.contains('active')).toBe(false);
  });

  it('closes from the close button and overlay while clearing modal resources', () => {
    const context = createTestContext();
    context.controller.open('solid model');

    context.viewer.click();
    expect(context.disposeView).not.toHaveBeenCalled();

    context.modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(context.modal.classList.contains('active')).toBe(false);
    expect(context.disposeView).toHaveBeenCalledWith('stl-modal-instance');
    expect(context.viewer.innerHTML).toBe('');
    expect(context.controller.getActiveView()).toBeNull();

    context.controller.open('solid model');
    context.closeButton.click();

    expect(context.disposeView).toHaveBeenCalledTimes(2);
  });

  it('dispatches zoom and reset controls to the active modal view', () => {
    const context = createTestContext();
    context.controller.open('solid model');

    context.zoomInButton.click();

    expect(context.view.camera.position.x).toBeCloseTo(3.4);
    expect(context.view.camera.position.y).toBeCloseTo(3.4);
    expect(context.view.camera.position.z).toBeCloseTo(3.4);
    expect(context.update).toHaveBeenCalledOnce();

    context.resetButton.click();

    expect(context.view.camera.position).toMatchObject({ x: 9, y: 8, z: 7 });
    expect(context.view.controls.target).toMatchObject({ x: 3, y: 2, z: 1 });
    expect(context.update).toHaveBeenCalledTimes(2);

    context.zoomOutButton.click();
    expect(context.update).toHaveBeenCalledTimes(3);
  });

  it('dispatches material mode controls and active button state', () => {
    const context = createTestContext();
    context.controller.open('solid model');

    context.wireframeButton.click();

    expect(context.view.mesh.material).toBe(context.view.solidMaterial);
    expect(context.view.solidMaterial.wireframe).toBe(true);
    expect(context.wireframeButton.classList.contains('active')).toBe(true);

    context.angleButton.click();

    expect(context.view.mesh.material).toBe(context.view.normalMaterial);
    expect(context.angleButton.classList.contains('active')).toBe(true);
    expect(context.wireframeButton.classList.contains('active')).toBe(false);

    context.solidButton.click();

    expect(context.view.mesh.material).toBe(context.view.solidMaterial);
    expect(context.view.solidMaterial.wireframe).toBe(false);
    expect(context.solidButton.classList.contains('active')).toBe(true);
  });

  it('dispatches copy and PNG export controls with original button HTML', () => {
    const context = createTestContext();
    context.controller.open('solid model');

    context.copyButton.click();
    context.pngButton.click();

    expect(context.exportViewImage).toHaveBeenNthCalledWith(
      1,
      context.view,
      false,
      context.copyButton,
      '<i class="bi bi-clipboard-image"></i> Copy'
    );
    expect(context.exportViewImage).toHaveBeenNthCalledWith(
      2,
      context.view,
      true,
      context.pngButton,
      '<i class="bi bi-file-image"></i> PNG'
    );
  });

  it('detaches modal listeners', () => {
    const context = createTestContext();
    context.controller.open('solid model');
    context.controller.detach();

    context.closeButton.click();
    context.zoomInButton.click();
    context.copyButton.click();

    expect(context.disposeView).not.toHaveBeenCalled();
    expect(context.update).not.toHaveBeenCalled();
    expect(context.exportViewImage).not.toHaveBeenCalled();
  });

  it('throws a focused error when required modal markup is missing', () => {
    document.body.innerHTML = '<div id="stl-zoom-modal"></div>';

    expect(() => createStlZoomModalController({
      createVector: () => new TestVector(),
      disposeView: vi.fn(),
      exportViewImage: vi.fn(),
      renderView: vi.fn()
    })).toThrow('Missing STL zoom modal angle button: #stl-modal-btn-angle');
  });
});
