import type { QuartzTransformerPlugin } from "@quartz-community/types";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

interface LeafletConfig {
  id: string;
  height: string;
  width: string;
  lat: number;
  long: number;
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  zoomDelta: number;
  unit: string;
  scale: number;
  darkMode: boolean;
  showCenterMarker: boolean;
  tileServer?: string;
  markers: LeafletMarker[];
}

interface LeafletMarker {
  lat: number;
  long: number;
  popup?: string;
  iconUrl?: string;
  title?: string;
  description?: string;
}

function parseScalar(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function applyMarkerField(marker: LeafletMarker, rawKey: string, rawValue: string): void {
  const key = rawKey.trim();
  const value = parseScalar(rawValue.trim());

  if (key === "lat") marker.lat = parseFloat(value);
  else if (key === "long" || key === "lng" || key === "lon" || key === "longitude") marker.long = parseFloat(value);
  else if (key === "popup") marker.popup = value;
  else if (key === "iconUrl") marker.iconUrl = value;
  else if (key === "title") marker.title = value;
  else if (key === "description") marker.description = value;
}

function parseLegacyMarkerLine(rawValue: string, fallbackLat: number, fallbackLong: number): LeafletMarker {
  const parts = rawValue.split(",").map((part) => parseScalar(part.trim()));
  const latCandidate = Number(parts[1]);
  const longCandidate = Number(parts[2]);
  const note = parts.slice(3).join(",").replace("[[", "").replace("]]", "").trim();

  const marker: LeafletMarker = {
    lat: Number.isFinite(latCandidate) ? latCandidate : fallbackLat,
    long: Number.isFinite(longCandidate) ? longCandidate : fallbackLong,
  };

  if (parts[0]) marker.title = parts[0];
  if (note) marker.popup = note;
  else if (parts[0]) marker.popup = parts[0];

  return marker;
}

function parseLeafletBlock(code: string): LeafletConfig {
  const config: LeafletConfig = {
    id: "leaflet-map",
    height: "500px",
    width: "100%",
    lat: 50,
    long: 50,
    minZoom: 1,
    maxZoom: 10,
    defaultZoom: 5,
    zoomDelta: 1,
    unit: "meters",
    scale: 1,
    darkMode: false,
    showCenterMarker: false,
    markers: [],
  };

  const lines = code.split("\n");
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];
    if (currentLine === undefined) break;
    const trimmed = currentLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      i += 1;
      continue;
    }

    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();

    if (key === "markers") {
      i += 1;
      while (i < lines.length) {
        const markerLine = lines[i];
        if (markerLine === undefined) break;
        const markerTrimmed = markerLine.trim();

        if (!markerTrimmed || markerTrimmed.startsWith("#")) {
          i += 1;
          continue;
        }

        if (!markerLine.startsWith(" ") && !markerTrimmed.startsWith("-")) break;
        if (!markerTrimmed.startsWith("-")) {
          i += 1;
          continue;
        }

        const marker: LeafletMarker = { lat: config.lat, long: config.long };
        const firstLineContent = markerTrimmed.substring(1).trim();

        if (firstLineContent.includes(":")) {
          const firstColon = firstLineContent.indexOf(":");
          const markerKey = firstLineContent.substring(0, firstColon).trim();
          const markerValue = firstLineContent.substring(firstColon + 1).trim();
          applyMarkerField(marker, markerKey, markerValue);
        }

        i += 1;
        while (i < lines.length) {
          const detailLine = lines[i];
          if (detailLine === undefined) break;
          const detailTrimmed = detailLine.trim();

          if (!detailTrimmed || detailTrimmed.startsWith("#")) {
            i += 1;
            continue;
          }
          if (!detailLine.startsWith(" ")) break;
          if (detailTrimmed.startsWith("-")) break;

          const detailColon = detailTrimmed.indexOf(":");
          if (detailColon === -1) {
            i += 1;
            continue;
          }

          const detailKey = detailTrimmed.substring(0, detailColon).trim();
          const detailValue = detailTrimmed.substring(detailColon + 1).trim();
          applyMarkerField(marker, detailKey, detailValue);

          i += 1;
        }

        if (!marker.popup && (marker.title || marker.description)) {
          marker.popup = `${marker.title ?? ""}${marker.description ? ` - ${marker.description}` : ""}`.trim();
        }
        config.markers.push(marker);
      }
      continue;
    }

    if (key === "marker") {
      if (value.includes(",")) {
        config.markers.push(parseLegacyMarkerLine(value, config.lat, config.long));
        i += 1;
        continue;
      }

      const marker: LeafletMarker = { lat: config.lat, long: config.long };
      i += 1;

      while (i < lines.length) {
        const detailLine = lines[i];
        if (detailLine === undefined) break;
        const detailTrimmed = detailLine.trim();

        if (!detailTrimmed || detailTrimmed.startsWith("#")) {
          i += 1;
          continue;
        }
        if (!detailLine.startsWith(" ")) break;

        const detailColon = detailTrimmed.indexOf(":");
        if (detailColon !== -1) {
          const detailKey = detailTrimmed.substring(0, detailColon).trim();
          const detailValue = detailTrimmed.substring(detailColon + 1).trim();
          applyMarkerField(marker, detailKey, detailValue);
        }
        i += 1;
      }

      if (!marker.popup && (marker.title || marker.description)) {
        marker.popup = `${marker.title ?? ""}${marker.description ? ` - ${marker.description}` : ""}`.trim();
      }
      config.markers.push(marker);
      continue;
    }

    if (key === "id") config.id = parseScalar(value);
    else if (key === "height") config.height = parseScalar(value);
    else if (key === "width") config.width = parseScalar(value);
    else if (key === "lat") config.lat = parseFloat(value);
    else if (key === "long") config.long = parseFloat(value);
    else if (key === "minZoom") config.minZoom = parseFloat(value);
    else if (key === "maxZoom") config.maxZoom = parseFloat(value);
    else if (key === "defaultZoom") config.defaultZoom = parseFloat(value);
    else if (key === "zoomDelta") config.zoomDelta = parseFloat(value);
    else if (key === "unit") config.unit = value;
    else if (key === "scale") config.scale = parseFloat(value);
    else if (key === "darkMode") config.darkMode = value.toLowerCase() === "true";
    else if (key === "showCenterMarker") config.showCenterMarker = value.toLowerCase() !== "false";
    else if (key === "tileServer") config.tileServer = parseScalar(value);

    i += 1;
  }

  return config;
}

