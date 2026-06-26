// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  addStlPreviewToolbar,
  applyStlMaterialMode,
  disposeStlViewResources,
  exportStlViewImage,
  renderStlModelInContainer,
  resetStlViewToInitial,
  setActiveStlModeButton,
  updateStlViewTheme,
  zoomStlView,
  type StlVectorLike
} from '../../../lib/diagrams/stlPreviewRuntime';

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

class RenderVector extends TestVector {
  clone(): RenderVector {
    return new RenderVector(this.x, this.y, this.z);
  }

  normalize(): this {
    return this;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  sub(vector: StlVectorLike): this {
    const next = vector as TestVector;
    this.x -= next.x;
    this.y -= next.y;
    this.z -= next.z;
    return this;
  }
}

describe('STL preview runtime helpers', () => {
  it('zooms a view around the orbit target', () => {
    const update = vi.fn();
    const view = {
      camera: { position: new TestVector(4, 4, 4) },
      controls: { target: new TestVector(1, 1, 1), update }
    };

    expect(zoomStlView(view, 2, () => new TestVector(0, 0, 0))).toBe(true);

    expect(view.camera.position).toMatchObject({ x: 7, y: 7, z: 7 });
    expect(update).toHaveBeenCalledOnce();
  });

  it('resets a view to its initial position and target', () => {
    const update = vi.fn();
    const view = {
      camera: { position: new TestVector(4, 4, 4) },
      controls: { target: new TestVector(1, 1, 1), update },
      initialPosition: new TestVector(9, 8, 7),
      initialTarget: new TestVector(3, 2, 1)
    };

    expect(resetStlViewToInitial(view)).toBe(true);

    expect(view.camera.position).toMatchObject({ x: 9, y: 8, z: 7 });
    expect(view.controls.target).toMatchObject({ x: 3, y: 2, z: 1 });
    expect(update).toHaveBeenCalledOnce();
  });

  it('applies STL material modes', () => {
    const solidMaterial = { wireframe: true };
    const normalMaterial = { normal: true };
    const view = {
      mesh: { material: null as unknown },
      normalMaterial,
      solidMaterial
    };

    expect(applyStlMaterialMode(view, 'solid')).toBe(true);
    expect(solidMaterial.wireframe).toBe(false);
    expect(view.mesh.material).toBe(solidMaterial);

    expect(applyStlMaterialMode(view, 'angle')).toBe(true);
    expect(view.mesh.material).toBe(normalMaterial);

    expect(applyStlMaterialMode(view, 'wireframe')).toBe(true);
    expect(solidMaterial.wireframe).toBe(true);
    expect(view.mesh.material).toBe(solidMaterial);
  });

  it('updates active STL mode buttons', () => {
    const solid = document.createElement('button');
    const angle = document.createElement('button');
    solid.classList.add('active');

    setActiveStlModeButton([solid, angle], angle);

    expect(solid.classList.contains('active')).toBe(false);
    expect(angle.classList.contains('active')).toBe(true);
  });

  it('renders an STL model with injected Three.js primitives', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 240 });
    const encodedBuffer = new ArrayBuffer(8);
    const encode = vi.fn(() => ({ buffer: encodedBuffer }) as Uint8Array);
    const requestAnimationFrameFn = vi.fn(() => 77);
    const activeViews = new Map<string, { animationFrameId?: number | null }>();
    const renderers: WebGLRenderer[] = [];
    const loaders: STLLoader[] = [];

    class Scene {
      added: unknown[] = [];
      add = vi.fn((node: unknown) => {
        this.added.push(node);
      });
      remove = vi.fn();
      traverse = vi.fn();
    }
    class PerspectiveCamera {
      far = 0;
      position = new RenderVector(0, 0, 0);
      lookAt = vi.fn();
      updateProjectionMatrix = vi.fn();
      constructor(
        public fov: number,
        public aspect: number,
        public near: number,
        public farPlane: number
      ) {}
    }
    class WebGLRenderer {
      domElement = document.createElement('canvas');
      render = vi.fn();
      setPixelRatio = vi.fn();
      setSize = vi.fn();
      dispose = vi.fn();
      constructor(public options: unknown) {
        renderers.push(this);
      }
    }
    class OrbitControls {
      dampingFactor = 0;
      enableDamping = false;
      dispose = vi.fn();
      target = new RenderVector(0, 0, 0);
      update = vi.fn();
      constructor(
        public camera: PerspectiveCamera,
        public domElement: HTMLCanvasElement
      ) {}
    }
    class AmbientLight {
      constructor(public color: number, public intensity: number) {}
    }
    class DirectionalLight {
      position = new RenderVector(0, 0, 0);
      constructor(public color: number, public intensity: number) {}
    }
    class Geometry {
      rotateX = vi.fn();
      computeBoundingBox = vi.fn();
      computeVertexNormals = vi.fn();
      boundingBox = {
        getCenter: (center: RenderVector) => {
          center.set(1, 2, 3);
        },
        getSize: (size: RenderVector) => {
          size.set(2, 4, 6);
        }
      };
    }
    class STLLoader {
      geometry = new Geometry();
      parse = vi.fn(() => this.geometry);
      constructor() {
        loaders.push(this);
      }
    }
    class GridHelper {
      position = new RenderVector(0, 0, 0);
      constructor(
        public size: number,
        public divisions: number,
        public colorCenterLine: number,
        public colorGrid: number
      ) {}
    }
    class MeshStandardMaterial {
      wireframe = false;
      constructor(public options: unknown) {}
    }
    class MeshNormalMaterial {}
    class Mesh {
      position = new RenderVector(0, 0, 0);
      constructor(public geometry: Geometry, public material: unknown) {}
    }

    const view = renderStlModelInContainer(container, 'solid stl', 'view-1', {
      three: {
        AmbientLight,
        DirectionalLight,
        GridHelper,
        Mesh,
        MeshNormalMaterial,
        MeshStandardMaterial,
        OrbitControls,
        PerspectiveCamera,
        Scene,
        STLLoader,
        Vector3: RenderVector,
        WebGLRenderer
      },
      devicePixelRatio: 3,
      getActiveView: (id) => activeViews.get(id),
      getTheme: () => 'dark',
      requestAnimationFrameFn,
      setActiveView: (id, activeView) => activeViews.set(id, activeView),
      textEncoder: { encode } as unknown as TextEncoder
    });

    expect(container.contains(renderers[0].domElement)).toBe(true);
    expect(renderers[0].options).toEqual({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    expect(renderers[0].setSize).toHaveBeenCalledWith(320, 240);
    expect(renderers[0].setPixelRatio).toHaveBeenCalledWith(2);
    expect(encode).toHaveBeenCalledWith('solid stl');
    expect(loaders[0].parse).toHaveBeenCalledWith(encodedBuffer);
    expect(loaders[0].geometry.rotateX).toHaveBeenCalledWith(-Math.PI / 2);
    expect(loaders[0].geometry.computeBoundingBox).toHaveBeenCalledOnce();
    expect(loaders[0].geometry.computeVertexNormals).toHaveBeenCalledOnce();
    expect(view.gridHelper).toMatchObject({
      colorCenterLine: 0x888888,
      colorGrid: 0x333742,
      divisions: 30,
      size: 90
    });
    expect((view.gridHelper as GridHelper).position.y).toBe(-2);
    expect(view.solidMaterial).toMatchObject({
      options: {
        color: 0x90caf9,
        metalness: 0.6,
        roughness: 0.4
      }
    });
    expect((view.mesh as Mesh).position).toMatchObject({ x: -1, y: -2, z: -3 });
    expect((view.camera as PerspectiveCamera).position.y).toBeCloseTo(5.4);
    expect((view.camera as PerspectiveCamera).far).toBe(300);
    expect((view.camera as PerspectiveCamera).updateProjectionMatrix).toHaveBeenCalledOnce();
    expect((view.controls as OrbitControls).enableDamping).toBe(true);
    expect((view.controls as OrbitControls).dampingFactor).toBe(0.05);
    expect(view.controls.update).toHaveBeenCalledOnce();
    expect(renderers[0].render).toHaveBeenCalledWith(view.scene, view.camera);
    expect(requestAnimationFrameFn).toHaveBeenCalledWith(expect.any(Function));
    expect(view.animationFrameId).toBe(77);
    expect(activeViews.get('view-1')).toBe(view);
  });

  it('adds the STL toolbar and dispatches actions', () => {
    const container = document.createElement('div');
    const oldToolbar = document.createElement('div');
    oldToolbar.className = 'stl-toolbar';
    container.appendChild(oldToolbar);
    const onMode = vi.fn();
    const onZoom = vi.fn();
    const onCopy = vi.fn();
    const onPng = vi.fn();

    const toolbar = addStlPreviewToolbar(container, {
      onCopy,
      onMode,
      onPng,
      onZoom
    });

    expect(toolbar).not.toBeNull();
    expect(container.querySelectorAll('.stl-toolbar')).toHaveLength(1);
    expect(container.querySelector('[data-mode="solid"]')?.innerHTML).toBe('<i class="bi bi-circle-fill"></i> Solid');
    expect(container.querySelector('[data-mode="angle"]')?.textContent).toBe(' Surface Angle');
    expect(container.querySelector('[data-mode="wireframe"]')?.textContent).toBe(' Wireframe');
    expect(container.querySelector<HTMLButtonElement>('.btn-zoom')?.getAttribute('aria-label')).toBe('Zoom model');
    expect(container.querySelector<HTMLButtonElement>('.btn-copy')?.title).toBe('Copy image to clipboard');
    expect(container.querySelector<HTMLButtonElement>('.btn-png')?.title).toBe('Download PNG');

    container.querySelector<HTMLButtonElement>('[data-mode="angle"]')?.click();
    container.querySelector<HTMLButtonElement>('.btn-zoom')?.click();
    container.querySelector<HTMLButtonElement>('.btn-copy')?.click();
    container.querySelector<HTMLButtonElement>('.btn-png')?.click();

    expect(onMode).toHaveBeenCalledWith(
      'angle',
      container.querySelector('[data-mode="angle"]'),
      expect.objectContaining({
        angle: container.querySelector('[data-mode="angle"]'),
        solid: container.querySelector('[data-mode="solid"]'),
        wireframe: container.querySelector('[data-mode="wireframe"]')
      })
    );
    expect(onZoom).toHaveBeenCalledWith(container.querySelector('.btn-zoom'));
    expect(onCopy).toHaveBeenCalledWith(container.querySelector('.btn-copy'));
    expect(onPng).toHaveBeenCalledWith(container.querySelector('.btn-png'));
  });

  it('downloads STL views as white-background PNG images', async () => {
    const pngDataUrl = 'data:image/png;base64,abc';
    const button = document.createElement('button');
    const anchor = document.createElement('a');
    const click = vi.fn();
    const setTimeoutFn = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    const webglCanvas = { height: 80, width: 160 } as HTMLCanvasElement;
    const context = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: ''
    };
    const canvas = {
      height: 0,
      width: 0,
      getContext: vi.fn(() => context),
      toDataURL: vi.fn(() => pngDataUrl)
    } as unknown as HTMLCanvasElement;
    const view = {
      camera: {},
      renderer: {
        domElement: webglCanvas,
        render: vi.fn()
      },
      scene: {}
    };
    anchor.click = click;
    button.innerHTML = 'Original';

    await exportStlViewImage(view, true, button, 'Original', {
      createAnchor: () => anchor,
      createCanvas: () => canvas,
      now: () => 123,
      setTimeoutFn
    });

    expect(view.renderer.render).toHaveBeenCalledWith(view.scene, view.camera);
    expect(canvas.width).toBe(160);
    expect(canvas.height).toBe(80);
    expect(context.fillStyle).toBe('#ffffff');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 160, 80);
    expect(context.drawImage).toHaveBeenCalledWith(webglCanvas, 0, 0);
    expect(anchor.href).toBe(pngDataUrl);
    expect(anchor.download).toBe('model-123.png');
    expect(click).toHaveBeenCalledOnce();
    expect(button.innerHTML).toBe('Original');
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1500);
  });

  it('copies STL view PNG images to the clipboard', async () => {
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    const button = document.createElement('button');
    const writeClipboard = vi.fn(() => Promise.resolve());
    const canvas = {
      height: 0,
      width: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: ''
      })),
      toBlob: vi.fn((callback: BlobCallback) => callback(pngBlob))
    } as unknown as HTMLCanvasElement;
    class TestClipboardItem {
      value: Record<string, Blob>;
      constructor(value: Record<string, Blob>) {
        this.value = value;
      }
    }
    const view = {
      camera: {},
      renderer: {
        domElement: { height: 40, width: 90 } as HTMLCanvasElement,
        render: vi.fn()
      },
      scene: {}
    };
    button.innerHTML = 'Original';

    await exportStlViewImage(view, false, button, 'Original', {
      clipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
      createCanvas: () => canvas,
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      },
      writeClipboard
    });

    expect(writeClipboard).toHaveBeenCalledWith([expect.any(TestClipboardItem)]);
    expect(button.innerHTML).toBe('Original');
  });

  it('shows failure feedback when STL clipboard export fails', async () => {
    const button = document.createElement('button');
    const error = vi.fn();
    const restoreCallbacks: Array<() => void> = [];
    const canvas = {
      height: 0,
      width: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: ''
      })),
      toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })))
    } as unknown as HTMLCanvasElement;
    class TestClipboardItem {
      constructor(_value: Record<string, Blob>) {}
    }
    const view = {
      camera: {},
      renderer: {
        domElement: { height: 40, width: 90 } as HTMLCanvasElement,
        render: vi.fn()
      },
      scene: {}
    };
    button.innerHTML = 'Original';

    await exportStlViewImage(view, false, button, 'Original', {
      clipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
      createCanvas: () => canvas,
      error,
      setTimeoutFn: (callback) => {
        restoreCallbacks.push(callback);
        return 1;
      },
      writeClipboard: vi.fn(() => Promise.reject(new Error('denied')))
    });

    expect(error).toHaveBeenCalledWith(expect.any(Error));
    expect(button.innerHTML).toBe('<i class="bi bi-x-lg"></i>');
    restoreCallbacks[0]();
    expect(button.innerHTML).toBe('Original');
  });

  it('disposes STL view resources and removes the renderer canvas', () => {
    const cancelAnimationFrameFn = vi.fn();
    const controlsDispose = vi.fn();
    const rendererDispose = vi.fn();
    const geometryDispose = vi.fn();
    const materialDispose = vi.fn();
    const arrayMaterialDispose = vi.fn();
    const canvas = document.createElement('canvas');
    const parent = document.createElement('div');
    parent.appendChild(canvas);
    const view = {
      animationFrameId: 42,
      controls: { dispose: controlsDispose },
      renderer: {
        dispose: rendererDispose,
        domElement: canvas
      },
      scene: {
        traverse: vi.fn((callback: (node: { geometry?: { dispose(): void }; material?: Array<{ dispose(): void }> | { dispose(): void } }) => void) => {
          callback({
            geometry: { dispose: geometryDispose },
            material: { dispose: materialDispose }
          });
          callback({
            material: [{ dispose: arrayMaterialDispose }]
          });
        })
      }
    };

    expect(disposeStlViewResources(view, { cancelAnimationFrameFn })).toBe(true);

    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(42);
    expect(controlsDispose).toHaveBeenCalledOnce();
    expect(view.scene.traverse).toHaveBeenCalledOnce();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(arrayMaterialDispose).toHaveBeenCalledOnce();
    expect(rendererDispose).toHaveBeenCalledOnce();
    expect(parent.contains(canvas)).toBe(false);
  });

  it('ignores missing STL views during disposal', () => {
    expect(disposeStlViewResources(null)).toBe(false);
  });

  it('updates STL material and grid colors for the active theme', () => {
    class Mesh {
      constructor(public material: unknown) {}
    }
    class MeshNormalMaterial {}
    class Vector3 {
      x = 0;
      y = 0;
      z = 0;
    }
    class GridHelper {
      position = { y: 0 };
      constructor(
        public size: number,
        public divisions: number,
        public colorCenterLine: number,
        public colorGrid: number
      ) {}
    }
    const setHex = vi.fn();
    const themedMaterial = {
      color: { setHex },
      needsUpdate: false
    };
    const normalMaterial = new MeshNormalMaterial();
    const oldGridDispose = vi.fn();
    const remove = vi.fn();
    const add = vi.fn();
    const oldGrid = {
      geometry: { dispose: oldGridDispose },
      material: { dispose: vi.fn() },
      position: { y: 0 }
    };
    const view = {
      gridHelper: oldGrid,
      mesh: {
        geometry: {
          boundingBox: {
            getSize: (size: Vector3) => {
              size.x = 2;
              size.y = 4;
              size.z = 6;
            }
          }
        }
      },
      scene: {
        add,
        remove,
        traverse: vi.fn((callback: (node: unknown) => void) => {
          callback(new Mesh(themedMaterial));
          callback(new Mesh(normalMaterial));
        })
      }
    };

    expect(updateStlViewTheme(view, 'dark', {
      GridHelper,
      Mesh,
      MeshNormalMaterial,
      Vector3
    })).toBe(true);

    expect(setHex).toHaveBeenCalledWith(0x90caf9);
    expect(themedMaterial.needsUpdate).toBe(true);
    expect(remove).toHaveBeenCalledWith(oldGrid);
    expect(oldGridDispose).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledWith(expect.any(GridHelper));
    expect(view.gridHelper).toBeInstanceOf(GridHelper);
    expect(view.gridHelper).toMatchObject({
      colorCenterLine: 0x555555,
      colorGrid: 0x2d3139,
      divisions: 20,
      position: { y: -2 },
      size: 18
    });
  });
});
