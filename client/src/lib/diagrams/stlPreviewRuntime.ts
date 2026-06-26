export type StlViewMode = 'solid' | 'angle' | 'wireframe';

export interface StlVectorLike {
  add(vector: StlVectorLike): unknown;
  copy(vector: StlVectorLike): unknown;
  multiplyScalar(factor: number): unknown;
  subVectors(a: StlVectorLike, b: StlVectorLike): unknown;
}

export interface StlControlsView {
  camera?: {
    position: StlVectorLike;
  };
  controls?: {
    target: StlVectorLike;
    update(): void;
  };
  initialPosition?: StlVectorLike;
  initialTarget?: StlVectorLike;
}

export interface StlMaterialView {
  mesh?: {
    material?: unknown;
  };
  normalMaterial?: unknown;
  solidMaterial?: {
    wireframe?: boolean;
  };
}

export interface StlModeButtonSet {
  angle: HTMLButtonElement;
  solid: HTMLButtonElement;
  wireframe: HTMLButtonElement;
}

export interface StlToolbarOptions {
  documentRef?: Document;
  onCopy: (button: HTMLButtonElement) => void;
  onMode: (mode: StlViewMode, activeButton: HTMLButtonElement, buttons: StlModeButtonSet) => void;
  onPng: (button: HTMLButtonElement) => void;
  onZoom: (button: HTMLButtonElement) => void;
}

export interface StlImageExportView {
  camera?: unknown;
  renderer?: {
    domElement: HTMLCanvasElement;
    render(scene: unknown, camera: unknown): void;
  };
  scene?: unknown;
}

export interface StlImageExportOptions {
  clipboardItemCtor?: typeof ClipboardItem;
  createAnchor?: () => HTMLAnchorElement;
  createCanvas?: (documentRef: Document) => HTMLCanvasElement;
  documentRef?: Document;
  error?: (...args: unknown[]) => void;
  now?: () => number;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  writeClipboard?: (items: ClipboardItem[]) => Promise<void>;
}

export interface StlDisposableResource {
  dispose(): void;
}

export interface StlDisposableSceneNode {
  geometry?: StlDisposableResource;
  material?: StlDisposableResource | StlDisposableResource[];
}

export interface StlDisposableView {
  animationFrameId?: number | null;
  controls?: StlDisposableResource;
  renderer?: StlDisposableResource & {
    domElement?: HTMLElement;
  };
  scene?: {
    traverse(callback: (node: StlDisposableSceneNode) => void): void;
  };
}

export interface StlDisposeOptions {
  cancelAnimationFrameFn?: (id: number) => void;
}

export interface StlThemeThreeAdapter {
  AmbientLight?: new (...args: any[]) => unknown;
  DirectionalLight?: new (...args: any[]) => {
    position: {
      set(x: number, y: number, z: number): { normalize(): unknown };
    };
  };
  GridHelper: new (
    size: number,
    divisions: number,
    colorCenterLine: number,
    colorGrid: number
  ) => {
    geometry?: StlDisposableResource;
    material?: StlDisposableResource | StlDisposableResource[];
    position: { y: number };
  };
  Mesh: new (...args: any[]) => unknown;
  MeshStandardMaterial?: new (...args: any[]) => unknown;
  MeshNormalMaterial: new (...args: any[]) => unknown;
  OrbitControls?: new (...args: any[]) => {
    dampingFactor: number;
    dispose(): void;
    enableDamping: boolean;
    target: StlVectorLike & {
      clone(): StlVectorLike;
      set(x: number, y: number, z: number): unknown;
    };
    update(): void;
  };
  PerspectiveCamera?: new (...args: any[]) => {
    far: number;
    fov: number;
    lookAt(x: number, y: number, z: number): void;
    position: StlVectorLike & {
      clone(): StlVectorLike;
      set(x: number, y: number, z: number): unknown;
    };
    updateProjectionMatrix(): void;
  };
  Scene?: new () => {
    add(node: unknown): void;
    remove(node: unknown): void;
    traverse(callback: (node: unknown) => void): void;
  };
  STLLoader?: new () => {
    parse(buffer: ArrayBufferLike): {
      boundingBox: {
        getCenter(center: { x: number; y: number; z: number }): void;
        getSize(size: { x: number; y: number; z: number }): void;
      };
      computeBoundingBox(): void;
      computeVertexNormals(): void;
      rotateX(angle: number): void;
    };
  };
  Vector3: new () => { x: number; y: number; z: number };
  WebGLRenderer?: new (...args: any[]) => {
    dispose(): void;
    domElement: HTMLCanvasElement;
    render(scene: unknown, camera: unknown): void;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number): void;
  };
}