function generateLeafletHTML(config: LeafletConfig): string {
  const tileUrl = config.tileServer || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const markersJson = JSON.stringify(config.markers);
  
  return `<div id="${config.id}" style="height: ${config.height}; width: ${config.width}; border-radius: 8px; overflow: hidden; margin: 1rem 0;"></div>
<script>
  (function() {
    const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";

    const initMap = () => {
      const map = L.map("${config.id}").setView([${config.lat}, ${config.long}], ${config.defaultZoom});
      const mapId = "${config.id}";
      const configuredMarkers = ${markersJson};
      const normalizeFallbackMarkers = (input) => {
        if (!Array.isArray(input)) return [];
        return input
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const lat = Number(item.lat);
            const long = Number(item.long ?? item.lng ?? item.lon ?? item.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(long)) return null;
            return {
              lat,
              long,
              popup: item.popup,
              iconUrl: item.iconUrl,
              title: item.title,
              description: item.description
            };
          })
          .filter(Boolean);
      };
      const resolveFallbackMarkersByMapId = () => {
        try {
          if (window.ObsidianLeaflet && typeof window.ObsidianLeaflet.getMarkers === "function") {
            const obsidianMarkers = window.ObsidianLeaflet.getMarkers(mapId);
            const normalized = normalizeFallbackMarkers(obsidianMarkers);
            if (normalized.length > 0) return normalized;
          }

          const globalById =
            window.__leafletMarkersById?.[mapId] ??
            window.leafletMarkersById?.[mapId] ??
            window.LEAFLET_MARKERS_BY_ID?.[mapId];
          const normalizedGlobal = normalizeFallbackMarkers(globalById);
          if (normalizedGlobal.length > 0) return normalizedGlobal;

          const markerScript = document.querySelector('script[type="application/json"][data-leaflet-markers-for="' + mapId + '"]');
          if (markerScript && markerScript.textContent) {
            const parsed = JSON.parse(markerScript.textContent);
            const normalizedScript = normalizeFallbackMarkers(parsed);
            if (normalizedScript.length > 0) return normalizedScript;
          }

          const cached = localStorage.getItem("leaflet:markers:" + mapId);
          if (cached) {
            const parsedCached = JSON.parse(cached);
            const normalizedCached = normalizeFallbackMarkers(parsedCached);
            if (normalizedCached.length > 0) return normalizedCached;
          }
        } catch (_error) {
          return [];
        }
        return [];
      };
      const resolveFallbackMarkersByMapIdAsync = async () => {
        try {
          if (window.ObsidianLeaflet && typeof window.ObsidianLeaflet.getMarkersAsync === "function") {
            const obsidianMarkers = await window.ObsidianLeaflet.getMarkersAsync(mapId);
            const normalized = normalizeFallbackMarkers(obsidianMarkers);
            if (normalized.length > 0) return normalized;
          }

          const endpoint =
            document.getElementById(mapId)?.dataset?.markersEndpoint ??
            window.__leafletMarkerEndpoint ??
            "/leaflet-markers.json";
          if (!endpoint) return [];

          const res = await fetch(endpoint);
          if (!res.ok) return [];
          const payload = await res.json();
          const raw =
            payload?.[mapId] ??
            payload?.maps?.[mapId] ??
            (Array.isArray(payload) ? payload.filter((item) => item?.mapId === mapId) : []);
          return normalizeFallbackMarkers(raw);
        } catch (_error) {
          return [];
        }
      };
      let markers =
        Array.isArray(configuredMarkers) && configuredMarkers.length > 0
          ? configuredMarkers
          : resolveFallbackMarkersByMapId();
      const defaultIcon = L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      L.tileLayer("${tileUrl}", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: ${config.maxZoom},
        minZoom: ${config.minZoom}
      }).addTo(map);

      const markerLayer = L.layerGroup().addTo(map);
      const renderMarkers = (inputMarkers) => {
        markerLayer.clearLayers();
        inputMarkers.forEach((marker) => {
          const markerLat = Number(marker.lat);
          const markerLong = Number(marker.long ?? marker.lng ?? marker.lon ?? marker.longitude);
          if (!Number.isFinite(markerLat) || !Number.isFinite(markerLong)) return;

          let leafletMarker;
          if (marker.iconUrl) {
            const customIcon = L.icon({
              iconUrl: marker.iconUrl,
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
            leafletMarker = L.marker([markerLat, markerLong], { icon: customIcon });
          } else {
            leafletMarker = L.marker([markerLat, markerLong], { icon: defaultIcon });
          }

          leafletMarker.addTo(markerLayer);
          if (marker.popup) leafletMarker.bindPopup(marker.popup);
        });
      };
      renderMarkers(markers);

      if (!Array.isArray(markers) || markers.length === 0) {
        let attempts = 0;
        const maxAttempts = 8;
        const retryDelayMs = 500;
        const retryResolve = () => {
          const resolved = resolveFallbackMarkersByMapId();
          if (resolved.length > 0) {
            markers = resolved;
            renderMarkers(markers);
            return;
          }
          attempts += 1;
          if (attempts < maxAttempts) setTimeout(retryResolve, retryDelayMs);
        };

        setTimeout(retryResolve, 150);
        resolveFallbackMarkersByMapIdAsync().then((resolvedAsync) => {
          if (resolvedAsync.length > 0) {
            markers = resolvedAsync;
            renderMarkers(markers);
          }
        });
      }

      ${config.darkMode ? `document.getElementById("${config.id}").style.filter = "brightness(0.6) invert(1) contrast(1.2)";` : ""}
    };

    if (!document.querySelector('link[data-leaflet-cdn="1"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.setAttribute("data-leaflet-cdn", "1");
      document.head.appendChild(link);
    }

    if (window.L) {
      initMap();
      return;
    }

    if (!window.__leafletLoadPromise) {
      window.__leafletLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = LEAFLET_JS;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    window.__leafletLoadPromise.then(initMap).catch(() => {});
  })();
</script>`;
}

export const LeafletTransformer: QuartzTransformerPlugin = () => {
  return {
    name: "LeafletTransformer",
    markdownPlugins() {
      return [
        () => (tree: Root) => {
          visit(tree, "code", (node, index, parent) => {
            if (node.lang !== "leaflet") return;

            const config = parseLeafletBlock(node.value);
            const html = generateLeafletHTML(config);

            if (parent && typeof index === "number") {
              parent.children[index] = {
                type: "html",
                value: html,
              };
            }
          });
        },
      ];
    },
  };
};