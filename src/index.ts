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
      const markers = ${markersJson};
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

      markers.forEach((marker) => {
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

        leafletMarker.addTo(map);
        if (marker.popup) leafletMarker.bindPopup(marker.popup);
      });

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