export interface StlThemeView {
  gridHelper?: {
    geometry?: StlDisposableResource;
    material?: StlDisposableResource | StlDisposableResource[];
    position?: { y: number };
  };
  mesh?: {
    geometry?: {
      boundingBox?: {
        getSize(size: { x: number; y: number; z: number }): void;
      } | null;
    };
  };
  scene?: {
    add(node: unknown): void;
    remove(node: unknown): void;
    traverse(callback: (node: unknown) => void): void;
  };
}

export interface StlRenderOptions {
  devicePixelRatio?: number;
  getActiveView?: (viewId: string) => { animationFrameId?: number | null } | undefined;
  getTheme?: () => string;
  requestAnimationFrameFn?: (callback: FrameRequestCallback) => number;
  setActiveView?: (viewId: string, view: StlRenderedView) => void;
  textEncoder?: Pick<TextEncoder, 'encode'>;
  three: Required<Pick<
    StlThemeThreeAdapter,
    | 'AmbientLight'
    | 'DirectionalLight'
    | 'GridHelper'
    | 'Mesh'
    | 'MeshNormalMaterial'
    | 'MeshStandardMaterial'
    | 'OrbitControls'
    | 'PerspectiveCamera'
    | 'Scene'
    | 'STLLoader'
    | 'Vector3'
    | 'WebGLRenderer'
  >>;
}

export interface StlRenderedView extends StlControlsView, StlMaterialView, StlDisposableView, StlThemeView, StlImageExportView {
  animationFrameId: number | null;
  camera: NonNullable<StlControlsView['camera']> & NonNullable<StlImageExportView['camera']>;
  container: HTMLElement;
  controls: NonNullable<StlControlsView['controls']> & StlDisposableResource;
  gridHelper: NonNullable<StlThemeView['gridHelper']>;
  initialPosition: StlVectorLike;
  initialTarget: StlVectorLike;
  mesh: NonNullable<StlMaterialView['mesh']> & NonNullable<StlThemeView['mesh']>;
  normalMaterial: NonNullable<StlMaterialView['normalMaterial']>;
  renderer: NonNullable<StlImageExportView['renderer']> & NonNullable<StlDisposableView['renderer']>;
  scene: NonNullable<StlThemeView['scene']> & NonNullable<StlDisposableView['scene']> & NonNullable<StlImageExportView['scene']>;
  solidMaterial: NonNullable<StlMaterialView['solidMaterial']>;
}

export function zoomStlView(
  view: StlControlsView | null | undefined,
  factor: number,
  createVector: () => StlVectorLike
): boolean {
  if (!view?.camera || !view.controls) return false;

  const camera = view.camera;
  const controls = view.controls;
  const offset = createVector();
  offset.subVectors(camera.position, controls.target);
  offset.multiplyScalar(factor);
  camera.position.copy(controls.target);
  camera.position.add(offset);
  controls.update();
  return true;
}

export function resetStlViewToInitial(view: StlControlsView | null | undefined): boolean {
  if (!view?.camera || !view.controls || !view.initialPosition || !view.initialTarget) {
    return false;
  }

  view.camera.position.copy(view.initialPosition);
  view.controls.target.copy(view.initialTarget);
  view.controls.update();
  return true;
}

export function applyStlMaterialMode(
  view: StlMaterialView | null | undefined,
  mode: StlViewMode
): boolean {
  if (!view?.mesh || !view.solidMaterial || !view.normalMaterial) return false;

  if (mode === 'angle') {
    view.mesh.material = view.normalMaterial;
    return true;
  }

  view.solidMaterial.wireframe = mode === 'wireframe';
  view.mesh.material = view.solidMaterial;
  return true;
}

export function setActiveStlModeButton(
  buttons: Iterable<HTMLElement | null | undefined>,
  activeButton: HTMLElement | null | undefined
): void {
  for (const button of buttons) {
    button?.classList.remove('active');
  }
  activeButton?.classList.add('active');
}

