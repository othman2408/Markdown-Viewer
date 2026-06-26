// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  applyMapThemeToLeafletMaps,
  buildMapPopupHtml,
  getMapTileTheme,
  parseMapDataFromCode,
  renderLeafletMapNode,
  renderMapError
} from '../../../lib/diagrams/mapPreviewRuntime';

describe('map preview runtime helpers', () => {
  it('builds light and dark tile theme configuration', () => {
    expect(getMapTileTheme('light')).toEqual({
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });
    expect(getMapTileTheme('dark').url).toBe('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
  });

  it('builds escaped popup HTML from feature properties', () => {
    expect(buildMapPopupHtml({
      name: '<City>',
      meta: { population: 123 }
    })).toBe(
      '<div class="map-popup-container"><table class="map-popup-table">' +
      '<tr><td class="prop-key">name</td><td class="prop-val">&lt;City&gt;</td></tr>' +
      '<tr><td class="prop-key">meta</td><td class="prop-val">{&quot;population&quot;:123}</td></tr>' +
      '</table></div>'
    );
    expect(buildMapPopupHtml({})).toBeNull();
    expect(buildMapPopupHtml(null)).toBeNull();
  });

  it('parses GeoJSON source directly', () => {
    expect(parseMapDataFromCode('{"type":"FeatureCollection","features":[]}', false)).toEqual({
      type: 'FeatureCollection',
      features: []
    });
  });

  it('converts TopoJSON objects into a FeatureCollection', () => {
    const topology = {
      type: 'Topology',
      objects: {
        places: {},
        roads: {}
      }
    };
    let callIndex = 0;
    const adapter = {
      feature: vi.fn(() => {
        callIndex += 1;
        return callIndex === 1
          ? { type: 'FeatureCollection' as const, features: [{ type: 'Feature', properties: { id: 1 } }] }
          : { type: 'Feature', properties: { id: 2 } };
      })
    };

    expect(parseMapDataFromCode(JSON.stringify(topology), true, adapter)).toEqual({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { id: 1 } },
        { type: 'Feature', properties: { id: 2 } }
      ]
    });
    expect(adapter.feature).toHaveBeenCalledTimes(2);
  });

  it('requires a topojson adapter for TopoJSON source', () => {
    expect(() => parseMapDataFromCode('{"objects":{}}', true)).toThrow('topojson is not loaded');
  });

  it('renders escaped map errors', () => {
    const node = document.createElement('div');

    renderMapError(node, new Error('<bad>'));

    expect(node.innerHTML).toContain('&lt;bad&gt;');
    expect(node.innerHTML).not.toContain('<bad>');
  });

  it('applies map theme to existing Leaflet tile layers', () => {
    const node = document.createElement('div') as HTMLElement & { _leafletMap?: { eachLayer: (callback: (layer: unknown) => void) => void } };
    const tileLayer = {
      setUrl: vi.fn(),
      setAttribution: vi.fn(),
      kind: 'tile'
    };
    const otherLayer = { kind: 'marker' };
    node._leafletMap = {
      eachLayer(callback) {
        callback(tileLayer);
        callback(otherLayer);
      }
    };

    applyMapThemeToLeafletMaps([node], 'dark', (layer) => (layer as { kind?: string }).kind === 'tile');

    expect(tileLayer.setUrl).toHaveBeenCalledWith('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
    expect(tileLayer.setAttribution).toHaveBeenCalledWith(
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    );
  });

  it('renders Leaflet map nodes with tiles, popups, bounds, and stored map handle', () => {
    const container = document.createElement('div');
    container.className = 'geojson-container is-loading';
    const node = document.createElement('div') as HTMLElement & { _leafletMap?: unknown };
    node.setAttribute('data-original-code', encodeURIComponent(JSON.stringify({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { name: 'Place' } }]
    })));
    container.appendChild(node);
    const map = {
      eachLayer: vi.fn(),
      fitBounds: vi.fn(),
      setView: vi.fn()
    };
    const bounds = { isValid: vi.fn(() => true) };
    const layer = { bindPopup: vi.fn() };
    const geoJsonLayer = {
      addTo: vi.fn(),
      getBounds: () => bounds
    };
    geoJsonLayer.addTo.mockReturnValue(geoJsonLayer);
    const leaflet = {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      geoJSON: vi.fn((_data, options) => {
        options.onEachFeature({ type: 'Feature', properties: { name: 'Place' } }, layer);
        return geoJsonLayer;
      })
    };

    renderLeafletMapNode(node, {
      isTopo: false,
      getTheme: () => 'dark',
      leaflet
    });

    expect(node._leafletMap).toBe(map);
    expect(leaflet.tileLayer).toHaveBeenCalledWith('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    });
    expect(layer.bindPopup).toHaveBeenCalledWith(
      '<div class="map-popup-container"><table class="map-popup-table"><tr><td class="prop-key">name</td><td class="prop-val">Place</td></tr></table></div>'
    );
    expect(map.fitBounds).toHaveBeenCalledWith(bounds);
    expect(map.setView).not.toHaveBeenCalled();
    expect(container.classList.contains('is-loading')).toBe(false);
  });

  it('falls back to world view when rendered map bounds are invalid', () => {
    const node = document.createElement('div');
    node.setAttribute('data-original-code', encodeURIComponent('{"type":"FeatureCollection","features":[]}'));
    const map = {
      eachLayer: vi.fn(),
      fitBounds: vi.fn(),
      setView: vi.fn()
    };
    const geoJsonLayer = {
      addTo: vi.fn(),
      getBounds: () => ({ isValid: () => false })
    };
    geoJsonLayer.addTo.mockReturnValue(geoJsonLayer);
    const leaflet = {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      geoJSON: vi.fn(() => geoJsonLayer)
    };

    renderLeafletMapNode(node, {
      isTopo: false,
      getTheme: () => 'light',
      leaflet
    });

    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.setView).toHaveBeenCalledWith([0, 0], 2);
  });

  it('renders Leaflet map errors and clears loading state', () => {
    const container = document.createElement('div');
    container.className = 'topojson-container is-loading';
    const node = document.createElement('div');
    node.setAttribute('data-original-code', encodeURIComponent('{"objects":{}}'));
    container.appendChild(node);
    const error = vi.fn();

    renderLeafletMapNode(node, {
      isTopo: true,
      getTheme: () => 'light',
      leaflet: {
        map: vi.fn(),
        tileLayer: vi.fn(),
        geoJSON: vi.fn()
      },
      error
    });

    expect(error).toHaveBeenCalledWith('Map rendering failed:', expect.any(Error));
    expect(node.innerHTML).toContain('Error rendering map');
    expect(container.classList.contains('is-loading')).toBe(false);
  });
});
