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
  markerTypeIcons: Record<string, string>;
  markers: LeafletMarker[];
}

interface LeafletMarker {
  id?: string;
  type?: string;
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

function normalizeObsidianLink(value: string): string {
  const cleaned = parseScalar(value).trim();
  if (
    (cleaned.startsWith("![[") && cleaned.endsWith("]]")) ||
    (cleaned.startsWith("[[") && cleaned.endsWith("]]"))
  ) {
    const inner = cleaned.replace(/^!?\[\[/, "").replace(/\]\]$/, "");
    return inner.split("|")[0]?.trim() ?? "";
  }
  return cleaned;
}

function applyMarkerField(marker: LeafletMarker, rawKey: string, rawValue: string): void {
  const key = rawKey.trim();
  const value = parseScalar(rawValue.trim());

  if (key === "id" || key === "markerId" || key === "uid") marker.id = value;
  else if (key === "type" || key === "markerType") marker.type = value;
  else if (key === "lat") marker.lat = parseFloat(value);
  else if (key === "long" || key === "lng" || key === "lon" || key === "longitude") marker.long = parseFloat(value);
  else if (key === "popup") marker.popup = value;
  else if (key === "iconUrl" || key === "icon" || key === "markerIcon") marker.iconUrl = normalizeObsidianLink(value);
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

  if (parts[0]) {
    marker.id = parts[0];
    marker.title = parts[0];
  }
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
    markerTypeIcons: {},
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
    else if (key.startsWith("markerType.")) {
      const typeName = key.substring("markerType.".length).trim();
      if (typeName) config.markerTypeIcons[typeName] = normalizeObsidianLink(value);
    }
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
      const markerTypeIcons = ${JSON.stringify(config.markerTypeIcons)};
      const normalizeFallbackMarkers = (input) => {
        if (!Array.isArray(input)) return [];
        return input
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const lat = Number(item.lat);
            const long = Number(item.long ?? item.lng ?? item.lon ?? item.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(long)) return null;
            const markerId =
              item.id ??
              item.markerId ??
              item.uid ??
              item.noteId ??
              item.slug ??
              mapId + "-marker-" + (index + 1);
            return {
              id: String(markerId),
              type: item.type ?? item.markerType ?? item.category,
              lat,
              long,
              popup: item.popup,
              iconUrl: item.iconUrl,
              title: item.title ?? item.name,
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
            window.__leafletMarkerEndpoint;
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
      markers = markers.map((marker, index) => ({
        ...marker,
        id: marker.id ?? marker.markerId ?? marker.uid ?? (mapId + "-marker-" + (index + 1)),
        type: marker.type ?? marker.markerType,
      }));
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
      const resolveIconSpec = (rawValue) => {
        if (!rawValue || typeof rawValue !== "string") return null;
        const trimmed = rawValue.trim();
        if (!trimmed) return null;

        const looksLikeWikilink =
          (trimmed.startsWith("![[") && trimmed.endsWith("]]")) ||
          (trimmed.startsWith("[[") && trimmed.endsWith("]]"));
        const wikilinkContent = looksLikeWikilink
          ? trimmed.replace(/^!?\[\[/, "").replace(/\]\]$/, "").split("|")[0].trim()
          : trimmed;

        if (/^(https?:)?\/\//i.test(wikilinkContent) || wikilinkContent.startsWith("data:")) {
          return { kind: "image", src: wikilinkContent };
        }

        const hasImageExt = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(wikilinkContent);
        if (hasImageExt) {
          const normalizedPath = wikilinkContent.replace(/^\.?\//, "").replace(/^\/+/, "");
          return { kind: "image", src: "/" + normalizedPath };
        }

        return { kind: "emoji", text: wikilinkContent };
      };
      const renderMarkers = (inputMarkers) => {
        markerLayer.clearLayers();
        inputMarkers.forEach((marker) => {
          const markerLat = Number(marker.lat);
          const markerLong = Number(marker.long ?? marker.lng ?? marker.lon ?? marker.longitude);
          if (!Number.isFinite(markerLat) || !Number.isFinite(markerLong)) return;

          let leafletMarker;
          // FIX: Check if iconUrl is actually defined and non-empty before using it
          const resolvedIconValue = marker.iconUrl && marker.iconUrl.trim() 
            ? marker.iconUrl 
            : markerTypeIcons[marker.type];
          const iconSpec = resolveIconSpec(resolvedIconValue);
          if (iconSpec?.kind === "image") {
            const customIcon = L.icon({
              iconUrl: iconSpec.src,
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
              iconSize: [28, 28],
              iconAnchor: [14, 28],
              popupAnchor: [0, -28],
              shadowSize: [41, 41]
            });
            leafletMarker = L.marker([markerLat, markerLong], { icon: customIcon });
          } else if (iconSpec?.kind === "emoji") {
            const emojiIcon = L.divIcon({
              className: "leaflet-marker-emoji",
              html: '<div style="font-size:22px;line-height:22px;">' + iconSpec.text + "</div>",
              iconSize: [22, 22],
              iconAnchor: [11, 22],
              popupAnchor: [0, -20]
            });
            leafletMarker = L.marker([markerLat, markerLong], { icon: emojiIcon });
          } else {
            leafletMarker = L.marker([markerLat, markerLong], { icon: defaultIcon });
          }

          leafletMarker.options.markerId = marker.id;
          if (marker.title) {
            leafletMarker.bindTooltip(marker.title, {
              permanent: true,
              direction: "top",
              offset: [0, -34],
              className: "leaflet-marker-callout",
            });
          }
          leafletMarker.addTo(markerLayer);
          if (marker.popup) {
            leafletMarker.bindPopup(marker.popup);
            leafletMarker.on("mouseover", () => leafletMarker.openPopup());
            leafletMarker.on("mouseout", () => leafletMarker.closePopup());
          }
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
      if (!document.getElementById("leaflet-marker-callout-style")) {
        const styleTag = document.createElement("style");
        styleTag.id = "leaflet-marker-callout-style";
        styleTag.textContent = ".leaflet-marker-callout{background:#111;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:4px 8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35)}.leaflet-marker-emoji{background:transparent;border:none}";
        document.head.appendChild(styleTag);
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
          const usedMapIds = new Set<string>();
          visit(tree, "code", (node, index, parent) => {
            if (node.lang !== "leaflet") return;

            const config = parseLeafletBlock(node.value);
            const baseId = (config.id || "leaflet-map").trim() || "leaflet-map";
            let resolvedId = baseId;
            let counter = 1;
            while (usedMapIds.has(resolvedId)) {
              resolvedId = `${baseId}-${counter}`;
              counter += 1;
            }
            
            usedMapIds.add(resolvedId);
            config.id = resolvedId;
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