export function renderStlModelInContainer(
  container: HTMLElement,
  code: string,
  viewId: string,
  options: StlRenderOptions
): StlRenderedView {
  const three = options.three;
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 400;
  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(45, width / height, 0.1, 1000);
  const renderer = new three.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(options.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1, 2));
  container.appendChild(renderer.domElement);

  const controls = new three.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  scene.add(new three.AmbientLight(0x404040, 1.2));

  const keyLight = new three.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(1, 1, 1).normalize();
  scene.add(keyLight);

  const fillLight = new three.DirectionalLight(0xddddff, 0.4);
  fillLight.position.set(-1, 0.5, -1).normalize();
  scene.add(fillLight);

  const rimLight = new three.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(-0.5, -1, 0.5).normalize();
  scene.add(rimLight);

  const encoder = options.textEncoder ?? new TextEncoder();
  const loader = new three.STLLoader();
  const geometry = loader.parse(encoder.encode(code).buffer);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const boundingBox = geometry.boundingBox;
  const center = new three.Vector3();
  boundingBox.getCenter(center);
  const size = new three.Vector3();
  boundingBox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  const currentTheme = options.getTheme ? options.getTheme() : 'light';
  const gridColorCenter = currentTheme === 'dark' ? 0x888888 : 0xaaaaaa;
  const gridColor = currentTheme === 'dark' ? 0x333742 : 0xcccccc;
  const gridHelper = new three.GridHelper(maxDim * 15, 30, gridColorCenter, gridColor);
  gridHelper.position.y = -size.y / 2;
  scene.add(gridHelper);

  const matColor = currentTheme === 'dark' ? 0x90caf9 : 0x1976d2;
  const solidMaterial = new three.MeshStandardMaterial({
    color: matColor,
    roughness: 0.4,
    metalness: 0.6
  });
  const normalMaterial = new three.MeshNormalMaterial();
  const mesh = new three.Mesh(geometry, solidMaterial);
  (mesh as { position: { sub(vector: unknown): unknown } }).position.sub(center);
  scene.add(mesh);

  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.4;
  camera.position.set(0, maxDim * 0.9, cameraZ * 1.4);
  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  camera.far = maxDim * 50;
  camera.updateProjectionMatrix();

  const initialPosition = camera.position.clone();
  const initialTarget = controls.target.clone();
  const requestAnimationFrameFn = options.requestAnimationFrameFn ?? requestAnimationFrame;
  let animationFrameId: number;
  const animate = () => {
    animationFrameId = requestAnimationFrameFn(animate);
    controls.update();
    renderer.render(scene, camera);
    const activeView = options.getActiveView ? options.getActiveView(viewId) : view;
    if (activeView) {
      activeView.animationFrameId = animationFrameId;
    }
  };
  const view = {
    animationFrameId: null,
    camera,
    container,
    controls,
    gridHelper,
    initialPosition,
    initialTarget,
    mesh,
    normalMaterial,
    renderer,
    scene,
    solidMaterial
  } as StlRenderedView;

  options.setActiveView?.(viewId, view);
  animate();
  return view;
}

function createButton(
  documentRef: Document,
  className: string,
  html: string,
  options: { ariaLabel?: string; dataMode?: StlViewMode; title?: string } = {}
): HTMLButtonElement {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = className;
  if (options.dataMode) button.setAttribute('data-mode', options.dataMode);
  if (options.title) button.title = options.title;
  if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);
  button.innerHTML = html;
  return button;
}

export function addStlPreviewToolbar(
  container: Element | null | undefined,
  options: StlToolbarOptions
): HTMLElement | null {
  if (!container) return null;

  container.querySelector('.stl-toolbar')?.remove();
  const documentRef = options.documentRef ?? container.ownerDocument ?? document;
  const toolbar = documentRef.createElement('div');
  toolbar.className = 'stl-toolbar';
  toolbar.setAttribute('aria-label', 'Model actions');

  const buttons: StlModeButtonSet = {
    solid: createButton(
      documentRef,
      'stl-toolbar-btn active',
      '<i class="bi bi-circle-fill"></i> Solid',
      { dataMode: 'solid' }
    ),
    angle: createButton(
      documentRef,
      'stl-toolbar-btn',
      '<i class="bi bi-circle-half"></i> Surface Angle',
      { dataMode: 'angle' }
    ),
    wireframe: createButton(
      documentRef,
      'stl-toolbar-btn',
      '<i class="bi bi-grid-3x3"></i> Wireframe',
      { dataMode: 'wireframe' }
    )
  };
  const zoomButton = createButton(
    documentRef,
    'stl-toolbar-btn btn-zoom',
    '<i class="bi bi-arrows-fullscreen"></i>',
    { ariaLabel: 'Zoom model', title: 'Zoom model' }
  );
  const copyButton = createButton(
    documentRef,
    'stl-toolbar-btn btn-copy',
    '<i class="bi bi-clipboard-image"></i> Copy',
    { ariaLabel: 'Copy image to clipboard', title: 'Copy image to clipboard' }
  );
  const pngButton = createButton(
    documentRef,
    'stl-toolbar-btn btn-png',
    '<i class="bi bi-file-image"></i> PNG',
    { ariaLabel: 'Download PNG', title: 'Download PNG' }
  );

  toolbar.append(
    buttons.solid,
    buttons.angle,
    buttons.wireframe,
    zoomButton,
    copyButton,
    pngButton
  );
  container.appendChild(toolbar);

  buttons.solid.addEventListener('click', () => options.onMode('solid', buttons.solid, buttons));
  buttons.angle.addEventListener('click', () => options.onMode('angle', buttons.angle, buttons));
  buttons.wireframe.addEventListener('click', () => options.onMode('wireframe', buttons.wireframe, buttons));
  zoomButton.addEventListener('click', () => options.onZoom(zoomButton));
  copyButton.addEventListener('click', () => options.onCopy(copyButton));
  pngButton.addEventListener('click', () => options.onPng(pngButton));

  return toolbar;
}

