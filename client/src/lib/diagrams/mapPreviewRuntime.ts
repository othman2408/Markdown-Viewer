export interface MapTileTheme {
  attribution: string;
  url: string;
}

export interface TopoJsonAdapter {
  feature(topology: unknown, object: unknown): GeoJsonFeature | GeoJsonFeatureCollection;
}

export interface GeoJsonFeature {
  properties?: Record<string, unknown>;
  type: string;
}

export interface GeoJsonFeatureCollection {
  features: GeoJsonFeature[];
  type: 'FeatureCollection';
}

export interface LeafletTileLayerLike {
  setAttribution(attribution: string): void;
  setUrl(url: string): void;
}

export interface LeafletMapLike {
  eachLayer(callback: (layer: unknown) => void): void;
  fitBounds(bounds: unknown): void;
  setView(center: [number, number], zoom: number): void;
}

export interface LeafletBoundsLike {
  isValid(): boolean;
}

export interface LeafletGeoJsonLayerLike {
  addTo(map: LeafletMapLike): LeafletGeoJsonLayerLike;
  getBounds(): LeafletBoundsLike;
}

export interface LeafletLayerLike {
  bindPopup(html: string): void;
}

export interface LeafletAdapter {
  geoJSON(
    data: unknown,
    options: {
      onEachFeature(feature: GeoJsonFeature, layer: LeafletLayerLike): void;
    }
  ): LeafletGeoJsonLayerLike;
  map(node: Element): LeafletMapLike;
  tileLayer(
    url: string,
    options: {
      attribution: string;
      maxZoom: number;
    }
  ): {
    addTo(map: LeafletMapLike): unknown;
  };
}

export interface RenderLeafletMapOptions {
  error?: (...args: unknown[]) => void;
  getTheme: () => string;
  isTopo: boolean;
  leaflet: LeafletAdapter;
  topojsonAdapter?: TopoJsonAdapter;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION = ' &copy; <a href="https://carto.com/attributions">CARTO</a>';
const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isFeatureCollection(feature: GeoJsonFeature | GeoJsonFeatureCollection): feature is GeoJsonFeatureCollection {
  return feature.type === 'FeatureCollection';
}

export function getMapTileTheme(theme: string | null | undefined): MapTileTheme {
  const isDark = theme === 'dark';
  return {
    url: isDark ? DARK_TILE_URL : LIGHT_TILE_URL,
    attribution: `${OSM_ATTRIBUTION}${CARTO_ATTRIBUTION}`
  };
}

export function buildMapPopupHtml(properties: Record<string, unknown> | null | undefined): string | null {
  if (!properties) return null;

  let popupContent = '<div class="map-popup-container"><table class="map-popup-table">';
  let hasProps = false;

  Object.keys(properties).forEach((key) => {
    const val = properties[key];
    const escapedKey = escapeHtml(key);
    const escapedVal = escapeHtml(typeof val === 'object' ? JSON.stringify(val) : val);
    popupContent += `<tr><td class="prop-key">${escapedKey}</td><td class="prop-val">${escapedVal}</td></tr>`;
    hasProps = true;
  });

  popupContent += '</table></div>';
  return hasProps ? popupContent : null;
}

export function parseMapDataFromCode(
  decodedCode: string,
  isTopo: boolean,
  topojsonAdapter?: TopoJsonAdapter
): unknown {
  if (!isTopo) {
    return JSON.parse(decodedCode);
  }

  if (!topojsonAdapter) {
    throw new Error('topojson is not loaded');
  }

  const topology = JSON.parse(decodedCode);
  if (!topology || typeof topology !== 'object' || !('objects' in topology)) {
    return undefined;
  }

  const features: GeoJsonFeature[] = [];
  const objects = (topology as { objects: Record<string, unknown> }).objects;
  Object.keys(objects).forEach((key) => {
    const feature = topojsonAdapter.feature(topology, objects[key]);
    if (isFeatureCollection(feature)) {
      features.push(...feature.features);
    } else {
      features.push(feature);
    }
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

export function renderMapError(node: Element, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  node.innerHTML = `<div class="render-error-msg" style="padding: 2em; color: var(--text-color); text-align: center;">Error rendering map: ${escapeHtml(message)}</div>`;
}

export function renderLeafletMapNode(node: Element, options: RenderLeafletMapOptions): void {
  const originalCode = node.getAttribute('data-original-code');
  if (!originalCode) return;

  const decodedCode = decodeURIComponent(originalCode);
  const container = node.closest('.geojson-container') || node.closest('.topojson-container');

  try {
    const geojsonData = parseMapDataFromCode(decodedCode, options.isTopo, options.topojsonAdapter);
    if (!geojsonData) return;

    node.innerHTML = '';
    const map = options.leaflet.map(node);
    (node as Element & { _leafletMap?: LeafletMapLike })._leafletMap = map;

    const tileTheme = getMapTileTheme(options.getTheme());
    options.leaflet.tileLayer(tileTheme.url, {
      attribution: tileTheme.attribution,
      maxZoom: 19
    }).addTo(map);

    const geojsonLayer = options.leaflet.geoJSON(geojsonData, {
      onEachFeature(feature, layer) {
        const popupContent = buildMapPopupHtml(feature.properties);
        if (popupContent) {
          layer.bindPopup(popupContent);
        }
      }
    }).addTo(map);

    const bounds = geojsonLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds);
    } else {
      map.setView([0, 0], 2);
    }

    container?.classList.remove('is-loading');
  } catch (err) {
    options.error?.('Map rendering failed:', err);
    renderMapError(node, err);
    container?.classList.remove('is-loading');
  }
}

export function applyMapThemeToLeafletMaps(
  mapNodes: Element[],
  theme: string,
  isTileLayer: (layer: unknown) => boolean
): void {
  const tileTheme = getMapTileTheme(theme);
  mapNodes.forEach((node) => {
    const map = (node as Element & { _leafletMap?: LeafletMapLike })._leafletMap;
    if (!map) return;

    map.eachLayer((layer) => {
      if (!isTileLayer(layer)) return;
      const tileLayer = layer as LeafletTileLayerLike;
      tileLayer.setUrl(tileTheme.url);
      tileLayer.setAttribution(tileTheme.attribution);
    });
  });
}