function restoreButton(button: HTMLElement, originalHtml: string, options: StlImageExportOptions): void {
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  setTimeoutFn(() => {
    button.innerHTML = originalHtml;
  }, 1500);
}

function createExportCanvas(
  view: StlImageExportView,
  options: StlImageExportOptions
): HTMLCanvasElement {
  const documentRef = options.documentRef ?? document;
  const webglCanvas = view.renderer!.domElement;
  const canvas = options.createCanvas
    ? options.createCanvas(documentRef)
    : documentRef.createElement('canvas');
  canvas.width = webglCanvas.width;
  canvas.height = webglCanvas.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(webglCanvas, 0, 0);
  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function exportStlViewImage(
  view: StlImageExportView | null | undefined,
  isDownload: boolean,
  button: HTMLElement,
  originalHtml: string,
  options: StlImageExportOptions = {}
): Promise<boolean> {
  if (!view?.renderer || !view.scene || !view.camera) return false;

  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    view.renderer.render(view.scene, view.camera);
    const canvas = createExportCanvas(view, options);

    if (isDownload) {
      const anchor = options.createAnchor ? options.createAnchor() : document.createElement('a');
      anchor.href = canvas.toDataURL('image/png');
      anchor.download = `model-${options.now ? options.now() : Date.now()}.png`;
      anchor.click();
      button.innerHTML = '<i class="bi bi-check-lg"></i>';
      restoreButton(button, originalHtml, options);
      return true;
    }

    const blob = await canvasToPngBlob(canvas);
    const ClipboardItemCtor = options.clipboardItemCtor ?? ClipboardItem;
    const writeClipboard = options.writeClipboard ?? ((items) => navigator.clipboard.write(items));
    await writeClipboard([
      new ClipboardItemCtor({ 'image/png': blob })
    ]);
    button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
    restoreButton(button, originalHtml, options);
    return true;
  } catch (error) {
    options.error?.(error);
    button.innerHTML = '<i class="bi bi-x-lg"></i>';
    restoreButton(button, originalHtml, options);
    return true;
  }
}

function disposeMaterial(material: StlDisposableResource | StlDisposableResource[] | undefined): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material?.dispose();
}

export function disposeStlViewResources(
  view: StlDisposableView | null | undefined,
  options: StlDisposeOptions = {}
): boolean {
  if (!view) return false;

  if (view.animationFrameId) {
    const cancelAnimationFrameFn = options.cancelAnimationFrameFn ?? cancelAnimationFrame;
    cancelAnimationFrameFn(view.animationFrameId);
  }

  view.controls?.dispose();
  view.scene?.traverse((node) => {
    node.geometry?.dispose();
    disposeMaterial(node.material);
  });

  if (view.renderer) {
    view.renderer.dispose();
    const canvas = view.renderer.domElement;
    if (canvas?.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }
  }

  return true;
}

export function updateStlViewTheme(
  view: StlThemeView | null | undefined,
  theme: string,
  three: StlThemeThreeAdapter
): boolean {
  if (!view?.scene) return false;

  const matColor = theme === 'dark' ? 0x90caf9 : 0x1976d2;
  view.scene.traverse((child) => {
    const material = (child as { material?: unknown }).material;
    if (
      child instanceof three.Mesh &&
      material &&
      !(material instanceof three.MeshNormalMaterial)
    ) {
      const themedMaterial = material as {
        color?: { setHex(color: number): void };
        needsUpdate?: boolean;
      };
      themedMaterial.color?.setHex(matColor);
      themedMaterial.needsUpdate = true;
    }
  });

  if (!view.gridHelper) return true;

  view.scene.remove(view.gridHelper);
  view.gridHelper.geometry?.dispose();
  disposeMaterial(view.gridHelper.material);

  const boundingBox = view.mesh?.geometry?.boundingBox;
  if (!boundingBox) return true;

  const size = new three.Vector3();
  boundingBox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const gridColorCenter = theme === 'dark' ? 0x555555 : 0xbbbbbb;
  const gridColor = theme === 'dark' ? 0x2d3139 : 0xe5e5e5;
  const newGrid = new three.GridHelper(maxDim * 3, 20, gridColorCenter, gridColor);
  newGrid.position.y = -size.y / 2;
  view.scene.add(newGrid);
  view.gridHelper = newGrid;
  return true;
}
